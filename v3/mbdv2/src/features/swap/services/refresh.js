function clearAllRefreshTimers() {
  if (mainRefreshTimer) {
    clearInterval(mainRefreshTimer);
    mainRefreshTimer = null;
  }

  if (autoModeRefreshTimer) {
    clearInterval(autoModeRefreshTimer);
    autoModeRefreshTimer = null;
  }

  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function updateRefreshInterval() {
  clearAllRefreshTimers();

  mainRefreshTimer = setInterval(() => {
    if (!isSwapInProgress && !isApprovalInProgress && !isRefreshing) {
      performScheduledRefresh(false);
    }
  }, 20000);

  if (routingMode === 'auto') {
    autoModeRefreshTimer = setInterval(() => {
      if (!isSwapInProgress && !isApprovalInProgress && !isRefreshing) {
        performScheduledRefresh(true);
      }
    }, 10000);
  }

  startRefreshProgress(20000);
}

window.addEventListener('beforeunload', clearAllRefreshTimers);
window.addEventListener('pagehide', clearAllRefreshTimers);

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    clearAllRefreshTimers();
  } else {
    if (!isSwapInProgress && !isApprovalInProgress) {
      updateRefreshInterval();
    }
  }
});

function performScheduledRefresh(isAutoModeQuickRefresh = false) {
  if (isSwapInProgress || isApprovalInProgress || isRefreshing) {
    return;
  }

  if (isAutoModeQuickRefresh) {
    const currentAmount = document.getElementById("fromAmount").value;
    if (!currentAmount || parseFloat(currentAmount) <= 0) return;
  }

  isRefreshing = true;
  console.log('Starting scheduled refresh...');

  const safetyTimeout = setTimeout(() => {
    if (isRefreshing) {
      console.warn('Refresh timeout - forcing flag reset');
      isRefreshing = false;
    }
  }, 15000);

  estimateSwap(0, false).then(() => {
    clearTimeout(safetyTimeout);
    isRefreshing = false;
    console.log('Scheduled refresh completed');

    if (!isAutoModeQuickRefresh) {
      resetRefreshProgress();
    }
  }).catch(error => {
    clearTimeout(safetyTimeout);
    console.error('Scheduled refresh error:', error);
    isRefreshing = false;
  });
}

function startRefreshProgress(duration) {
  const progressElement = document.getElementById("refreshProgress");
  const progressFill = document.querySelector(".refresh-progress-fill");

  if (!progressElement || !progressFill) return;

  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  progressElement.classList.add('active');
  currentProgress = 0;
  progressStartTime = Date.now();

  progressFill.style.strokeDashoffset = '100.53';
  progressFill.style.stroke = 'rgba(99, 102, 241, 0.3)';

  const updateInterval = 50;

  progressTimer = setInterval(() => {
    const elapsed = Date.now() - progressStartTime;
    currentProgress = Math.min((elapsed / duration) * 100, 100);

    const offset = 100.53 - (currentProgress / 100) * 100.53;
    progressFill.style.strokeDashoffset = offset;

    const intensity = Math.min(0.3 + (currentProgress / 100) * 0.7, 1);
    progressFill.style.stroke = `rgba(99, 102, 241, ${intensity})`;

    if (currentProgress >= 100) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }, updateInterval);
}

function resetRefreshProgress() {
  const progressElement = document.getElementById("refreshProgress");
  const progressFill = document.querySelector(".refresh-progress-fill");

  if (!progressElement || !progressFill) return;

  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  progressElement.classList.remove('active');
  currentProgress = 0;

  progressFill.style.transition = 'stroke-dashoffset 0.3s ease';
  progressFill.style.strokeDashoffset = '100.53';
  progressFill.style.stroke = 'rgba(99, 102, 241, 0.3)';

  setTimeout(() => {
    progressFill.style.transition = '';
    if (!isSwapInProgress && !isApprovalInProgress) {
      startRefreshProgress(20000);
    }
  }, 300);
}

