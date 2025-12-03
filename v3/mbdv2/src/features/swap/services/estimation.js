async function estimateSwap(retryCount = 0, forceRefresh = false) {
  const swapButton = document.getElementById("swapButton");
  const amountIn = document.getElementById("fromAmount").value;

  if (forceRefresh) {
    pendingRequests.clear();
  }

  const requestKey = `${fromToken?.symbol}_${toToken?.symbol}_${amountIn}_${routingMode}_${userAddress || 'no_wallet'}`;
  if (!forceRefresh && pendingRequests.has(requestKey)) {
    console.log('Skipping duplicate estimation request:', requestKey);
    return;
  }

  pendingRequests.add(requestKey);
  
  setTimeout(() => {
    pendingRequests.delete(requestKey);
  }, 5000);

  hasValidSwapData = false;
  isDataLoading = true;
  updateSwapButtonState();

  if (window.estimateSwapTimer) {
    clearTimeout(window.estimateSwapTimer);
  }

  try {
    if (!fromToken || !toToken || !amountIn || isNaN(amountIn) || parseFloat(amountIn) <= 0) {
      hasValidSwapData = false;
      isDataLoading = false;
      updateSwapButtonState();
      pendingRequests.delete(requestKey);
      return;
    }

    if (!forceRefresh) {
      const cacheKey = getCacheKey({ fromToken: fromToken.symbol, toToken: toToken.symbol, amountIn, routingMode });
      const cached = routeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 10000) {
        const data = cached.value;
        displayEstimationResults(data);
        pendingRequests.delete(requestKey);
        return;
      }
    }

    if (!provider || forceRefresh) {
      if (userAddress && window.ethereum && signer) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, signer);
        multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, signer);
      } else {
        provider = createProvider();
        aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
        multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, provider);
      }
    }

    if (!aggregatorContract || forceRefresh) {
      const contractProvider = (userAddress && signer) ? signer : provider;
      aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, contractProvider);
    }

    if (!multiSplitHopContract || forceRefresh) {
      const contractProvider = (userAddress && signer) ? signer : provider;
      multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, contractProvider);
    }

    if (!userAddress && swapButton) {
      swapButton.innerText = "Connect Wallet to Swap";
    }

    if ((fromToken.symbol === "MON" && toToken.symbol === "WMON") || (fromToken.symbol === "WMON" && toToken.symbol === "MON")) {
      await handleWrapUnwrapEstimation(amountIn);
      return;
    }

    let amountInParsed;
    if (fromToken.symbol === "MON") {
      amountInParsed = ethers.utils.parseEther(amountIn);
    } else {
      amountInParsed = ethers.utils.parseUnits(amountIn, fromToken.decimals);
    }

    document.getElementById("estimatedOutput").innerText = "Calculating...";
    document.getElementById("bestRouter").innerText = "Finding best route...";
    document.getElementById("estimatedOutputUsd").innerText = "...";

    const results = await getParallelEstimations(amountInParsed, fromToken, toToken);

    if (!results) {
      throw new Error("All estimation methods failed");
    }

    const finalResult = processEstimationResults(results);

    if (!finalResult) {
      throw new Error("No valid route found");
    }

    await updateUIWithResults(finalResult, amountInParsed);

    if (!forceRefresh || hasValidSwapData) {
      const cacheKey = getCacheKey({ fromToken: fromToken.symbol, toToken: toToken.symbol, amountIn, routingMode });
      const cacheData = createCacheData(finalResult);
      routeCache.set(cacheKey, { value: cacheData, timestamp: Date.now() });
    }

  } catch (error) {
    console.error("General swap estimation error:", error);
    handleEstimationError(error);
  } finally {
    isDataLoading = false;
    updateSwapButtonState();
    pendingRequests.delete(requestKey);
  }

  await updateAdditionalInfo(amountIn);
}

async function handleWrapUnwrapEstimation(amountIn) {
  const outputValue = parseFloat(amountIn).toFixed(4);
  document.getElementById("estimatedOutput").innerText = `${outputValue} `;
  const monPrice = await getMonPriceCached();
  document.getElementById("estimatedOutputUsd").innerText = monPrice ? "$" + (monPrice * parseFloat(amountIn)).toFixed(2) : "Price N/A";
  document.getElementById("inputUsdValue").innerText = monPrice ? "$" + (monPrice * parseFloat(amountIn)).toFixed(2) : "-";
  document.getElementById("priceImpact").innerText = "0%";
  document.getElementById("aggFee").innerText = "$0.00";
  currentPriceImpact = 0;
  document.getElementById("bestRouter").innerText = "Wrap/Unwrap";
  hasValidSwapData = parseFloat(outputValue) > 0;
  isDataLoading = false;
  updateSwapButtonState();
  window.currentSwapData = null;
  window.currentBestSwap = null;
}

