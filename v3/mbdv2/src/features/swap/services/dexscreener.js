
// DexScreener API Integration for Monad Chain
// Handles token search and profile fetching

const DEXSCREENER_API = 'https://api.dexscreener.com';
const MONAD_CHAIN_ID = 'monad'; // DexScreener uses 'monad' as chain identifier
const MONAD_CHAIN_ID_ALT = '143'; // Alternative chain ID

// Cache for token profiles to avoid repeated API calls
const tokenProfileCache = new Map();
const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Search for tokens on DexScreener by address or symbol
 * @param {string} searchTerm - Token address or symbol
 * @returns {Promise<Array>} Array of matching tokens (empty if none found)
 */
async function searchTokenOnDexScreener(searchTerm) {
  try {
    const cleanTerm = searchTerm.trim();
    
    // If it's an address, search by token address (returns single token wrapped in array)
    if (cleanTerm.startsWith('0x') && cleanTerm.length === 42) {
      const result = await searchTokenByAddress(cleanTerm);
      return result ? [result] : [];
    }
    
    // Otherwise, search by symbol/name (returns array of tokens)
    return await searchTokenByQuery(cleanTerm);
  } catch (error) {
    console.error('DexScreener search error:', error);
    return [];
  }
}

/**
 * Search token by address on Monad chain
 * @param {string} address - Token contract address
 * @returns {Promise<Object|null>}
 */
async function searchTokenByAddress(address) {
  try {
    // Try to get token pairs for this address on Monad
    const response = await fetch(
      `${DEXSCREENER_API}/latest/dex/tokens/${address}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      console.warn(`DexScreener API returned ${response.status} for address ${address}`);
      return null;
    }

    const data = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }

    // Filter for Monad chain pairs
    const monadPairs = data.pairs.filter(pair => 
      pair.chainId === MONAD_CHAIN_ID || pair.chainId === MONAD_CHAIN_ID_ALT
    );

    if (monadPairs.length === 0) {
      return null;
    }

    // Get the pair with highest liquidity
    const bestPair = monadPairs.sort((a, b) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    // Determine which token in the pair matches our search
    const isBaseToken = bestPair.baseToken.address.toLowerCase() === address.toLowerCase();
    const tokenInfo = isBaseToken ? bestPair.baseToken : bestPair.quoteToken;

    return {
      address: tokenInfo.address,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      logo: bestPair.info?.imageUrl || null,
      priceUsd: bestPair.priceUsd,
      liquidity: bestPair.liquidity?.usd,
      pairAddress: bestPair.pairAddress
    };
  } catch (error) {
    console.error('Error searching token by address:', error);
    return null;
  }
}

/**
 * Fuzzy match - checks if query characters appear in order within text
 * Example: "mon" matches "gmonad" because g-M-O-N-ad contains m-o-n in order
 * @param {string} text - Text to search in
 * @param {string} query - Search query
 * @returns {boolean} True if fuzzy match found
 */
function fuzzyMatch(text, query) {
  if (!text || !query) return false;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // First check exact substring match (higher priority)
  if (textLower.includes(queryLower)) return true;
  
  // Then check fuzzy match - all query chars must appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

/**
 * Search token by symbol or name - returns MULTIPLE matching tokens
 * Supports fuzzy matching (e.g., "mon" finds "gmonad")
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching tokens
 */
async function searchTokenByQuery(query) {
  try {
    const response = await fetch(
      `${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(query)}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      return [];
    }

    // Filter for Monad chain pairs
    const monadPairs = data.pairs.filter(pair => 
      pair.chainId === MONAD_CHAIN_ID || pair.chainId === MONAD_CHAIN_ID_ALT
    );

    if (monadPairs.length === 0) {
      return [];
    }

    // Extract unique tokens that match the query (using fuzzy matching)
    const tokenMap = new Map();

    for (const pair of monadPairs) {
      // Check base token with fuzzy matching
      if (fuzzyMatch(pair.baseToken.symbol, query) ||
          fuzzyMatch(pair.baseToken.name, query)) {
        const address = pair.baseToken.address.toLowerCase();
        if (!tokenMap.has(address)) {
          tokenMap.set(address, {
            address: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            logo: pair.info?.imageUrl || null,
            priceUsd: pair.priceUsd,
            liquidity: pair.liquidity?.usd || 0,
            pairAddress: pair.pairAddress
          });
        } else {
          // Update if this pair has higher liquidity or has a logo
          const existing = tokenMap.get(address);
          if ((pair.liquidity?.usd || 0) > existing.liquidity) {
            existing.liquidity = pair.liquidity?.usd || 0;
          }
          if (!existing.logo && pair.info?.imageUrl) {
            existing.logo = pair.info.imageUrl;
          }
        }
      }

      // Check quote token with fuzzy matching
      if (fuzzyMatch(pair.quoteToken.symbol, query) ||
          fuzzyMatch(pair.quoteToken.name, query)) {
        const address = pair.quoteToken.address.toLowerCase();
        if (!tokenMap.has(address)) {
          tokenMap.set(address, {
            address: pair.quoteToken.address,
            symbol: pair.quoteToken.symbol,
            name: pair.quoteToken.name,
            logo: null, // Will be fetched separately if needed
            priceUsd: null,
            liquidity: pair.liquidity?.usd || 0,
            pairAddress: pair.pairAddress
          });
        } else {
          // Update if this pair has higher liquidity
          const existing = tokenMap.get(address);
          if ((pair.liquidity?.usd || 0) > existing.liquidity) {
            existing.liquidity = pair.liquidity?.usd || 0;
          }
        }
      }
    }

    // Convert map to array and sort by liquidity (highest first)
    let tokens = Array.from(tokenMap.values())
      .sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0))
      .slice(0, 10); // Limit to top 10 results

    // Try to fetch logos for tokens that don't have one (in parallel, non-blocking)
    tokens = await Promise.all(tokens.map(async (token) => {
      if (!token.logo) {
        try {
          const logo = await fetchTokenLogoFromProfile(token.address);
          if (logo) {
            token.logo = logo;
          }
        } catch (e) {
          // Silently fail - logo is optional
        }
      }
      return token;
    }));

    return tokens;
  } catch (error) {
    console.error('Error searching token by query:', error);
    return [];
  }
}

