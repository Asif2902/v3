function showConfirmationModal() {
  return new Promise((resolve, reject) => {
    let modalOverlay = document.getElementById("confirmationModalOverlay");

    if (!modalOverlay) {
      modalOverlay = document.createElement("div");
      modalOverlay.id = "confirmationModalOverlay";
      modalOverlay.className = "modal-overlay";

      const modalContainer = document.createElement("div");
      modalContainer.id = "confirmationModal";
      modalContainer.className = "modal-container";

      const message = document.createElement("p");
      message.innerHTML = "WARNING: The price impact is over 15%. Type 'confirm' to proceed with the swap.";
      message.style.color = "#FF6871";
      message.style.fontWeight = "bold";
      modalContainer.appendChild(message);

      const input = document.createElement("input");
      input.type = "text";
      input.id = "confirmationInput";
      input.placeholder = "Type 'confirm'";
      modalContainer.appendChild(input);

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "modal-actions";

      const confirmButton = document.createElement("button");
      confirmButton.id = "confirmSwapBtn";
      confirmButton.innerText = "Confirm";
      buttonContainer.appendChild(confirmButton);

      const cancelButton = document.createElement("button");
      cancelButton.id = "cancelSwapBtn";
      cancelButton.innerText = "Cancel";
      buttonContainer.appendChild(cancelButton);

      modalContainer.appendChild(buttonContainer);
      modalOverlay.appendChild(modalContainer);
      document.body.appendChild(modalOverlay);
    } else {
      modalOverlay.style.display = "flex";
      const input = document.getElementById("confirmationInput");
      if (input) input.value = "";
    }

    const confirmButton = document.getElementById("confirmSwapBtn");
    const cancelButton = document.getElementById("cancelSwapBtn");
    const input = document.getElementById("confirmationInput");

    const newConfirmButton = confirmButton.cloneNode(true);
    const newCancelButton = cancelButton.cloneNode(true);

    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    newConfirmButton.addEventListener("click", () => {
      if (input.value.trim().toLowerCase() === "confirm") {
        modalOverlay.style.display = "none";
        resolve();
      } else {
        alert("You must type 'confirm' to proceed.");
      }
    });

    newCancelButton.addEventListener("click", () => {
      modalOverlay.style.display = "none";
      reject(new Error("Swap cancelled by user"));
    });

    input.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        if (input.value.trim().toLowerCase() === "confirm") {
          modalOverlay.style.display = "none";
          resolve();
        } else {
          alert("You must type 'confirm' to proceed.");
        }
      }
    });

    setTimeout(() => input.focus(), 100);
  });
}