async function manualRefresh() {
  if (isRefreshing) {
    notify("Refresh already in progress", "info");
    return;
  }

  if (isSwapInProgress || isApprovalInProgress) {
    notify("Cannot refresh during transaction", "info");
    return;
  }

  const refreshButton = document.getElementById("refreshButton");
  const refreshIcon = document.getElementById("refreshIcon");

  if (refreshButton && refreshIcon) {
    refreshButton.classList.add('refreshing');
    refreshButton.disabled = true;
  }

  if (mainRefreshTimer) {
    clearInterval(mainRefreshTimer);
    mainRefreshTimer = null;
  }

  if (autoModeRefreshTimer) {
    clearInterval(autoModeRefreshTimer);
    autoModeRefreshTimer = null;
  }

  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }

  const progressElement = document.getElementById("refreshProgress");
  const progressFill = document.querySelector(".refresh-progress-fill");

  if (progressElement && progressFill) {
    progressElement.classList.remove('active');
    progressFill.style.strokeDashoffset = '100.53';
    progressFill.style.stroke = 'rgba(99, 102, 241, 0.3)';
    currentProgress = 0;
  }

  routeCache.clear();
  priceCache.clear();
  pendingRequests.clear();

  cachedMonPrice = null;
  lastFetchTime = 0;

  if (fromToken && toToken) {
    document.getElementById("estimatedOutput").innerText = "Refreshing...";
    document.getElementById("bestRouter").innerText = "Finding best route...";
    document.getElementById("estimatedOutputUsd").innerText = "...";
  }

  isRefreshing = true;

  try {
    if (userAddress && window.ethereum) {
      try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, signer);
        multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, signer);
      } catch (providerError) {
        console.error("Provider reinit error:", providerError);
        provider = createProvider();
        aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
        multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, provider);
      }
    } else {
      provider = createProvider();
      aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
      multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, provider);
    }

    if (userAddress && fromToken && toToken) {
      const balancePromises = [
        fetchTokenBalance(fromToken, "from").catch(err => {
          console.error("Balance refresh error for fromToken:", err);
        }),
        fetchTokenBalance(toToken, "to").catch(err => {
          console.error("Balance refresh error for toToken:", err);
        })
      ];

      await Promise.allSettled(balancePromises);
    }

    const hasValidInputs = fromToken && toToken && document.getElementById("fromAmount").value;

    if (hasValidInputs) {
      let estimateSuccess = false;
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await estimateSwap(0, true);
          estimateSuccess = true;
          break;
        } catch (error) {
          lastError = error;
          console.error(`Refresh attempt ${attempt + 1} failed:`, error);

          if (attempt < 2) {
            switchToNextRpc();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (estimateSuccess) {
        notify("Price quote refreshed successfully", "success");
      } else {
        throw lastError || new Error("All refresh attempts failed");
      }
    } else {
      notify("Please select tokens and enter amount", "info");
    }
  } catch (error) {
    console.error("Manual refresh error:", error);

    let errorMessage = "Refresh failed";
    if (error.message.includes("timeout")) {
      errorMessage = "Request timed out, please try again";
    } else if (error.message.includes("network")) {
      errorMessage = "Network error, please try again";
    } else if (error.message.includes("rate limit")) {
      errorMessage = "Rate limited, please wait a moment";
    }

    notify(errorMessage, "error");

    if (fromToken && toToken) {
      document.getElementById("estimatedOutput").innerText = "Error";
      document.getElementById("bestRouter").innerText = "Refresh failed";
      document.getElementById("estimatedOutputUsd").innerText = "Error";
    }
  } finally {
    isRefreshing = false;

    if (refreshButton) {
      refreshButton.classList.remove('refreshing');
      refreshButton.disabled = false;
    }

    setTimeout(() => {
      updateRefreshInterval();
    }, 500);
  }
}