async function getParallelEstimations(amountInParsed, fromToken, toToken) {
  const promises = [];

  if (routingMode === 'auto') {
    promises.push(
      getMultiSplitEstimateWithTimeout(amountInParsed, fromToken, toToken),
      getSingleSplitEstimateWithTimeout(amountInParsed, fromToken, toToken)
    );
  } else if (routingMode === 'multi') {
    promises.push(getMultiSplitEstimateWithTimeout(amountInParsed, fromToken, toToken));
  } else {
    promises.push(getSingleSplitEstimateWithTimeout(amountInParsed, fromToken, toToken));
  }

  try {
    const results = await Promise.allSettled(promises);

    const processedResults = {
      multiSplit: null,
      singleSplit: null
    };

    if (routingMode === 'auto') {
      processedResults.multiSplit = results[0].status === 'fulfilled' ? results[0].value : { success: false, type: 'multi', estimatedOutput: 0, error: results[0].reason?.message || 'Multi-split failed' };
      processedResults.singleSplit = results[1].status === 'fulfilled' ? results[1].value : { success: false, type: 'single', estimatedOutput: 0, error: results[1].reason?.message || 'Single route failed' };

      console.log('Multi-split result:', processedResults.multiSplit.success ? `${processedResults.multiSplit.estimatedOutput} ${toToken.symbol}` : 'Failed');
      console.log('Single-split result:', processedResults.singleSplit.success ? `${processedResults.singleSplit.estimatedOutput} ${toToken.symbol}` : 'Failed');
    } else if (routingMode === 'multi') {
      processedResults.multiSplit = results[0].status === 'fulfilled' ? results[0].value : null;
    } else {
      processedResults.singleSplit = results[0].status === 'fulfilled' ? results[0].value : null;
    }

    return processedResults;
  } catch (error) {
    console.error("Parallel estimation error:", error);
    return null;
  }
}

async function getMultiSplitEstimateWithTimeout(amountInParsed, fromToken, toToken, timeout = 12000) {
  return Promise.race([
    getMultiSplitEstimate(amountInParsed, fromToken, toToken),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Multi-split timeout')), timeout))
  ]);
}

async function getSingleSplitEstimateWithTimeout(amountInParsed, fromToken, toToken, timeout = 12000) {
  return Promise.race([
    getSingleSplitEstimate(amountInParsed, fromToken, toToken),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Single-split timeout')), timeout))
  ]);
}

async function getMultiSplitEstimate(amountInParsed, fromToken, toToken, retryCount = 0) {
  try {
    if (!multiSplitHopContract) {
      console.log("Initializing multi-split-hop contract");
      if (!provider) {
        provider = createProvider();
      }
      multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, provider);
    }

    let path = [];
    let inputTokenAddress = fromToken.address;
    let outputTokenAddress = toToken.address;

    if (fromToken.symbol === "MON") {
      inputTokenAddress = defaultTokens.find(t => t.symbol === "WMON").address;
    }
    if (toToken.symbol === "MON") {
      outputTokenAddress = defaultTokens.find(t => t.symbol === "WMON").address;
    }

    path = [inputTokenAddress, outputTokenAddress];

    const slippageBPS = Math.round(slippageTolerance * 100);

    const swapData = await rateLimitedCall(() => 
      multiSplitHopContract.getBestSwapData(amountInParsed, path, false, slippageBPS)
    );

    console.log("Multi-split contract getBestSwapData returned:", swapData);

    if (!swapData || !swapData.amountOutMin || swapData.amountOutMin.isZero()) {
      console.log("No valid swap data from multi-split contract");
      return {
        type: 'multi',
        success: false,
        estimatedOutput: "0.00",
        error: "No multi-split route found"
      };
    }

    const amountOutMinRaw = ethers.utils.formatUnits(swapData.amountOutMin, toToken.decimals);
    const amountOutMin = parseFloat(amountOutMinRaw);
    const estimatedOutput = amountOutMin / (1 - slippageTolerance / 100);

    let routerName = "Multi-Split Hops";
    const routerType = swapData.routerType;

    if (routerType === 0) {
      routerName = "V2 Router";
    } else if (routerType === 1) {
      routerName = "V3 Router";
    }

    const routerInfo = DEX_ROUTERS.find(r => r.address.toLowerCase() === swapData.router.toLowerCase());
    if (routerInfo) {
      routerName = `${routerInfo.name} (${routerType === 0 ? 'V2' : 'V3'})`;
    }

    return {
      type: 'multi',
      success: true,
      estimatedOutput: estimatedOutput.toFixed(6),
      routerName: routerName,
      swapData: swapData,
      amountOutMin: swapData.amountOutMin
    };

  } catch (error) {
    console.error("Multi-split estimation error:", error);

    if (retryCount < 3) {
      console.log(`Retrying multi-split estimation... (${retryCount + 1}/4)`);
      switchToNextRpc();
      await new Promise(resolve => setTimeout(resolve, 300));
      return await getMultiSplitEstimate(amountInParsed, fromToken, toToken, retryCount + 1);
    }

    return {
      type: 'multi',
      success: false,
      estimatedOutput: "0.00",
      error: error.message || "Multi-split estimation failed"
    };
  }
}

