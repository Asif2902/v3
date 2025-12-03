function initializeRemoveLPWalletIntegration() {
  if (!window.walletManager) {
    console.log('Wallet manager not ready, retrying...');
    setTimeout(initializeRemoveLPWalletIntegration, 100);
    return;
  }

  window.walletManager.connectionCallbacks = window.walletManager.connectionCallbacks.filter(cb => cb.pageType !== 'removelp');
  window.walletManager.disconnectionCallbacks = window.walletManager.disconnectionCallbacks.filter(cb => cb.pageType !== 'removelp');

  const connectionCallback = (address, walletProvider, walletSigner) => {
    provider = walletProvider;
    signer = walletSigner;
    userAddress = address;

    if (tokenA) fetchTokenBalance(tokenA, "A");
    if (tokenB) fetchTokenBalance(tokenB, "B");
    if (tokenA && tokenB) updateLPInfo();
  };
  connectionCallback.pageType = 'removelp';

  const disconnectionCallback = () => {
    provider = null;
    signer = null;
    userAddress = null;

    document.getElementById("tokenABalance").innerText = "Connect wallet";
    document.getElementById("tokenBBalance").innerText = "Connect wallet";
    document.getElementById("lpBalanceDisplay").innerText = "-";
  };
  disconnectionCallback.pageType = 'removelp';

  window.walletManager.onConnect(connectionCallback);
  window.walletManager.onDisconnect(disconnectionCallback);

  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(PRIMARY_RPC);
  }

  if (window.walletManager.isConnected && window.walletManager.userAddress) {
    connectionCallback(window.walletManager.userAddress, window.walletManager.provider, window.walletManager.signer);
  }
}