async function simulateTransaction(params, retryCount = 0) {
  const { fromToken, toToken, amountInParsed, amountOutMin, path, deadline } = params;

  try {
    let simulationResult = false;

    if (fromToken.symbol === "MON" && toToken.symbol === "WMON") {
      const balance = await provider.getBalance(userAddress);
      simulationResult = balance.gte(amountInParsed);

      if (!simulationResult) {
        notify("Simulation failed: Insufficient MON balance", "error");
        return false;
      }
      return true;
    } else if (fromToken.symbol === "WMON" && toToken.symbol === "MON") {
      const wmonContract = new ethers.Contract(
        defaultTokens.find(t => t.symbol === "WMON").address,
        ["function balanceOf(address) view returns (uint)"],
        provider
      );

      const balance = await rateLimitedCall(() => wmonContract.balanceOf(userAddress));
      simulationResult = balance.gte(amountInParsed);

      if (!simulationResult) {
        notify("Simulation failed: Insufficient WMON balance", "error");
        return false;
      }
      return true;
    }

    if ((routingMode === 'multi' || (routingMode === 'auto' && window.currentSwapData)) && window.currentSwapData) {
      if (fromToken.symbol !== "MON") {
        const tokenContract = new ethers.Contract(
          fromToken.address,
          ["function allowance(address owner, address spender) view returns (uint)",
           "function balanceOf(address) view returns (uint)"],
          provider
        );

        const balance = await rateLimitedCall(() => tokenContract.balanceOf(userAddress));
        if (balance.lt(amountInParsed)) {
          notify("Simulation failed: Insufficient token balance", "error");
          return false;
        }

        const allowance = await rateLimitedCall(() => tokenContract.allowance(userAddress, MULTI_SPLIT_HOP_ADDRESS));
        if (allowance.lt(amountInParsed)) {
          console.log("Approval will be needed for V3 contract before swap");
        }
      } else {
        const balance = await provider.getBalance(userAddress);
        const gasBuffer = ethers.utils.parseEther("0.01");

        if (balance.lt(amountInParsed.add(gasBuffer))) {
          const balanceFormatted = parseFloat(ethers.utils.formatEther(balance)).toFixed(6);
          const requiredFormatted = parseFloat(ethers.utils.formatEther(amountInParsed.add(gasBuffer))).toFixed(6);
          notify(`Insufficient MON balance. You have ${balanceFormatted} MON, but need ${requiredFormatted} MON (including gas)`, "error");
          return false;
        }
      }

      const swapData = window.currentSwapData;
      if (!swapData || !swapData.router || swapData.router === ethers.constants.AddressZero) {
        notify("Simulation failed: Invalid swap data", "error");
        return false;
      }

      if (!swapData.path || swapData.path.length < 2) {
        notify("Simulation failed: Invalid swap path", "error");
        return false;
      }

      if (!swapData.amountOutMin || swapData.amountOutMin.isZero()) {
        notify("Simulation failed: Invalid output amount", "error");
        return false;
      }

      console.log("V3 swap data simulation passed");
      return true;
    }

    if (fromToken.symbol !== "MON") {
      const tokenContract = new ethers.Contract(
        fromToken.address,
        ["function allowance(address owner, address spender) view returns (uint)",
         "function balanceOf(address) view returns (uint)"],
        provider
      );

      const balance = await rateLimitedCall(() => tokenContract.balanceOf(userAddress));
      if (balance.lt(amountInParsed)) {
        const balanceFormatted = parseFloat(ethers.utils.formatUnits(balance, fromToken.decimals)).toFixed(6);
        const requiredFormatted = parseFloat(ethers.utils.formatUnits(amountInParsed, fromToken.decimals)).toFixed(6);
        notify(`Insufficient ${fromToken.symbol} balance. You have ${balanceFormatted}, but need ${requiredFormatted}`, "error");
        return false;
      }

      const contractAddress = (routingMode === 'multi' || (routingMode === 'auto' && window.currentSwapData)) ? MULTI_SPLIT_HOP_ADDRESS : aggregatorAddress;
      const allowance = await rateLimitedCall(() => tokenContract.allowance(userAddress, contractAddress));
      if (allowance.lt(amountInParsed)) {
        console.log("Approval will be needed before swap");
      }
    } else {
      const balance = await provider.getBalance(userAddress);
      const gasBuffer = ethers.utils.parseEther("0.005");

      if (balance.lt(amountInParsed.add(gasBuffer))) {
        const balanceFormatted = parseFloat(ethers.utils.formatEther(balance)).toFixed(6);
        const requiredFormatted = parseFloat(ethers.utils.formatEther(amountInParsed.add(gasBuffer))).toFixed(6);
        notify(`Insufficient MON balance. You have ${balanceFormatted} MON, but need ${requiredFormatted} MON (including gas)`, "error");
        return false;
      }
    }

    try {
      const bestSwap = await rateLimitedCall(() => aggregatorContract.getBestSwap(amountInParsed, path));

      if (!bestSwap || bestSwap[1].isZero() || bestSwap[1].lt(amountOutMin)) {
        notify("Simulation failed: Route doesn't provide minimum expected output", "error");
        return false;
      }

      const priceImpactRaw = await rateLimitedCall(() => 
        aggregatorContract.getPriceImpact(bestSwap[0], path[0], path[1], amountInParsed)
      );

      const priceImpactPercent = parseFloat(ethers.utils.formatUnits(priceImpactRaw, 18)) * 100;

      if (!isAutoSlippage && priceImpactPercent > slippageTolerance) {
        notify(`Simulation failed: Price impact (${priceImpactPercent.toFixed(2)}%) exceeds your slippage tolerance (${slippageTolerance.toFixed(2)}%)`, "error");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Simulation error:", error);

      if (retryCount < 2) {
        console.log(`Retrying simulation... (${retryCount + 1}/3)`);
        switchToNextRpc();
        return await simulateTransaction(params, retryCount + 1);
      }

      notify("Simulation failed: " + (error.message || "Unknown error"), "error");
      return false;
    }
  } catch (error) {
    console.error("General simulation error:", error);

    if (retryCount < 2) {
      console.log(`Retrying simulation... (${retryCount + 1}/3)`);
      switchToNextRpc();
      return await simulateTransaction(params, retryCount + 1);
    }

    notify("Simulation failed: " + (error.message || "Unknown error"), "error");
    return false;
  }
}

async function performSwap(retryCount = 0) {
  const swapButton = document.getElementById("swapButton");

  if (swapButton.disabled) {
    return;
  }

  if (routingMode === 'auto') {
    isSwapInProgress = true;
    if (window.currentSwapData) {
      lockedRoute = { type: 'multi', swapData: window.currentSwapData };
      lockedBestSwap = null;
    } else if (window.currentBestSwap) {
      lockedRoute = { type: 'single' };
      lockedBestSwap = window.currentBestSwap;
    }
    console.log('Route locked for swap execution:', lockedRoute?.type || 'none');
  }

  if (!userAddress) {
    swapButton.innerText = "Connecting Wallet...";
    swapButton.disabled = true;
    swapButton.classList.add("loading");

    const connected = await window.walletManager.connect();

    if (!connected) {
      notify("Please connect your wallet to swap", "error");
      updateSwapButtonState();
      return;
    }

    setTimeout(() => updateSwapButtonState(), 500);
    return;
  }

  swapButton.innerText = "Checking data...";
  swapButton.disabled = true;
  swapButton.classList.add("loading");

  if (window.walletManager && window.walletManager.provider) {
    try {
      const network = await window.walletManager.provider.getNetwork();
      if (network.chainId !== NETWORK_CONFIG.CHAIN_ID) {
        notify(`Wrong network. Please switch to ${NETWORK_CONFIG.CHAIN_NAME}`, "error");
        updateSwapButtonState();
        return;
      }
    } catch (networkError) {
      console.error("Network check failed:", networkError);
    }
  }

  if (!fromToken || !toToken) {
    notify("Please select both tokens", "error");
    updateSwapButtonState();
    return;
  }

  const amountIn = document.getElementById("fromAmount").value;
  if (!amountIn || isNaN(amountIn) || parseFloat(amountIn) <= 0) {
    notify("Enter a valid amount", "error");
    updateSwapButtonState();
    return;
  }

  if (isDataLoading) {
    notify("Price data is still loading. Please wait.", "error");
    updateSwapButtonState();
    return;
  }

  if (!hasValidSwapData) {
    notify("Cannot perform swap with invalid route or zero output", "error");
    updateSwapButtonState();
    return;
  }

  let amountInParsed;
  if (fromToken.symbol === "MON") {
    amountInParsed = ethers.utils.parseEther(amountIn);
  } else {
    amountInParsed = ethers.utils.parseUnits(amountIn, fromToken.decimals);
  }

  const deadlineInSeconds = transactionDeadline * 60;
  const deadline = Math.floor(Date.now() / 1000) + deadlineInSeconds;

  if (!isAutoSlippage && currentPriceImpact > slippageTolerance) {
    notify(`Transaction rejected: Price impact (${currentPriceImpact.toFixed(2)}%) exceeds your slippage tolerance (${slippageTolerance.toFixed(2)}%)`, "error");
    updateSwapButtonState();
    return;
  }

  if (currentPriceImpact > 15) {
    try {
      swapButton.innerText = "Waiting for confirmation...";
      await showConfirmationModal();
      console.log("Confirmation successful, proceeding with swap");
    } catch (error) {
      console.log("Swap cancelled by user:", error);
      notify("Swap cancelled", "error");
      updateSwapButtonState();
      return;
    }
  }

  swapButton.innerText = "Simulating transaction...";

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

  let bestSwap;
  try {
    bestSwap = await rateLimitedCall(() => aggregatorContract.getBestSwap(amountInParsed, path));
  } catch (error) {
    console.error("Error during initial simulation:", error);

    if (retryCount < 2) {
      console.log(`Retrying swap... (${retryCount + 1}/3)`);
      switchToNextRpc();
      return await performSwap(retryCount + 1);
    }

    notify("Simulation failed: Could not calculate best route", "error");
    updateSwapButtonState();
    return;
  }

  let slippageBps;
  if (isAutoSlippage) {
    const dynamicSlippage = Math.max(0.5, Math.min(currentPriceImpact * 1.5, 5));
    slippageBps = Math.round(dynamicSlippage * 100);
    console.log(`Auto slippage calculated: ${dynamicSlippage}% based on price impact ${currentPriceImpact}%`);
  } else {
    slippageBps = Math.round(slippageTolerance * 100);
    console.log(`Custom slippage: ${slippageTolerance}%`);
  }

  const amountOutMin = bestSwap[1].mul(10000 - slippageBps).div(10000);
  console.log(`Slippage protection: ${slippageBps/100}%, Min output: ${ethers.utils.formatUnits(amountOutMin, toToken.decimals)}`);

  if (isSimulationEnabled) {
    const simulationParams = {
      fromToken,
      toToken,
      amountInParsed,
      amountOutMin,
      path,
      deadline
    };

    const initialSimulationSuccessful = await simulateTransaction(simulationParams);

    if (!initialSimulationSuccessful) {
      notify("Initial simulation failed. Please try again with different parameters.", "error");
      updateSwapButtonState();
      return;
    }

    notify("Simulation successful! Proceeding with transaction...", "success");
  } else {
    notify("Skipping simulation - proceeding directly to transaction", "info");
  }

  try {
    let tx;
    if (fromToken.symbol === "MON" && toToken.symbol === "WMON") {
      const wmonContract = new ethers.Contract(
        defaultTokens.find(t => t.symbol === "WMON").address,
        wmonABI,
        signer
      );
      swapButton.innerText = "Sending transaction...";

      let gasLimit;
      try {
        const gasEstimate = await wmonContract.estimateGas.deposit({ value: amountInParsed });
        gasLimit = gasEstimate.mul(130).div(100);
      } catch (gasError) {
        gasLimit = ethers.BigNumber.from("100000");
      }

      tx = await rateLimitedCall(() => wmonContract.deposit({ value: amountInParsed, gasLimit }));
      await tx.wait();
      
      notify("Wrap successful!", "success");
      addTransactionToHistory(fromToken, toToken, amountIn, amountIn, tx.hash, 'confirmed', 'Wrap');
      
      updateSwapButtonState();
      if (fromToken) fetchTokenBalance(fromToken, "from");
      if (toToken) fetchTokenBalance(toToken, "to");
      return;
    } else if (fromToken.symbol === "WMON" && toToken.symbol === "MON") {
      const wmonContract = new ethers.Contract(
        defaultTokens.find(t => t.symbol === "WMON").address,
        wmonABI,
        signer
      );
      swapButton.innerText = "Sending transaction...";

      let gasLimit;
      try {
        const gasEstimate = await wmonContract.estimateGas.withdraw(amountInParsed);
        gasLimit = gasEstimate.mul(130).div(100);
      } catch (gasError) {
        gasLimit = ethers.BigNumber.from("100000");
      }

      tx = await rateLimitedCall(() => wmonContract.withdraw(amountInParsed, { gasLimit }));
      await tx.wait();
      
      notify("Unwrap successful!", "success");
      addTransactionToHistory(fromToken, toToken, amountIn, amountIn, tx.hash, 'confirmed', 'Unwrap');
      
      updateSwapButtonState();
      if (fromToken) fetchTokenBalance(fromToken, "from");
      if (toToken) fetchTokenBalance(toToken, "to");
      return;
    }

    if (fromToken.symbol !== "MON") {
      const tokenContract = new ethers.Contract(
        fromToken.address,
        [
          "function allowance(address owner, address spender) view returns (uint)",
          "function approve(address spender, uint amount) returns (bool)"
        ],
        signer
      );

      try {
        const contractAddress = (routingMode === 'multi' || (routingMode === 'auto' && window.currentSwapData)) ? MULTI_SPLIT_HOP_ADDRESS : aggregatorAddress;
        const allowance = await rateLimitedCall(() => tokenContract.allowance(userAddress, contractAddress));
        if (allowance.lt(amountInParsed)) {
          isApprovalInProgress = true;

          swapButton.innerText = "Approving token...";
          swapButton.classList.add("loading", "approving");

          let gasLimit;
          try {
            const gasEstimate = await tokenContract.estimateGas.approve(contractAddress, amountInParsed);
            gasLimit = gasEstimate.mul(130).div(100);
          } catch (gasError) {
            gasLimit = ethers.BigNumber.from("120000");
          }

          const approveTx = await rateLimitedCall(() => tokenContract.approve(contractAddress, amountInParsed, { gasLimit }));

          swapButton.innerText = "Confirming approval...";
          await approveTx.wait();

          swapButton.classList.remove("loading", "approving");
          swapButton.innerText = "Approval successful!";

          await new Promise(resolve => setTimeout(resolve, 1000));

          isApprovalInProgress = false;
        }
      } catch (approvalError) {
        console.error("Approval error:", approvalError);
        isApprovalInProgress = false;
        notify("Approval failed: " + (approvalError.message || "Unknown error"), "error");
        updateSwapButtonState();
        return;
      }
    }

    const useMultiSplit = routingMode === 'multi' || (routingMode === 'auto' && window.currentSwapData);
    const routeType = useMultiSplit ? 'Multi-Split Hops' : 'Single Router';

    if (useMultiSplit && window.currentSwapData) {
      swapButton.innerText = "Sending swap transaction...";

      const swapData = window.currentSwapData;

      let gasLimit;
      try {
        if (fromToken.symbol === "MON") {
          const gasEstimate = await multiSplitHopContract.estimateGas.execute(swapData, { value: amountInParsed });
          gasLimit = gasEstimate.mul(150).div(100);
        } else {
          const gasEstimate = await multiSplitHopContract.estimateGas.execute(swapData);
          gasLimit = gasEstimate.mul(150).div(100);
        }
      } catch (gasError) {
        console.error("Gas estimation failed, using default:", gasError);
        gasLimit = ethers.BigNumber.from("500000");
      }

      if (fromToken.symbol === "MON") {
        tx = await multiSplitHopContract.execute(swapData, { value: amountInParsed, gasLimit });
      } else {
        tx = await multiSplitHopContract.execute(swapData, { gasLimit });
      }
    } else {
      swapButton.innerText = "Sending swap transaction...";

      let gasLimit;
      try {
        if (fromToken.symbol === "MON") {
          const gasEstimate = await aggregatorContract.estimateGas.swapExactETHForTokens(
            amountOutMin, path, deadline, { value: amountInParsed }
          );
          gasLimit = gasEstimate.mul(150).div(100);
        } else if (toToken.symbol === "MON") {
          const gasEstimate = await aggregatorContract.estimateGas.swapExactTokensForETH(
            amountInParsed, amountOutMin, path, deadline
          );
          gasLimit = gasEstimate.mul(150).div(100);
        } else {
          const gasEstimate = await aggregatorContract.estimateGas.swapExactTokensForTokens(
            amountInParsed, amountOutMin, path, deadline
          );
          gasLimit = gasEstimate.mul(150).div(100);
        }
      } catch (gasError) {
        console.error("Gas estimation failed, using default:", gasError);
        gasLimit = ethers.BigNumber.from("350000");
      }

      if (fromToken.symbol === "MON") {
        tx = await aggregatorContract.swapExactETHForTokens(amountOutMin, path, deadline, { value: amountInParsed, gasLimit });
      } else if (toToken.symbol === "MON") {
        tx = await aggregatorContract.swapExactTokensForETH(amountInParsed, amountOutMin, path, deadline, { gasLimit });
      } else {
        tx = await aggregatorContract.swapExactTokensForTokens(amountInParsed, amountOutMin, path, deadline, { gasLimit });
      }
    }

    swapButton.innerText = "Waiting for confirmation...";
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      const estimatedOutput = document.getElementById("estimatedOutput").innerText;
      notify("Swap successful!", "success");
      addTransactionToHistory(fromToken, toToken, amountIn, estimatedOutput, tx.hash, 'confirmed', routeType);
    } else {
      notify("Swap failed - transaction reverted", "error");
      addTransactionToHistory(fromToken, toToken, amountIn, "0", tx.hash, 'failed', routeType);
    }

  } catch (error) {
    console.error("Swap error:", error);
    
    let errorMessage = "Swap failed";
    if (error.code === 4001 || error.code === "ACTION_REJECTED") {
      errorMessage = "Transaction rejected by user";
    } else if (error.message) {
      errorMessage = error.message.substring(0, 100);
    }
    
    notify(errorMessage, "error");
  } finally {
    isSwapInProgress = false;
    isApprovalInProgress = false;
    lockedRoute = null;
    lockedBestSwap = null;
    
    updateSwapButtonState();
    
    if (fromToken) fetchTokenBalance(fromToken, "from");
    if (toToken) fetchTokenBalance(toToken, "to");
  }
}