async function getSingleSplitEstimate(amountInParsed, fromToken, toToken, retryCount = 0) {
  try {
    if (!aggregatorContract) {
      if (!provider) {
        provider = createProvider();
      }
      aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
    }

    let path;
    if (fromToken.symbol === "MON" || toToken.symbol === "MON") {
      if (fromToken.symbol === "MON") {
        path = [defaultTokens.find(t => t.symbol === "WMON").address, toToken.address];
      } else {
        path = [fromToken.address, defaultTokens.find(t => t.symbol === "WMON").address];
      }
    } else {
      path = [fromToken.address, toToken.address];
    }

    const bestSwap = await rateLimitedCall(() => aggregatorContract.getBestSwap(amountInParsed, path));

    if (!bestSwap || !bestSwap[1] || bestSwap[1].isZero()) {
      return {
        type: 'single',
        success: false,
        estimatedOutput: "0.00",
        error: "No single route found"
      };
    }

    const estimatedOutput = ethers.utils.formatUnits(bestSwap[1], toToken.decimals);
    const routerInfo = DEX_ROUTERS.find(r => r.address.toLowerCase() === bestSwap[0].toLowerCase());
    const routerName = routerInfo ? routerInfo.name : "Unknown Router";

    return {
      type: 'single',
      success: true,
      estimatedOutput: parseFloat(estimatedOutput).toFixed(6),
      routerName: routerName,
      routerAddress: bestSwap[0],
      amountOut: bestSwap[1],
      path: path
    };

  } catch (error) {
    console.error("Single-split estimation error:", error);

    if (retryCount < 3) {
      console.log(`Retrying single-split estimation... (${retryCount + 1}/4)`);
      switchToNextRpc();
      await new Promise(resolve => setTimeout(resolve, 300));
      return await getSingleSplitEstimate(amountInParsed, fromToken, toToken, retryCount + 1);
    }

    return {
      type: 'single',
      success: false,
      estimatedOutput: "0.00",
      error: error.message || "Single-split estimation failed"
    };
  }
}

function processEstimationResults(results) {
  if (routingMode === 'multi') {
    return results.multiSplit;
  } else if (routingMode === 'single') {
    return results.singleSplit;
  }

  const multiSuccess = results.multiSplit && results.multiSplit.success;
  const singleSuccess = results.singleSplit && results.singleSplit.success;

  if (!multiSuccess && !singleSuccess) {
    return null;
  }

  if (multiSuccess && !singleSuccess) {
    return results.multiSplit;
  }

  if (!multiSuccess && singleSuccess) {
    return results.singleSplit;
  }

  const multiOutput = parseFloat(results.multiSplit.estimatedOutput);
  const singleOutput = parseFloat(results.singleSplit.estimatedOutput);

  console.log(`Comparing routes - Multi: ${multiOutput}, Single: ${singleOutput}`);

  if (multiOutput >= singleOutput) {
    console.log(`Selected: Multi-split (${multiOutput} >= ${singleOutput})`);
    return results.multiSplit;
  } else {
    console.log(`Selected: Single (${singleOutput} > ${multiOutput})`);
    return results.singleSplit;
  }
}

