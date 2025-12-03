async function simulateLiquidityAddition() {
  const state = window.lpState;
  
  if (!state.tokenA || !state.tokenB || !state.selectedDex || !state.signer) {
    return { success: false, error: "Missing required data" };
  }

  const amountAStr = document.getElementById("tokenAAmount").value;
  const amountBStr = document.getElementById("tokenBAmount").value;

  if (!amountAStr || !amountBStr || parseFloat(amountAStr) <= 0 || parseFloat(amountBStr) <= 0) {
    return { success: false, error: "Invalid amounts" };
  }

  let amountADesired, amountBDesired;
  try {
    amountADesired = state.tokenA.symbol === "MON"
      ? ethers.utils.parseEther(amountAStr)
      : ethers.utils.parseUnits(amountAStr, state.tokenA.decimals);
    amountBDesired = state.tokenB.symbol === "MON"
      ? ethers.utils.parseEther(amountBStr)
      : ethers.utils.parseUnits(amountBStr, state.tokenB.decimals);
  } catch (err) {
    return { success: false, error: "Invalid input amounts" };
  }

  const routerContract = new ethers.Contract(state.selectedDex.address, UNISWAP_V2_ROUTER_ABI, state.provider);
  const deadline = Math.floor(Date.now() / 1000) + 1800;
  const amountAMin = amountADesired.mul(95).div(100);
  const amountBMin = amountBDesired.mul(95).div(100);

  try {
    let callData;
    if (state.tokenA.symbol === "MON" || state.tokenB.symbol === "MON") {
      if (state.tokenA.symbol === "MON") {
        callData = routerContract.interface.encodeFunctionData("addLiquidityETH", [
          state.tokenB.address,
          amountBDesired,
          amountBMin,
          amountAMin,
          state.userAddress,
          deadline
        ]);
      } else {
        callData = routerContract.interface.encodeFunctionData("addLiquidityETH", [
          state.tokenA.address,
          amountADesired,
          amountAMin,
          amountBMin,
          state.userAddress,
          deadline
        ]);
      }

      await state.provider.call({
        to: state.selectedDex.address,
        data: callData,
        from: state.userAddress,
        value: state.tokenA.symbol === "MON" ? amountADesired : amountBDesired
      });
    } else {
      callData = routerContract.interface.encodeFunctionData("addLiquidity", [
        state.tokenA.address,
        state.tokenB.address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        state.userAddress,
        deadline
      ]);

      await state.provider.call({
        to: state.selectedDex.address,
        data: callData,
        from: state.userAddress
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Simulation failed:", error);
    return { 
      success: false, 
      error: error.message || "Transaction simulation failed" 
    };
  }
}

async function updateAddLiquidityButtonText(forceCheck = false) {
  const state = window.lpState;
  const addLiquidityButton = document.getElementById("addLiquidityButton");

  if (!state.userAddress) {
    addLiquidityButton.innerText = "Connect Wallet";
    addLiquidityButton.disabled = true;
    addLiquidityButton.classList.remove("loading");
    return;
  }

  if (!state.tokenA || !state.tokenB) {
    addLiquidityButton.innerText = "Select Tokens";
    addLiquidityButton.disabled = true;
    addLiquidityButton.classList.remove("loading");
    return;
  }

  if (!state.selectedDex) {
    addLiquidityButton.innerText = "Select DEX";
    addLiquidityButton.disabled = true;
    addLiquidityButton.classList.remove("loading");
    return;
  }

  const amountAStr = document.getElementById("tokenAAmount").value;
  const amountBStr = document.getElementById("tokenBAmount").value;

  if (!amountAStr || !amountBStr || parseFloat(amountAStr) <= 0 || parseFloat(amountBStr) <= 0) {
    addLiquidityButton.innerText = "Enter Amounts";
    addLiquidityButton.disabled = true;
    addLiquidityButton.classList.remove("loading");
    return;
  }

  const amountA = parseFloat(amountAStr);
  const amountB = parseFloat(amountBStr);

  if (amountA > state.tokenABalance) {
    addLiquidityButton.innerText = `Insufficient ${state.tokenA.symbol} Balance`;
    addLiquidityButton.disabled = true;
    addLiquidityButton.classList.remove("loading");
    return;
  }

  if (amountB > state.tokenBBalance) {
    addLiquidityButton.innerText = `Insufficient ${state.tokenB.symbol} Balance`;
    addLiquidityButton.disabled = true;
    addLiquidityButton.classList.remove("loading");
    return;
  }

  try {
    const nextAction = await checkRequiredApprovals();
    
    if (nextAction && nextAction.type === "approve") {
      addLiquidityButton.innerText = `Approve ${nextAction.token.symbol}`;
      addLiquidityButton.disabled = false;
      addLiquidityButton.classList.remove("loading");
      return;
    }

    if (forceCheck || state.simulationAttempts < 3) {
      addLiquidityButton.classList.add("loading");
      addLiquidityButton.innerText = "Verifying transaction...";

      const simulationResult = await simulateLiquidityAddition();
      state.lastSimulationTime = Date.now();
      state.simulationAttempts++;

      if (simulationResult.success) {
        addLiquidityButton.innerText = "Add Liquidity";
        addLiquidityButton.disabled = false;
        addLiquidityButton.classList.remove("loading");
      } else {
        addLiquidityButton.innerText = "Transaction would fail";
        addLiquidityButton.disabled = true;
        addLiquidityButton.classList.remove("loading");
        console.error("Simulation error:", simulationResult.error);
      }
    } else {
      addLiquidityButton.innerText = "Add Liquidity";
      addLiquidityButton.disabled = false;
      addLiquidityButton.classList.remove("loading");
    }
  } catch (error) {
    console.error("Error updating button:", error);
    addLiquidityButton.innerText = "Add Liquidity";
    addLiquidityButton.disabled = false;
    addLiquidityButton.classList.remove("loading");
  }
}

window.simulateLiquidityAddition = simulateLiquidityAddition;
window.updateAddLiquidityButtonText = updateAddLiquidityButtonText;
