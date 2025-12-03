function showLiquidityConfirmationModal(amountAStr, amountBStr) {
  return new Promise((resolve, reject) => {
    const state = window.lpState;
    const modal = document.getElementById("liquidityConfirmationModal");
    
    document.getElementById("confirmTokenALogo").src = state.tokenA.logo && state.tokenA.logo !== "?" ? state.tokenA.logo : window.unknownLogo;
    document.getElementById("confirmTokenBLogo").src = state.tokenB.logo && state.tokenB.logo !== "?" ? state.tokenB.logo : window.unknownLogo;
    document.getElementById("confirmTokenAAmount").innerText = parseFloat(amountAStr).toFixed(6);
    document.getElementById("confirmTokenBAmount").innerText = parseFloat(amountBStr).toFixed(6);
    document.getElementById("confirmTokenASymbol").innerText = state.tokenA.symbol;
    document.getElementById("confirmTokenBSymbol").innerText = state.tokenB.symbol;
    document.getElementById("confirmDexName").innerText = state.selectedDex.name;
    document.getElementById("confirmPairPrice").innerText = document.getElementById("pairPrice").innerText;
    document.getElementById("confirmLpTokens").innerText = document.getElementById("expectedLpTokens").innerText;
    document.getElementById("confirmPoolShare").innerText = document.getElementById("poolSharePercent").innerText;
    
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    
    const confirmBtn = document.getElementById("confirmLiquidityBtn");
    const cancelBtn = document.getElementById("cancelLiquidityBtn");
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newConfirmBtn.addEventListener("click", () => {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
      resolve(true);
    });
    
    newCancelBtn.addEventListener("click", () => {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
      reject(new Error("User cancelled"));
    });
    
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        reject(new Error("User cancelled"));
      }
    });
  });
}

function hideLiquidityConfirmationModal() {
  const modal = document.getElementById("liquidityConfirmationModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

window.showLiquidityConfirmationModal = showLiquidityConfirmationModal;
window.hideLiquidityConfirmationModal = hideLiquidityConfirmationModal;