async function updateUIWithResults(result, amountInParsed) {
  const estimatedOutput = parseFloat(result.estimatedOutput);
  const bestRouterElement = document.getElementById("bestRouter");

  document.getElementById("estimatedOutput").innerText = estimatedOutput.toFixed(6);

  if (result.type === 'multi' && result.swapData) {
    window.currentSwapData = result.swapData;
    window.currentBestSwap = null;
    let routerName = "V3 Router";
    if (result.swapData && result.swapData.router) {
      const v3Router = getV3RouterByAddress(result.swapData.router);
      if (v3Router) {
        routerName = v3Router.name;
      } else {
        routerName = getRouterName(result.swapData.router);
      }
    }

    bestRouterElement.textContent = routerName;

    const betaTag = document.createElement('span');
    betaTag.className = 'beta-tag';

    if (result.swapData && result.swapData.path && result.swapData.path.length > 2) {
      betaTag.textContent = "Multi-Hop";
    } else {
      betaTag.textContent = "V3";
    }

    bestRouterElement.appendChild(document.createTextNode(' '));
    bestRouterElement.appendChild(betaTag);
  } else {
    window.currentSwapData = null;
    window.currentBestSwap = {
      routerAddress: result.routerAddress,
      amountOut: result.amountOut,
      path: result.path
    };
    bestRouterElement.textContent = result.routerName;
  }

  const toTokenPrice = await getTokenPriceUSD(toToken);
  if (toTokenPrice) {
    const outputUsd = estimatedOutput * toTokenPrice;
    document.getElementById("estimatedOutputUsd").innerText = `$${outputUsd.toFixed(2)}`;
  } else {
    document.getElementById("estimatedOutputUsd").innerText = "Price N/A";
  }

  let amountOutForImpact;
  if (result.type === 'multi' && result.amountOutMin) {
    amountOutForImpact = result.amountOutMin;
  } else if (result.type === 'single' && result.amountOut) {
    amountOutForImpact = result.amountOut;
  } else {
    amountOutForImpact = ethers.utils.parseUnits(result.estimatedOutput, toToken.decimals);
  }

  await calculateAndDisplayPriceImpact(amountInParsed, amountOutForImpact);

  hasValidSwapData = estimatedOutput > 0;
  isDataLoading = false;
  updateSwapButtonState();
}

async function calculateAndDisplayPriceImpact(amountInParsed, estimatedOutput) {
  const impact = await calculatePriceImpact(fromToken, toToken, amountInParsed, estimatedOutput);
  currentPriceImpact = impact;

  const priceImpactEl = document.getElementById("priceImpact");
  if (priceImpactEl) {
    priceImpactEl.innerText = `${impact.toFixed(2)}%`;

    priceImpactEl.classList.remove('low', 'medium', 'high');
    if (impact < 1) {
      priceImpactEl.classList.add('low');
    } else if (impact < 5) {
      priceImpactEl.classList.add('medium');
    } else {
      priceImpactEl.classList.add('high');
    }
  }
}

function createCacheData(result) {
  return {
    estimatedOutput: result.estimatedOutput,
    routerName: result.routerName,
    type: result.type,
    swapData: result.swapData || null,
    routerAddress: result.routerAddress || null,
    amountOut: result.amountOut || null,
    path: result.path || null
  };
}

function displayEstimationResults(data) {
  document.getElementById("estimatedOutput").innerText = parseFloat(data.estimatedOutput).toFixed(6);
  document.getElementById("bestRouter").innerText = data.routerName || "Unknown";

  if (data.type === 'multi' && data.swapData) {
    window.currentSwapData = data.swapData;
    window.currentBestSwap = null;
  } else if (data.type === 'single') {
    window.currentSwapData = null;
    window.currentBestSwap = {
      routerAddress: data.routerAddress,
      amountOut: data.amountOut,
      path: data.path
    };
  }

  hasValidSwapData = parseFloat(data.estimatedOutput) > 0;
  isDataLoading = false;
  updateSwapButtonState();
}

function handleEstimationError(error) {
  console.error("Estimation error:", error);
  document.getElementById("estimatedOutput").innerText = "Error";
  document.getElementById("bestRouter").innerText = "No route found";
  document.getElementById("estimatedOutputUsd").innerText = "-";
  hasValidSwapData = false;
  isDataLoading = false;
  updateSwapButtonState();
}

async function updateAdditionalInfo(amountIn) {
  if (!fromToken || !toToken || !amountIn || isNaN(amountIn) || parseFloat(amountIn) <= 0) {
    return;
  }

  const fromTokenUsd = await getTokenPriceUSD(fromToken);
  if (fromTokenUsd !== null) {
    const inputUsd = fromTokenUsd * parseFloat(amountIn);
    document.getElementById("inputUsdValue").innerText = "$" + inputUsd.toFixed(2);

    const fee = inputUsd * 0.001;
    document.getElementById("aggFee").innerText = "$" + fee.toFixed(4);
  } else {
    document.getElementById("inputUsdValue").innerText = "-";
    document.getElementById("aggFee").innerText = "-";
  }

  if (fromTokenUsd !== null) {
    document.getElementById("inputTokenPriceLabel").innerText = fromToken.symbol + " token price: $" + fromTokenUsd.toFixed(4);
  } else {
    document.getElementById("inputTokenPriceLabel").innerText = fromToken.symbol + " token price: Price N/A";
  }

  const toTokenUsd = await getTokenPriceUSD(toToken);
  if (toTokenUsd !== null) {
    document.getElementById("outputTokenPriceLabel").innerText = toToken.symbol + " token price: $" + toTokenUsd.toFixed(4);
  } else {
    document.getElementById("outputTokenPriceLabel").innerText = toToken.symbol + " token price: Price N/A";
  }
}