/**
 * Fetch token logo from DexScreener profile API
 * @param {string} tokenAddress - Token contract address
 * @returns {Promise<string|null>} Logo URL or null
 */
async function fetchTokenLogoFromProfile(tokenAddress) {
  const cacheKey = `logo_${tokenAddress.toLowerCase()}`;
  
  // Check cache
  const cached = tokenProfileCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Try to get token info by searching for its pairs
    const response = await fetch(
      `${DEXSCREENER_API}/latest/dex/tokens/${tokenAddress}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // Find a pair with logo info
    for (const pair of data.pairs) {
      if (pair.info?.imageUrl) {
        tokenProfileCache.set(cacheKey, {
          data: pair.info.imageUrl,
          timestamp: Date.now()
        });
        return pair.info.imageUrl;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get token profile with logo from DexScreener
 * @param {string} tokenAddress - Token contract address
 * @returns {Promise<Object|null>} Token profile or null
 */
async function getTokenProfile(tokenAddress) {
  const cacheKey = tokenAddress.toLowerCase();
  
  // Check cache first
  const cached = tokenProfileCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Search for token to get profile info
    const tokenInfo = await searchTokenByAddress(tokenAddress);
    
    if (tokenInfo && tokenInfo.logo) {
      tokenProfileCache.set(cacheKey, {
        data: tokenInfo,
        timestamp: Date.now()
      });
      return tokenInfo;
    }

    return null;
  } catch (error) {
    console.error('Error fetching token profile:', error);
    return null;
  }
}

/**
 * Get token logo URL from DexScreener
 * @param {string} tokenAddress - Token contract address
 * @returns {Promise<string|null>} Logo URL or null
 */
async function getTokenLogo(tokenAddress) {
  const profile = await getTokenProfile(tokenAddress);
  return profile?.logo || null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    searchTokenOnDexScreener,
    searchTokenByAddress,
    searchTokenByQuery,
    getTokenProfile,
    getTokenLogo,
    fetchTokenLogoFromProfile,
    fuzzyMatch
  };
}
