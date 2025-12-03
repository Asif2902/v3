async function approveLPIfNeeded(lpToken, amount, routerAddress) {
  const lpContract = new ethers.Contract(lpToken, [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)"
  ], signer);
  const currentAllowance = await lpContract.allowance(userAddress, routerAddress);
  if (ethers.BigNumber.from(currentAllowance).lt(amount)) {
    notify("Approving LP tokens...", "info");
    const approveTx = await rateLimitedCall(() => lpContract.approve(routerAddress, amount));
    await approveTx.wait();
    notify("LP tokens approved.", "success");
  }
}

async function executeRemoveLiquidity() {
  if (!tokenA || !tokenB) {
    notify("Please select both tokens", "error", true);
    return;
  }
  if (!window.lpTokenAddress) {
    notify("LP info not available", "error", true);
    return;
  }
  const routerAddress = document.getElementById("routerSelect").value;
  const routerContract = new ethers.Contract(routerAddress, uniswapV2RouterABI, signer);
  const deadline = Math.floor(Date.now() / 1000) + 1800;

  let liquidity;
  try {
    liquidity = ethers.utils.parseUnits(document.getElementById("lpAmount").value, 18);
  } catch (err) {
    notify("Invalid LP amount", "error", true);
    return;
  }
  if (liquidity.lte(0)) {
    notify("LP amount must be greater than zero", "error", true);
    return;
  }

  let expectedA, expectedB;
  try {
    const computed = await computeMinAmounts(liquidity);
    expectedA = computed.expectedA || computed.minA;
    expectedB = computed.expectedB || computed.minB;
  } catch (err) {
    console.error("Error computing expected amounts:", err);
    notify("Failed to compute expected token amounts", "error", true);
    return;
  }

  const slippageTolerance = window.getRemoveLpSlippage ? window.getRemoveLpSlippage() : 2.0;
  const slippageBps = Math.round(slippageTolerance * 100);
  
  const minAmounts = {
    minA: expectedA.mul(10000 - slippageBps).div(10000),
    minB: expectedB.mul(10000 - slippageBps).div(10000)
  };
  
  console.log(`Remove liquidity slippage: ${slippageTolerance}%, Min A: ${ethers.utils.formatUnits(minAmounts.minA, tokenA.decimals)}, Min B: ${ethers.utils.formatUnits(minAmounts.minB, tokenB.decimals)}`);

  try {
    await approveLPIfNeeded(window.lpTokenAddress, liquidity, routerAddress);
    notify("LP tokens approved", "success", true);
  } catch (err) {
    console.error("Approval error:", err);
    notify("LP token approval failed", "error", true);
    return;
  }

  const formattedExpectedA = ethers.utils.formatUnits(expectedA, tokenA.decimals);
  const formattedExpectedB = ethers.utils.formatUnits(expectedB, tokenB.decimals);

  try {
    await showRemoveLiquidityConfirmationModal(
      document.getElementById("lpAmount").value,
      formattedExpectedA,
      formattedExpectedB
    );
  } catch (error) {
    notify("Remove liquidity cancelled", "info", true);
    return;
  }

  const tokenAIsFeeOnTransfer = await isFeeOnTransferToken(tokenA.address);
  const tokenBIsFeeOnTransfer = await isFeeOnTransferToken(tokenB.address);
  const hasFeeOnTransfer = tokenAIsFeeOnTransfer || tokenBIsFeeOnTransfer;

  const feeOnTransferSlippageBps = Math.round((slippageTolerance + 15) * 100);
  
  const feeAdjustedMinA = tokenAIsFeeOnTransfer 
    ? expectedA.mul(10000 - feeOnTransferSlippageBps).div(10000) 
    : minAmounts.minA;
  const feeAdjustedMinB = tokenBIsFeeOnTransfer 
    ? expectedB.mul(10000 - feeOnTransferSlippageBps).div(10000) 
    : minAmounts.minB;

  const dexName = DEX_ROUTERS.find(r => r.address === routerAddress)?.name || "Unknown DEX";
  const lpAmountInput = document.getElementById("lpAmount").value;

  let tx;
  try {
    if (tokenA.symbol === "MON" && tokenB.symbol !== "MON") {
      if (tokenBIsFeeOnTransfer) {
        tx = await routerContract.removeLiquidityETHSupportingFeeOnTransferTokens(
          tokenB.address,
          liquidity,
          feeAdjustedMinB,
          minAmounts.minA,
          userAddress,
          deadline
        );
        notify(`Using fee-on-transfer removal (${slippageTolerance + 15}% slippage)`, "info", true);
      } else {
        tx = await routerContract.removeLiquidityETH(
          tokenB.address,
          liquidity,
          minAmounts.minB,
          minAmounts.minA,
          userAddress,
          deadline
        );
      }
    } else if (tokenB.symbol === "MON" && tokenA.symbol !== "MON") {
      if (tokenAIsFeeOnTransfer) {
        tx = await routerContract.removeLiquidityETHSupportingFeeOnTransferTokens(
          tokenA.address,
          liquidity,
          feeAdjustedMinA,
          minAmounts.minB,
          userAddress,
          deadline
        );
        notify(`Using fee-on-transfer removal (${slippageTolerance + 15}% slippage)`, "info", true);
      } else {
        tx = await routerContract.removeLiquidityETH(
          tokenA.address,
          liquidity,
          minAmounts.minA,
          minAmounts.minB,
          userAddress,
          deadline
        );
      }
    } else {
      if (hasFeeOnTransfer) {
        tx = await routerContract.removeLiquidity(
          tokenA.address,
          tokenB.address,
          liquidity,
          feeAdjustedMinA,
          feeAdjustedMinB,
          userAddress,
          deadline
        );
        notify("Adjusted for fee-on-transfer tokens", "info", true);
      } else {
        tx = await routerContract.removeLiquidity(
          tokenA.address,
          tokenB.address,
          liquidity,
          minAmounts.minA,
          minAmounts.minB,
          userAddress,
          deadline
        );
      }
    }
    
    notify("Transaction submitted. Waiting for confirmation...", "info", true);
    await tx.wait();
    
    addRemoveLpTransactionToHistory(tokenA, tokenB, lpAmountInput, formattedExpectedA, formattedExpectedB, tx.hash, 'confirmed', dexName);
    notify(`Liquidity removed successfully! <a href="${CHAIN_EXPLORER}/tx/${tx.hash}" target="_blank">View on Explorer</a>`, "success", true);
    
    if (tokenA) fetchTokenBalance(tokenA, "A");
    if (tokenB) fetchTokenBalance(tokenB, "B");
    updateLPInfo();
    
    document.getElementById("lpAmount").value = "";
    document.getElementById("estimatedOutput").innerHTML = "";
    
  } catch (err) {
    console.error("Error removing liquidity:", err);
    
    let errorMessage = "Failed to remove liquidity";
    if (err.code === 4001 || err.code === "ACTION_REJECTED") {
      errorMessage = "Transaction rejected by user";
    } else if (err.message && err.message.includes("insufficient")) {
      errorMessage = "Insufficient balance or slippage too low";
    } else if (err.message) {
      errorMessage = err.message.substring(0, 100);
    }
    
    notify(errorMessage, "error", true);
    
    if (tx && tx.hash) {
      addRemoveLpTransactionToHistory(tokenA, tokenB, lpAmountInput, formattedExpectedA, formattedExpectedB, tx.hash, 'failed', dexName);
    }
  }
}
