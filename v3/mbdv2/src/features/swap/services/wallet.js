function initializeWalletIntegration() {
  if (!window.walletManager) {
    console.log('Wallet manager not ready, retrying...');
    setTimeout(initializeWalletIntegration, 100);
    return;
  }

  window.walletManager.connectionCallbacks = window.walletManager.connectionCallbacks.filter(cb => cb.pageType !== 'swap');
  window.walletManager.disconnectionCallbacks = window.walletManager.disconnectionCallbacks.filter(cb => cb.pageType !== 'swap');

  const connectionCallback = (address, walletProvider, walletSigner) => {
    provider = walletProvider;
    signer = walletSigner;
    userAddress = address;

    aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, signer);
    multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, signer);

    if (fromToken) { fetchTokenBalance(fromToken, "from"); }
    if (toToken) { fetchTokenBalance(toToken, "to"); }

    const swapButton = document.getElementById("swapButton");
    if (swapButton) {
      swapButton.innerText = "Swap";
    }

    estimateSwap();
  };
  connectionCallback.pageType = 'swap';

  const disconnectionCallback = () => {
    provider = null;
    signer = null;
    userAddress = null;
    aggregatorContract = null;
    multiSplitHopContract = null;

    const swapButton = document.getElementById("swapButton");
    if (swapButton) {
      swapButton.innerText = "Connect Wallet to Swap";
    }

    document.getElementById("fromBalance").innerText = "Connect wallet";
    document.getElementById("toBalance").innerText = "Connect wallet";
  };
  disconnectionCallback.pageType = 'swap';

  window.walletManager.onConnect(connectionCallback);
  window.walletManager.onDisconnect(disconnectionCallback);

  if (!provider) {
    provider = window.walletManager.getProvider();
    aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
    multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, provider);
  }

  if (window.walletManager.isConnected && window.walletManager.userAddress) {
    connectionCallback(window.walletManager.userAddress, window.walletManager.provider, window.walletManager.signer);
  }
}
