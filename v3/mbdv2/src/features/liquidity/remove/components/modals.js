function showRemoveLiquidityConfirmationModal(lpAmount, expectedA, expectedB) {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById("removeLiquidityConfirmationModal");
    
    document.getElementById("confirmRemoveLpAmount").innerText = parseFloat(lpAmount).toFixed(6);
    document.getElementById("confirmTokenALogo").src = tokenA.logo && tokenA.logo !== "?" ? tokenA.logo : "https://monbridgedex.xyz/unknown.png";
    document.getElementById("confirmTokenBLogo").src = tokenB.logo && tokenB.logo !== "?" ? tokenB.logo : "https://monbridgedex.xyz/unknown.png";
    document.getElementById("confirmTokenAAmount").innerText = parseFloat(expectedA).toFixed(6);
    document.getElementById("confirmTokenBAmount").innerText = parseFloat(expectedB).toFixed(6);
    document.getElementById("confirmTokenASymbol").innerText = tokenA.symbol;
    document.getElementById("confirmTokenBSymbol").innerText = tokenB.symbol;
    
    const routerName = DEX_ROUTERS.find(r => r.address === document.getElementById("routerSelect").value)?.name || "Unknown";
    document.getElementById("confirmRemoveDexName").innerText = routerName;
    
    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    
    const confirmBtn = document.getElementById("confirmRemoveLiquidityBtn");
    const cancelBtn = document.getElementById("cancelRemoveLiquidityBtn");
    
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
