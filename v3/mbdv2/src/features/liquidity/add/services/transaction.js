async function executeAddLiquidity() {
  const state = window.lpState;
  const addLiquidityButton = document.getElementById("addLiquidityButton");

  if (!state.tokenA || !state.tokenB) {
    lpNotify("Please select both tokens", "error");
    return;
  }

  let routerAddress = state.selectedDex ? state.selectedDex.address : document.getElementById("dexDropdown").value;
  if (!routerAddress) {
    lpNotify("Please select a router", "error");
    return;
  }

  if (addLiquidityButton.disabled || 
      addLiquidityButton.classList.contains("loading") || 
      addLiquidityButton.innerText === "Transaction would fail") {
    return;
  }

  const routerContract = new ethers.Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, state.signer);
  const deadline = Math.floor(Date.now() / 1000) + 1800;
  
  const amountAStr = document.getElementById("tokenAAmount").value;
  const amountBStr = document.getElementById("tokenBAmount").value;
  
  let amountADesired, amountBDesired;

  try {
    amountADesired = state.tokenA.symbol === "MON"
      ? ethers.utils.parseEther(amountAStr)
      : ethers.utils.parseUnits(amountAStr, state.tokenA.decimals);
    amountBDesired = state.tokenB.symbol === "MON"
      ? ethers.utils.parseEther(amountBStr)
      : ethers.utils.parseUnits(amountBStr, state.tokenB.decimals);
  } catch (err) {
    lpNotify("Invalid input amounts", "error");
    return;
  }

  const slippageBps = Math.round(state.slippageTolerance * 100);
  const amountAMin = amountADesired.mul(10000 - slippageBps).div(10000);
  const amountBMin = amountBDesired.mul(10000 - slippageBps).div(10000);
  console.log(`Add liquidity slippage: ${state.slippageTolerance}%, Min A: ${ethers.utils.formatUnits(amountAMin, state.tokenA.decimals)}, Min B: ${ethers.utils.formatUnits(amountBMin, state.tokenB.decimals)}`);

  try {
    const nextAction = await checkRequiredApprovals();

    if (!nextAction) {
      lpNotify("Please enter valid amounts for both tokens", "error");
      return;
    }

    if (nextAction.type === "approve") {
      addLiquidityButton.innerText = `Approving ${nextAction.token.symbol}...`;
      addLiquidityButton.classList.add("loading");
      
      try {
        await approveIfNeeded(
          nextAction.token, 
          nextAction.token.symbol === state.tokenA.symbol ? amountADesired : amountBDesired, 
          routerAddress
        );
        lpNotify(`${nextAction.token.symbol} approved successfully! Preparing to add liquidity...`, "success");
        await updateAddLiquidityButtonText(true);
      } catch (approvalError) {
        console.error("Approval failed:", approvalError);
        lpNotify(`Failed to approve ${nextAction.token.symbol}: ${approvalError.message}`, "error");
        addLiquidityButton.classList.remove("loading");

        state.simulationAttempts = 0;
        if (state.simulationTimeoutId) clearTimeout(state.simulationTimeoutId);

        setTimeout(() => {
          updateAddLiquidityButtonText(true);
        }, 1000);
        return;
      }
    } else if (nextAction.type === "addLiquidity") {
      try {
        await showLiquidityConfirmationModal(amountAStr, amountBStr);
      } catch (error) {
        lpNotify("Add liquidity cancelled", "info");
        return;
      }

      addLiquidityButton.innerText = "Confirming transaction...";
      addLiquidityButton.classList.add("loading");
      lpNotify("Confirming transaction...", "info");

      let tx;
      try {
        if (state.tokenA.symbol === "MON" || state.tokenB.symbol === "MON") {
          if (state.tokenA.symbol === "MON") {
            tx = await routerContract.addLiquidityETH(
              state.tokenB.address,
              amountBDesired,
              amountBMin,
              amountAMin,
              state.userAddress,
              deadline,
              { value: amountADesired }
            );
          } else {
            tx = await routerContract.addLiquidityETH(
              state.tokenA.address,
              amountADesired,
              amountAMin,
              amountBMin,
              state.userAddress,
              deadline,
              { value: amountBDesired }
            );
          }
        } else {
          tx = await routerContract.addLiquidity(
            state.tokenA.address,
            state.tokenB.address,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            state.userAddress,
            deadline
          );
        }

        lpNotify("Transaction submitted. Waiting for confirmation...", "info");

        try {
          const receipt = await tx.wait();

          addLiquidityButton.innerText = "Add Liquidity";
          addLiquidityButton.classList.remove("loading");

          document.getElementById("tokenAAmount").value = "";
          document.getElementById("tokenBAmount").value = "";

          state.userSetCustomRatio = false;

          addLpTransactionToHistory(state.tokenA, state.tokenB, amountAStr, amountBStr, tx.hash, 'confirmed', state.selectedDex.name);

          lpNotify(`Liquidity added successfully! <a href="${NETWORK_CONFIG.CHAIN_EXPLORER}/tx/${tx.hash}" target="_blank">View on Explorer</a>`, "success");

          setTimeout(() => {
            manualRefresh();
          }, 1000);
        } catch (txError) {
          console.error("Transaction failed:", txError);
          addLiquidityButton.innerText = "Transaction Failed";
          addLiquidityButton.classList.remove("loading");

          if (tx && tx.hash) {
            addLpTransactionToHistory(state.tokenA, state.tokenB, amountAStr, amountBStr, tx.hash, 'failed', state.selectedDex.name);
          }

          setTimeout(() => {
            state.simulationAttempts = 0;
            checkLiquidityRatio(true);
            updateAddLiquidityButtonText(true);
          }, 2000);
        }
      } catch (error) {
        console.error("Error during liquidity addition:", error);
        addLiquidityButton.classList.remove("loading");

        if (error.code === 4001) {
          lpNotify("Transaction rejected by user", "error");
          addLiquidityButton.innerText = "Add Liquidity";
        } else if (error.message.includes("insufficient allowance")) {
          lpNotify("Insufficient token allowance. Please try again.", "error");
          addLiquidityButton.innerText = "Approval Required";
        } else if (error.message.includes("user rejected")) {
          lpNotify("Transaction cancelled by user", "info");
          addLiquidityButton.innerText = "Add Liquidity";
        } else {
          lpNotify("Transaction failed: " + error.message, "error");
          addLiquidityButton.innerText = "Transaction Failed";
        }

        state.simulationAttempts = 0;
        if (state.simulationTimeoutId) clearTimeout(state.simulationTimeoutId);

        setTimeout(() => {
          checkLiquidityRatio(true);
          updateAddLiquidityButtonText(true);
          fetchLpTokenBalance(state.tokenA, "A", true);
          fetchLpTokenBalance(state.tokenB, "B", true);
        }, 2000);
      }
    }
  } catch (error) {
    console.error("Error during liquidity addition:", error);
    addLiquidityButton.classList.remove("loading");

    if (error.code === 4001) {
      lpNotify("Transaction rejected by user", "error");
      addLiquidityButton.innerText = "Add Liquidity";
    } else if (error.message.includes("insufficient allowance")) {
      lpNotify("Insufficient token allowance. Please try again.", "error");
      addLiquidityButton.innerText = "Approval Required";
    } else if (error.message.includes("user rejected")) {
      lpNotify("Transaction cancelled by user", "info");
      addLiquidityButton.innerText = "Add Liquidity";
    } else {
      lpNotify("Transaction failed: " + error.message, "error");
      addLiquidityButton.innerText = "Transaction Failed";
    }

    state.simulationAttempts = 0;
    if (state.simulationTimeoutId) clearTimeout(state.simulationTimeoutId);

    setTimeout(() => {
      checkLiquidityRatio(true);
      updateAddLiquidityButtonText(true);
      fetchLpTokenBalance(state.tokenA, "A", true);
      fetchLpTokenBalance(state.tokenB, "B", true);
    }, 2000);
  }
}

