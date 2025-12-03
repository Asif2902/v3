
// DexScreener API Integration for Monad Chain
// Handles token search and profile fetching

const DEXSCREENER_API = 'https://api.dexscreener.com';
const MONAD_CHAIN_ID = 'monad'; // DexScreener uses 'monad' as chain identifier
const MONAD_CHAIN_ID_ALT = '143'; // Alternative chain ID

// Cache for token profiles to avoid repeated API calls
const tokenProfileCache = new Map();
const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Search for a token on DexScreener by address or symbol
 * @param {string} searchTerm - Token address or symbol
 * @returns {Promise<Object|null>} Token info from DexScreener or null
 */
async function searchTokenOnDexScreener(searchTerm) {
  try {
    const cleanTerm = searchTerm.trim();
    
    // If it's an address, search by token address
    if (cleanTerm.startsWith('0x') && cleanTerm.length === 42) {
      return await searchTokenByAddress(cleanTerm);
    }
    
    // Otherwise, search by symbol/name
    return await searchTokenByQuery(cleanTerm);
  } catch (error) {
    console.error('DexScreener search error:', error);
    return null;
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
 * Search token by symbol or name
 * @param {string} query - Search query
 * @returns {Promise<Object|null>}
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

    // Find best match
    const bestPair = monadPairs.find(pair => 
      pair.baseToken.symbol.toLowerCase() === query.toLowerCase() ||
      pair.quoteToken.symbol.toLowerCase() === query.toLowerCase()
    ) || monadPairs[0];

    const isBaseTokenMatch = bestPair.baseToken.symbol.toLowerCase().includes(query.toLowerCase());
    const tokenInfo = isBaseTokenMatch ? bestPair.baseToken : bestPair.quoteToken;

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
    console.error('Error searching token by query:', error);
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
    getTokenLogo
  };
}
