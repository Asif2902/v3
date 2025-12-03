function initializeLPWalletIntegration() {
  const state = window.lpState;
  
  if (!window.walletManager) {
    console.log('Wallet manager not ready, retrying...');
    setTimeout(initializeLPWalletIntegration, 100);
    return;
  }

  window.walletManager.connectionCallbacks = window.walletManager.connectionCallbacks.filter(cb => cb.pageType !== 'addlp');
  window.walletManager.disconnectionCallbacks = window.walletManager.disconnectionCallbacks.filter(cb => cb.pageType !== 'addlp');

  const connectionCallback = (address, walletProvider, walletSigner) => {
    state.provider = walletProvider;
    state.signer = walletSigner;
    state.userAddress = address;

    if (state.tokenA) fetchLpTokenBalance(state.tokenA, "A");
    if (state.tokenB) fetchLpTokenBalance(state.tokenB, "B");
    
    if (state.tokenA && state.tokenB && state.selectedDex) {
      updateAddLiquidityButtonText();
    }
  };
  connectionCallback.pageType = 'addlp';

  const disconnectionCallback = () => {
    state.provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.PRIMARY_RPC);
    state.signer = null;
    state.userAddress = null;

    document.getElementById("tokenABalance").innerText = "Connect wallet";
    document.getElementById("tokenBBalance").innerText = "Connect wallet";
    
    const addLiquidityButton = document.getElementById("addLiquidityButton");
    addLiquidityButton.innerText = "Connect Wallet";
    addLiquidityButton.disabled = true;
  };
  disconnectionCallback.pageType = 'addlp';

  window.walletManager.onConnect(connectionCallback);
  window.walletManager.onDisconnect(disconnectionCallback);

  if (!state.provider) {
    state.provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.PRIMARY_RPC);
  }

  if (window.walletManager.isConnected && window.walletManager.userAddress) {
    connectionCallback(
      window.walletManager.userAddress, 
      window.walletManager.provider, 
      window.walletManager.signer
    );
  }
}

window.initializeLPWalletIntegration = initializeLPWalletIntegration;