async function confirmAndAddLiquidity() {
  const state = window.lpState;
  const addLiquidityButton = document.getElementById("addLiquidityButton");
  const amountAStr = document.getElementById("tokenAAmount").value;
  const amountBStr = document.getElementById("tokenBAmount").value;

  if (!state.tokenA || !state.tokenB) {
    lpNotify("Please select both tokens", "error");
    return;
  }

  const routerAddress = state.selectedDex ? state.selectedDex.address : document.getElementById("dexDropdown").value;
  if (!routerAddress) {
    lpNotify("Please select a router", "error");
    return;
  }

  if (addLiquidityButton.disabled || addLiquidityButton.classList.contains("loading") || addLiquidityButton.innerText === "Transaction would fail") {
    return;
  }

  addLiquidityButton.innerText = "Confirming transaction...";
  addLiquidityButton.classList.add("loading");
  lpNotify("Confirming transaction...", "info");

  let amountADesired, amountBDesired;
  try {
    amountADesired = state.tokenA.symbol === "MON"
      ? ethers.utils.parseEther(amountAStr)
      : ethers.utils.parseUnits(amountAStr, state.tokenA.decimals);
    amountBDesired = state.tokenB.symbol === "MON"
      ? ethers.utils.parseEther(amountBStr)
      : ethers.utils.parseUnits(amountBStr, state.tokenB.decimals);
  } catch (err) {
    lpNotify("Invalid input amounts", "error");
    addLiquidityButton.innerText = "Add Liquidity";
    addLiquidityButton.classList.remove("loading");
    return;
  }

  try {
    const routerContract = new ethers.Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, state.signer);
    const deadline = Math.floor(Date.now() / 1000) + 1800;
    const slippageBps = Math.round(state.slippageTolerance * 100);
    const amountAMin = amountADesired.mul(10000 - slippageBps).div(10000);
    const amountBMin = amountBDesired.mul(10000 - slippageBps).div(10000);
    console.log(`Confirm add liquidity slippage: ${state.slippageTolerance}%`);

    let tx;
    if (state.tokenA.symbol === "MON" || state.tokenB.symbol === "MON") {
      if (state.tokenA.symbol === "MON") {
        tx = await routerContract.addLiquidityETH(
          state.tokenB.address,
          amountBDesired,
          amountBMin,
          amountAMin,
          state.userAddress,
          deadline,
          { value: amountADesired }
        );
      } else {
        tx = await routerContract.addLiquidityETH(
          state.tokenA.address,
          amountADesired,
          amountAMin,
          amountBMin,
          state.userAddress,
          deadline,
          { value: amountBDesired }
        );
      }
    } else {
      tx = await routerContract.addLiquidity(
        state.tokenA.address,
        state.tokenB.address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        state.userAddress,
        deadline
      );
    }

    lpNotify("Transaction submitted. Waiting for confirmation...", "info");

    try {
      const receipt = await tx.wait();

      addLiquidityButton.innerText = "Add Liquidity";
      addLiquidityButton.classList.remove("loading");

      document.getElementById("tokenAAmount").value = "";
      document.getElementById("tokenBAmount").value = "";

      state.userSetCustomRatio = false;

      addLpTransactionToHistory(state.tokenA, state.tokenB, amountAStr, amountBStr, tx.hash, 'confirmed', state.selectedDex.name);

      lpNotify(`Liquidity added successfully! <a href="${NETWORK_CONFIG.CHAIN_EXPLORER}/tx/${tx.hash}" target="_blank">View on Explorer</a>`, "success");

      setTimeout(() => {
        manualRefresh();
      }, 1000);
    } catch (txError) {
      console.error("Transaction failed:", txError);
      addLiquidityButton.innerText = "Transaction Failed";
      addLiquidityButton.classList.remove("loading");

      if (tx && tx.hash) {
        addLpTransactionToHistory(state.tokenA, state.tokenB, amountAStr, amountBStr, tx.hash, 'failed', state.selectedDex.name);
      }

      setTimeout(() => {
        state.simulationAttempts = 0;
        checkLiquidityRatio(true);
        updateAddLiquidityButtonText(true);
      }, 2000);
    }
  } catch (error) {
    console.error("Error during liquidity addition:", error);
    addLiquidityButton.classList.remove("loading");

    if (error.code === 4001) {
      lpNotify("Transaction rejected by user", "error");
      addLiquidityButton.innerText = "Add Liquidity";
    } else if (error.message.includes("insufficient allowance")) {
      lpNotify("Insufficient token allowance. Please try again.", "error");
      addLiquidityButton.innerText = "Approval Required";
    } else if (error.message.includes("user rejected")) {
      lpNotify("Transaction cancelled by user", "info");
      addLiquidityButton.innerText = "Add Liquidity";
    } else {
      lpNotify("Transaction failed: " + error.message, "error");
      addLiquidityButton.innerText = "Transaction Failed";
    }

    state.simulationAttempts = 0;
    if (state.simulationTimeoutId) clearTimeout(state.simulationTimeoutId);

    setTimeout(() => {
      checkLiquidityRatio(true);
      updateAddLiquidityButtonText(true);
      fetchLpTokenBalance(state.tokenA, "A", true);
      fetchLpTokenBalance(state.tokenB, "B", true);
    }, 2000);
  }
}

window.executeAddLiquidity = executeAddLiquidity;
window.confirmAndAddLiquidity = confirmAndAddLiquidity;
