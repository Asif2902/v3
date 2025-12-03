document.getElementById("switchPair").addEventListener("click", () => {
  const currentOutput = document.getElementById("estimatedOutput").innerText;
  const outputValue = parseFloat(currentOutput);
  
  const temp = fromToken;
  fromToken = toToken;
  toToken = temp;
  
  document.getElementById("fromTokenLogo").src = (fromToken.logo && fromToken.logo !== "?")
    ? fromToken.logo
    : "https://monbridgedex.xyz/unknown.png";
  document.getElementById("fromTokenSymbol").innerText = fromToken.symbol;
  document.getElementById("toTokenLogo").src = (toToken.logo && toToken.logo !== "?")
    ? toToken.logo
    : "https://monbridgedex.xyz/unknown.png";
  document.getElementById("toTokenSymbol").innerText = toToken.symbol;
  
  if (!isNaN(outputValue) && outputValue > 0) {
    document.getElementById("fromAmount").value = outputValue.toString();
  }
  
  fetchTokenBalance(fromToken, "from");
  fetchTokenBalance(toToken, "to");
  estimateSwap();
});

document.getElementById("fromAmount").addEventListener("input",
debounce(estimateSwap, 400));

document.getElementById("fromAmount").addEventListener("input", function() {
  document.getElementById("estimatedOutput").innerText = "Calculating...";
  document.getElementById("bestRouter").innerText = "Finding route...";
  document.getElementById("estimatedOutputUsd").innerText = "...";

  const swapButton = document.getElementById("swapButton");
  if (swapButton) {
    swapButton.innerText = "Calculating...";
  }
});

document.getElementById("maxText").addEventListener("click", () => {
  if (fromToken && window.fromTokenBalance) {
    let maxVal = window.fromTokenBalance;

    const balanceStr = typeof maxVal === 'string' ? maxVal : maxVal.toString();

    if (fromToken.symbol === "MON") {
      const gasBuffer = ethers.utils.parseEther("0.01");
      const balanceBN = ethers.utils.parseEther(balanceStr);
      const maxBN = balanceBN.sub(gasBuffer);
      maxVal = maxBN.gt(0) ? ethers.utils.formatEther(maxBN) : "0";
    } else {
      const balanceBN = ethers.utils.parseUnits(balanceStr, fromToken.decimals);
      const oneBN = ethers.BigNumber.from("1");
      const maxBN = balanceBN.sub(oneBN);
      maxVal = maxBN.gt(0) ? ethers.utils.formatUnits(maxBN, fromToken.decimals) : "0";
    }

    maxVal = parseFloat(maxVal).toString();

    document.getElementById("fromAmount").value = maxVal;
    estimateSwap();
  } else {
    notify("Balance not available yet", "error");
  }
});

document.getElementById("swapButton").addEventListener("click", performSwap);

document.addEventListener('DOMContentLoaded', function() {
  initializeWalletIntegration();

  if (window.walletManager) {
    window.walletManager.maintainConnectionState();
  }
});

window.addEventListener('beforeunload', function() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  if (mainRefreshTimer) {
    clearInterval(mainRefreshTimer);
    mainRefreshTimer = null;
  }
  if (autoModeRefreshTimer) {
    clearInterval(autoModeRefreshTimer);
    autoModeRefreshTimer = null;
  }
  isRefreshing = false;
});

document.addEventListener('DOMContentLoaded', function() {
  const routingModeSelect = document.getElementById("routingModeSelect");
  if (routingModeSelect) {
    routingModeSelect.value = routingMode;

    routingModeSelect.addEventListener("change", function() {
      const oldMode = routingMode;
      routingMode = this.value;

      routeCache.clear();

      document.getElementById("estimatedOutput").innerText = "Calculating...";
      document.getElementById("bestRouter").innerText = "Finding route...";
      document.getElementById("estimatedOutputUsd").innerText = "...";

      if (routingMode === 'auto') {
        notify("Auto mode: Will compare both single and multi-split routes", "info");
      } else if (routingMode === 'multi') {
        notify("Multi-split mode: Will use only multi-split routing", "info");
      } else {
        notify("Single mode: Will use only single router routing", "info");
      }

      saveSettings();

      if (fromToken && toToken && document.getElementById("fromAmount").value) {
        estimateSwap();
      }
    });
  }

  const simulationToggle = document.getElementById("simulationToggle");
  if (simulationToggle) {
    simulationToggle.checked = isSimulationEnabled;

    simulationToggle.addEventListener("change", function() {
      isSimulationEnabled = this.checked;

      if (!isSimulationEnabled) {
        notify("Transaction simulation disabled - higher risk of swap failures", "info");
      } else {
        notify("Transaction simulation enabled - safer swapping", "success");
      }

      saveSettings();
    });
  }

  const refreshButton = document.getElementById("refreshButton");
  if (refreshButton) {
    refreshButton.addEventListener("click", manualRefresh);
  }
});

document.addEventListener("DOMContentLoaded", function() {
  initializeWalletIntegration();

  if (!provider) {
    provider = createProvider();
    aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
  }

  updateUI();
  updateSwapButtonState();
  setupNotificationSystem();

  updateNotificationBadge();

  setTokenPair();

  setTimeout(() => {
    updateRefreshInterval();
  }, 1000);
});

if (window.ethereum && window.ethereum.selectedAddress) {
  connectWallet().then(() => {
    updateUI();
  });
}

const originalConnectWallet = connectWallet;
connectWallet = async function() {
  await originalConnectWallet();
  updateUI();
};
