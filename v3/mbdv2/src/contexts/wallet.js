
// Centralized Wallet Management System
class WalletManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.isConnected = false;
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
    
    // Network configuration from network.js
    this.CHAIN_ID = NETWORK_CONFIG.CHAIN_ID;
    this.CHAIN_HEX = NETWORK_CONFIG.CHAIN_HEX;
    this.PRIMARY_RPC = NETWORK_CONFIG.PRIMARY_RPC;
    this.CHAIN_EXPLORER = NETWORK_CONFIG.CHAIN_EXPLORER;
    this.CHAIN_NAME = NETWORK_CONFIG.CHAIN_NAME;
    
    this.init();
  }

  async init() {
    // Check for saved connection
    const savedConnection = localStorage.getItem('walletConnection');
    if (savedConnection) {
      const connectionData = JSON.parse(savedConnection);
      if (connectionData.address && window.ethereum) {
        try {
          // Attempt to reconnect silently
          await this.reconnectSilently();
        } catch (error) {
          console.log('Auto-reconnection failed:', error);
          this.clearSavedConnection();
        }
      }
    }

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else if (accounts[0] !== this.userAddress) {
          this.handleAccountChange(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        // Don't reload immediately, try to handle chain change gracefully
        console.log('Chain changed to:', chainId);
        if (this.isConnected) {
          // Re-initialize provider with new chain
          this.provider = new ethers.providers.Web3Provider(window.ethereum);
          this.signer = this.provider.getSigner();
          this.notifyConnectionCallbacks();
        }
      });
    }

    this.updateUI();
  }

  async reconnectSilently() {
    if (!window.ethereum) return false;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        this.userAddress = accounts[0];
        this.isConnected = true;

        // Verify network
        const network = await this.provider.getNetwork();
        if (network.chainId !== this.CHAIN_ID) {
          await this.switchNetwork();
        }

        this.updateUI();
        this.notifyConnectionCallbacks();
        return true;
      }
    } catch (error) {
      console.error('Silent reconnection failed:', error);
      return false;
    }
    return false;
  }

  async connect() {
    if (!window.ethereum) {
      this.notify("Please install MetaMask", "error");
      return false;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();
      this.isConnected = true;

      // Check and switch network if needed
      const network = await this.provider.getNetwork();
      if (network.chainId !== this.CHAIN_ID) {
        await this.switchNetwork();
      }

      // Save connection to localStorage
      this.saveConnection();

      this.notify(`Wallet connected: ${this.formatAddress(this.userAddress)}`, "success");
      this.updateUI();
      this.notifyConnectionCallbacks();
      
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      this.notify("Wallet connection failed", "error");
      return false;
    }
  }

  async switchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.CHAIN_HEX }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: this.CHAIN_HEX,
              chainName: this.CHAIN_NAME,
              nativeCurrency: {
                name: 'MON',
                symbol: 'MON',
                decimals: 18
              },
              rpcUrls: [this.PRIMARY_RPC],
              blockExplorerUrls: [this.CHAIN_EXPLORER]
            }]
          });
        } catch (addError) {
          throw new Error('Failed to add network');
        }
      } else {
        throw new Error('Failed to switch network');
      }
    }
  }

  formatAddress(addr) {
    return addr.substring(0, 6) + '***' + addr.substring(addr.length - 4);
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.isConnected = false;
    
    this.clearSavedConnection();
    this.updateUI();
    this.notifyDisconnectionCallbacks();
    this.notify("Wallet disconnected", "info");
  }

  saveConnection() {
    const connectionData = {
      address: this.userAddress,
      timestamp: Date.now()
    };
    localStorage.setItem('walletConnection', JSON.stringify(connectionData));
  }

  clearSavedConnection() {
    localStorage.removeItem('walletConnection');
  }

  async handleAccountChange(newAddress) {
    // If switching to a different address, update everything
    if (newAddress && newAddress !== this.userAddress) {
      this.userAddress = newAddress;
      
      // Re-initialize provider and signer with new address
      if (window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        this.isConnected = true;
      }
      
      this.saveConnection();
      
      // Update UI immediately, then force refresh
      this.updateUI();
      this.forceUIRefresh();
      
      // Add delay before notifying callbacks to ensure provider is ready
      setTimeout(() => {
        this.notifyConnectionCallbacks();
      }, 500);
    } else if (!newAddress) {
      // If no address (disconnected), handle as disconnection
      this.disconnect();
    }
  }

  updateUI() {
    const connectButtons = document.querySelectorAll('#connectWallet, .connect-wallet-btn');
    
    connectButtons.forEach(button => {
      if (this.isConnected && this.userAddress) {
        const shortAddress = this.formatAddress(this.userAddress);
        button.innerText = shortAddress;
        button.title = this.userAddress;
      } else {
        button.innerText = "Connect";
        button.title = "";
      }
    });
  }
  
  // Immediate UI update without delays
  forceUIRefresh() {
    // Removed timeout - update immediately
    const connectButtons = document.querySelectorAll('#connectWallet, .connect-wallet-btn');
    connectButtons.forEach(button => {
      if (this.isConnected && this.userAddress && button.innerText === "Connect") {
        const shortAddress = this.formatAddress(this.userAddress);
        button.innerText = shortAddress;
        button.title = this.userAddress;
      }
    });
  }

  // Callback system for components to react to connection changes
  onConnect(callback) {
    this.connectionCallbacks.push(callback);
  }

  onDisconnect(callback) {
    this.disconnectionCallbacks.push(callback);
  }

  notifyConnectionCallbacks() {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(this.userAddress, this.provider, this.signer);
      } catch (error) {
        console.error('Connection callback error:', error);
      }
    });
  }

  notifyDisconnectionCallbacks() {
    this.disconnectionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Disconnection callback error:', error);
      }
    });
  }

  // Helper method to get provider for blockchain calls
  getProvider() {
    if (!this.provider) {
      // Return read-only provider for non-connected state
      return new ethers.providers.JsonRpcProvider(this.PRIMARY_RPC);
    }
    return this.provider;
  }

  // Helper method to check if wallet is connected
  isWalletConnected() {
    return this.isConnected && this.userAddress;
  }

  // Notification system
  notify(message, type = "info") {
    const notifications = document.getElementById("notifications");
    if (notifications) {
      const div = document.createElement("div");
      div.className = "notification " + type;
      div.innerHTML = message;
      notifications.appendChild(div);
      setTimeout(() => { div.remove(); }, 6000);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  // Initialize wallet connection button
  initializeConnectButton() {
    const connectButtons = document.querySelectorAll('#connectWallet, .connect-wallet-btn');
    
    connectButtons.forEach(button => {
      // Remove existing listeners to prevent duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Add new listener
      newButton.addEventListener('click', async () => {
        if (this.isConnected) {
          // Show disconnect option or do nothing (depending on UX preference)
          return;
        }
        await this.connect();
      });
    });
    
    // Update UI immediately after initialization
    this.updateUI();
  }
  
  // Method to ensure connection state is properly maintained across page navigation
  maintainConnectionState() {
    if (this.isConnected && this.userAddress) {
      this.updateUI();
      this.notifyConnectionCallbacks();
    }
  }
}

// Create global wallet manager instance
window.walletManager = new WalletManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.walletManager.initializeConnectButton();
  
  // Set up periodic connection state verification with faster updates
  setInterval(() => {
    if (window.walletManager.isConnected && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length === 0 && window.walletManager.isConnected) {
          window.walletManager.disconnect();
        } else if (accounts.length > 0 && accounts[0] !== window.walletManager.userAddress) {
          window.walletManager.handleAccountChange(accounts[0]);
        }
      }).catch(console.error);
    }
  }, 500); // Check every 1 second for faster updates
});
