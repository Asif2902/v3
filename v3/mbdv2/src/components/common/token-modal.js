const link = document.createElement('link');
    link.id = 'token-modal-styles';
    link.rel = 'stylesheet';
    link.href = 'src/styles/styles.css';
    document.head.appendChild(link);

// Token Modal Component
class TokenModal {
  constructor(options = {}) {
    this.onSelectToken = options.onSelectToken || function() {};
    this.side = options.side || '';
    this.tokens = options.tokens || [];
    this.defaultTokens = options.defaultTokens || [];
    this.modalId = `tokenModal-${this.side}`;
    this.currentSearch = '';
    this.isOpen = false;
    this.balances = options.balances || {};
    this.provider = options.provider;
    this.userAddress = options.userAddress;
    this.searchDebounceTimer = null;

    this.initialize();
  }

  initialize() {
    if (document.getElementById(this.modalId)) {
      return;
    }

    // Create modal HTML structure
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.className = 'token-modal-overlay';

    modal.innerHTML = `
      <div class="token-modal">
        <div class="token-modal-header">
          <h3>Select a token</h3>
          <button class="token-modal-close">&times;</button>
        </div>
        <div class="token-modal-search">
          <div class="token-modal-search-wrapper">
            <span class="token-modal-search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input type="text" placeholder="Search token name or paste address" />
          </div>
        </div>
        <div class="token-modal-body">
          <div class="token-list-section common-tokens">
            <div class="token-list-header">Common tokens</div>
            <div class="token-modal-list" id="commonTokensList-${this.side}"></div>
          </div>
          <div class="token-list-section all-tokens">
            <div class="token-list-header">All tokens</div>
            <div class="token-modal-list" id="allTokensList-${this.side}"></div>
          </div>
          <div class="token-modal-no-results" style="display: none;">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>No results found.</p>
            <button class="token-modal-import">Import token</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    this.modal = document.getElementById(this.modalId);

    const closeBtn = this.modal.querySelector('.token-modal-close');
    closeBtn.addEventListener('click', () => this.close());

    const searchInput = this.modal.querySelector('input');
    searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    const importBtn = this.modal.querySelector('.token-modal-import');
    importBtn.addEventListener('click', () => this.handleImportToken());

    // Close when clicking outside the modal content
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  open() {
    this.isOpen = true;
    this.modal.classList.add('show');

    // Fetch balances for all tokens if wallet is connected
    if (this.provider && this.userAddress) {
      this.fetchAllTokenBalances().then(() => {
        this.renderTokens();
      });
    } else {
      this.renderTokens();
    }

    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    document.body.style.position = 'fixed'; // Prevent iOS bounce
    document.body.style.width = '100%'; // Maintain width

    // Ensure modal is visible and positioned correctly
    const modalContainer = this.modal.querySelector('.token-modal');
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '50%';
    modalContainer.style.left = '50%';
    modalContainer.style.transform = 'translate(-50%, -50%)';
    modalContainer.style.maxHeight = '80vh';
    modalContainer.style.overflow = 'hidden';
    modalContainer.style.zIndex = '3000';

    // Handle viewport resize (keyboard opening)
    this.handleViewportResize = () => {
      const vh = window.innerHeight * 0.01;
      modalContainer.style.maxHeight = `${Math.min(80, vh * 80)}vh`;
    };

    window.addEventListener('resize', this.handleViewportResize);
    this.handleViewportResize();

    // Focus search input with delay for mobile
    setTimeout(() => {
      const input = this.modal.querySelector('input');
      if (input && window.innerWidth > 768) {
        input.focus();
      }
    }, 100);
  }

  // Method to fetch balances for all tokens
  async fetchAllTokenBalances() {
    if (!this.provider || !this.userAddress) return;

    const fetchPromises = this.tokens.map(async (token) => {
      try {
        let balance;
        if (token.symbol === "MON") {
          balance = await this.provider.getBalance(this.userAddress);
          balance = ethers.utils.formatEther(balance);
        } else {
          const tokenContract = new ethers.Contract(
            token.address,
            ["function balanceOf(address) view returns (uint)"],
            this.provider
          );
          balance = await tokenContract.balanceOf(this.userAddress);
          balance = ethers.utils.formatUnits(balance, token.decimals);
        }
        this.balances[token.symbol] = balance;
      } catch (err) {
        console.error(`Error fetching balance for ${token.symbol}:`, err);
      }
    });

    await Promise.allSettled(fetchPromises);
  }

  close() {
    this.isOpen = false;
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    // Clear any pending search
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    // Remove viewport resize handler
    if (this.handleViewportResize) {
      window.removeEventListener('resize', this.handleViewportResize);
    }
  }

  async renderTokens() {
    const commonTokensList = document.getElementById(`commonTokensList-${this.side}`);
    const allTokensList = document.getElementById(`allTokensList-${this.side}`);

    if (!commonTokensList || !allTokensList) return;

    commonTokensList.innerHTML = '';
    allTokensList.innerHTML = '';

    // Show loading state
    commonTokensList.innerHTML = '<div class="token-modal-loading"><div class="token-modal-spinner"></div></div>';

    // Common tokens (top 5 by market cap or popularity)
    const commonTokens = this.defaultTokens.slice(0, 5);

    // Remove loading state
    commonTokensList.innerHTML = '';

    // Add tokens to lists
    for (const token of commonTokens) {
      const tokenElement = this.createTokenElement(token);
      commonTokensList.appendChild(tokenElement);
    }

    for (const token of this.tokens) {
      // Skip tokens already shown in common tokens
      if (commonTokens.find(t => t.address === token.address)) continue;

      const tokenElement = this.createTokenElement(token);
      allTokensList.appendChild(tokenElement);
    }
  }

  createTokenElement(token) {
    const item = document.createElement('div');
    item.className = 'token-modal-item';

    // Format balance if available
    let balanceText = '-';
    if (this.balances[token.symbol]) {
      balanceText = parseFloat(this.balances[token.symbol]).toFixed(4);
    }

    // Format address for display
    const formattedAddress = token.address === "MON" ? "Native Token" : 
      `${token.address.substring(0, 6)}...${token.address.substring(token.address.length - 4)}`;

    item.innerHTML = `
      <img src="${token.logo && token.logo !== '?' ? token.logo : 'https://monbridgedex.xyz/unknown.png'}" 
           class="token-modal-item-img" alt="${token.symbol}">
      <div class="token-modal-item-info">
        <div class="token-modal-item-symbol">${token.symbol}</div>
        <div class="token-modal-item-name">${formattedAddress}</div>
      </div>
      <div class="token-modal-item-balance">${balanceText}</div>
    `;

    item.addEventListener('click', () => {
      this.selectToken(token);
    });

    return item;
  }

  // Fuzzy match helper - checks if query chars appear in order in text
  fuzzyMatch(text, query) {
    if (!text || !query) return false;
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // First check exact substring match
    if (textLower.includes(queryLower)) return true;
    
    // Then fuzzy match - all query chars must appear in order
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === queryLower.length;
  }

  async handleSearch(searchTerm) {
    this.currentSearch = searchTerm.trim().toLowerCase();
    const commonTokensSection = this.modal.querySelector('.common-tokens');
    const allTokensSection = this.modal.querySelector('.all-tokens');
    const noResultsSection = this.modal.querySelector('.token-modal-no-results');
    const allTokensList = document.getElementById(`allTokensList-${this.side}`);

    // Clear any existing debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Search through all tokens using fuzzy matching
    // Example: "mon" will match "gmonad" because g-M-O-N-ad contains m-o-n in order
    let filteredTokens = this.tokens.filter(token => 
      this.fuzzyMatch(token.symbol, this.currentSearch) || 
      this.fuzzyMatch(token.name, this.currentSearch) ||
      token.address.toLowerCase().includes(this.currentSearch)
    );

    // Show local results immediately
    if (filteredTokens.length > 0) {
      commonTokensSection.style.display = 'none';
      allTokensSection.style.display = 'block';
      noResultsSection.style.display = 'none';

      allTokensList.innerHTML = '';
      for (const token of filteredTokens) {
        const tokenElement = this.createTokenElement(token);
        allTokensList.appendChild(tokenElement);
      }
    }

    // Always search API for additional tokens (if search term is long enough)
    // This allows finding tokens with same ticker but different addresses
    if (this.currentSearch && this.currentSearch.length >= 2) {
      if (filteredTokens.length === 0) {
        commonTokensSection.style.display = 'none';
        allTokensSection.style.display = 'block';
        // Show loading state only if no local results
        allTokensList.innerHTML = '<div class="token-modal-loading"><div class="token-modal-spinner"></div><p>Searching DexScreener...</p></div>';
        noResultsSection.style.display = 'none';
      }

      // Debounce the actual API call by 500ms
      this.searchDebounceTimer = setTimeout(async () => {
        try {
          // Search on DexScreener - now returns array of tokens
          if (typeof searchTokenOnDexScreener === 'function') {
            const dexScreenerResults = await searchTokenOnDexScreener(this.currentSearch);
            
            if (dexScreenerResults && dexScreenerResults.length > 0) {
              // Filter out tokens that are already in local list (by address)
              const newTokens = dexScreenerResults.filter(result => 
                !this.tokens.some(t => t.address.toLowerCase() === result.address.toLowerCase())
              );
              
              if (newTokens.length > 0) {
                // Clear loading state if no local results were shown
                if (filteredTokens.length === 0) {
                  allTokensList.innerHTML = '';
                }
                
                // Add all new DexScreener results to the list
                for (const tokenInfo of newTokens) {
                  const resultElement = this.createDexScreenerResultElement(tokenInfo);
                  allTokensList.appendChild(resultElement);
                }
                noResultsSection.style.display = 'none';
                return;
              }
            }
          }
          
          // If no new results from DexScreener and no local results, show no results message
          if (filteredTokens.length === 0) {
            this.showNoResults(allTokensList, noResultsSection);
          }
        } catch (error) {
          console.error('DexScreener search error:', error);
          if (filteredTokens.length === 0) {
            this.showNoResults(allTokensList, noResultsSection);
          }
        }
      }, 500);
      
      return;
    }

    // Empty search or too short
    if (!this.currentSearch) {
      // Reset to default view
      commonTokensSection.style.display = 'block';
      allTokensSection.style.display = 'block';
      noResultsSection.style.display = 'none';
      this.renderTokens();
    } else if (filteredTokens.length === 0) {
      // Search term too short and no local results
      this.showNoResults(allTokensList, noResultsSection);
    }
  }

  showNoResults(allTokensList, noResultsSection) {
    allTokensList.innerHTML = '';
    
    if (this.currentSearch && this.currentSearch.startsWith('0x') && this.currentSearch.length === 42) {
      // Valid address format - show import button
      noResultsSection.style.display = 'flex';
      noResultsSection.querySelector('p').textContent = 'Token not found. Import from blockchain?';
      noResultsSection.querySelector('.token-modal-import').style.display = 'block';
    } else if (this.currentSearch) {
      noResultsSection.style.display = 'flex';
      noResultsSection.querySelector('p').textContent = 'No results found on Monad chain.';
      noResultsSection.querySelector('.token-modal-import').style.display = 'none';
    }
  }

  createDexScreenerResultElement(tokenInfo) {
    const item = document.createElement('div');
    item.className = 'token-modal-item dexscreener-result';
    
    const liquidityText = tokenInfo.liquidity 
      ? `$${(tokenInfo.liquidity / 1000).toFixed(1)}k` 
      : 'Unknown';

    item.innerHTML = `
      <img src="${tokenInfo.logo || 'https://monbridgedex.xyz/unknown.png'}" 
           class="token-modal-item-img" alt="${tokenInfo.symbol}">
      <div class="token-modal-item-info">
        <div class="token-modal-item-symbol">${tokenInfo.symbol}</div>
        <div class="token-modal-item-name">${tokenInfo.name || 'From DexScreener'}</div>
      </div>
      <div class="token-modal-item-balance">
        <div style="font-size: 12px; color: var(--text-muted);">Liquidity: ${liquidityText}</div>
        <button class="token-modal-import-btn" style="margin-top: 4px; padding: 4px 12px; font-size: 12px;">Import</button>
      </div>
    `;

    const importBtn = item.querySelector('.token-modal-import-btn');
    importBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      importBtn.textContent = 'Importing...';
      importBtn.disabled = true;

      if (typeof window.importToken === 'function') {
        const importedToken = await window.importToken(tokenInfo.address);
        if (importedToken) {
          // Don't push here - importToken already updates token modals
          // Just select the token
          this.selectToken(importedToken);
        } else {
          importBtn.textContent = 'Failed';
          setTimeout(() => {
            importBtn.textContent = 'Import';
            importBtn.disabled = false;
          }, 2000);
        }
      }
    });

    return item;
  }

  async handleImportToken() {
    if (!this.currentSearch.startsWith('0x') || this.currentSearch.length !== 42) {
      return;
    }

    // Show loading state
    const noResultsSection = this.modal.querySelector('.token-modal-no-results');
    const importBtn = noResultsSection.querySelector('.token-modal-import');
    const originalText = importBtn.textContent;
    importBtn.textContent = 'Importing...';
    importBtn.disabled = true;

    try {
      // Call the existing import function
      if (typeof window.importToken === 'function') {
        const importedToken = await window.importToken(this.currentSearch);
        if (importedToken) {
          // Don't push here - importToken already updates token modals
          // Just select the token
          this.selectToken(importedToken);
        }
      } else {
        throw new Error('Import function not available');
      }
    } catch (error) {
      console.error('Import error:', error);
      noResultsSection.querySelector('p').textContent = 'Failed to import token.';
    } finally {
      importBtn.textContent = originalText;
      importBtn.disabled = false;
    }
  }

  selectToken(token) {
    console.log('Selecting token:', token, 'Callback type:', typeof this.onSelectToken);
    if (typeof this.onSelectToken === 'function') {
      this.onSelectToken(token);
      this.close();
    } else {
      console.error('Token selection callback is not a function');
    }
  }

  // Method to update balances
  updateBalances(balances) {
    this.balances = balances;
    if (this.isOpen) {
      this.renderTokens();
    }
  }

  // Method to update tokens list
  updateTokens(tokens) {
    this.tokens = tokens;
    if (this.isOpen) {
      this.renderTokens();
    }
  }
}

// Initialize token modals for both sides when document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load CSS file dynamically
  if (!document.getElementById('token-modal-styles')) {
    const link = document.createElement('link');
    link.id = 'token-modal-styles';
    link.rel = 'stylesheet';
    link.href = 'styles.css';
    document.head.appendChild(link);
  }

  // Global TokenModal instances will be stored here when initialized
  window.tokenModals = {};
});

// Helper function to initialize token modals
function initializeTokenModals(options = {}) {
  const { tokens, defaultTokens, onSelectTokenA, onSelectTokenB, balances, provider, userAddress } = options;

  // Create token modal A
  window.tokenModals.A = new TokenModal({
    side: 'A',
    tokens: tokens || [],
    defaultTokens: defaultTokens || [],
    onSelectToken: onSelectTokenA || function() {},
    balances: balances || {},
    provider,
    userAddress
  });

  // Create token modal B
  window.tokenModals.B = new TokenModal({
    side: 'B',
    tokens: tokens || [],
    defaultTokens: defaultTokens || [],
    onSelectToken: onSelectTokenB || function() {},
    balances: balances || {},
    provider,
    userAddress
  });

  // Add click event listeners to token selectors
  const tokenASelect = document.getElementById('tokenASelect');
  const tokenBSelect = document.getElementById('tokenBSelect');

  if (tokenASelect) {
    tokenASelect.removeEventListener('click', window.openTokenModalA);
    window.openTokenModalA = function() {
      window.tokenModals.A.open();
    };
    tokenASelect.addEventListener('click', window.openTokenModalA);
  }

  if (tokenBSelect) {
    tokenBSelect.removeEventListener('click', window.openTokenModalB);
    window.openTokenModalB = function() {
      window.tokenModals.B.open();
    };
    tokenBSelect.addEventListener('click', window.openTokenModalB);
  }
}