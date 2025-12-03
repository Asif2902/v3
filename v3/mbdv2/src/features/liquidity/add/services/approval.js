async function checkRequiredApprovals() {
  const state = window.lpState;
  
  if (!state.tokenA || !state.tokenB || !state.selectedDex) return null;

  const amountAStr = document.getElementById("tokenAAmount").value;
  const amountBStr = document.getElementById("tokenBAmount").value;

  if (!amountAStr || !amountBStr) return null;

  let amountADesired, amountBDesired;
  try {
    amountADesired = state.tokenA.symbol === "MON"
      ? ethers.utils.parseEther(amountAStr)
      : ethers.utils.parseUnits(amountAStr, state.tokenA.decimals);
    amountBDesired = state.tokenB.symbol === "MON"
      ? ethers.utils.parseEther(amountBStr)
      : ethers.utils.parseUnits(amountBStr, state.tokenB.decimals);
  } catch (err) {
    return null;
  }

  const routerAddress = state.selectedDex.address;

  if (state.tokenA.symbol !== "MON") {
    const tokenAContract = new ethers.Contract(state.tokenA.address, ERC20_ABI, state.provider);
    const allowanceA = await tokenAContract.allowance(state.userAddress, routerAddress);
    if (allowanceA.lt(amountADesired)) {
      return { type: "approve", token: state.tokenA, amount: amountADesired };
    }
  }

  if (state.tokenB.symbol !== "MON") {
    const tokenBContract = new ethers.Contract(state.tokenB.address, ERC20_ABI, state.provider);
    const allowanceB = await tokenBContract.allowance(state.userAddress, routerAddress);
    if (allowanceB.lt(amountBDesired)) {
      return { type: "approve", token: state.tokenB, amount: amountBDesired };
    }
  }

  return { type: "addLiquidity" };
}

async function approveIfNeeded(token, amount, routerAddress, useExactApproval = true) {
  const state = window.lpState;
  
  if (token.symbol === "MON") return true;

  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, state.signer);
  
  let approvalAmount;
  if (useExactApproval && amount) {
    approvalAmount = amount.mul(110).div(100);
    console.log(`Using exact approval with 10% buffer for ${token.symbol}`);
  } else {
    approvalAmount = ethers.constants.MaxUint256;
    console.log(`Using unlimited approval for ${token.symbol} (user requested)`);
  }

  try {
    const tx = await tokenContract.approve(routerAddress, approvalAmount);
    const approvalType = useExactApproval ? "exact amount" : "unlimited";
    lpNotify(`Approving ${token.symbol} (${approvalType})...`, "info");
    await tx.wait();
    lpNotify(`${token.symbol} approved successfully!`, "success");
    return true;
  } catch (error) {
    console.error("Approval failed:", error);
    throw error;
  }
}

window.checkRequiredApprovals = checkRequiredApprovals;
window.approveIfNeeded = approveIfNeeded;
