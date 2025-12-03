function populateRouterDropdown() {
  const routerSelect = document.getElementById('routerSelect');
  if (routerSelect && typeof DEX_ROUTERS !== 'undefined') {
    routerSelect.innerHTML = '';
    DEX_ROUTERS.forEach(router => {
      const option = document.createElement('option');
      option.value = router.address;
      option.textContent = router.name;
      routerSelect.appendChild(option);
    });
  }
}

function initializeButtonAnimations() {
  const removeLiquidityButton = document.getElementById("removeLiquidityButton");
  if (removeLiquidityButton) {
    removeLiquidityButton.addEventListener("mouseover", function() {
      const hoverSpan = this.querySelector("span:last-child");
      if (hoverSpan) hoverSpan.style.opacity = "1";
    });
    removeLiquidityButton.addEventListener("mouseout", function() {
      const hoverSpan = this.querySelector("span:last-child");
      if (hoverSpan) hoverSpan.style.opacity = "0";
    });
  }
}

function initializeRemoveLpTokenModals() {
  setTimeout(() => {
    if (typeof initializeTokenModals === 'function' && typeof importToken === 'function') {
      window.importToken = importToken;

      initializeTokenModals({
        tokens: (typeof getAllTokens === 'function' ? getAllTokens() : null) || [...defaultTokens, ...removeLpImportedTokens],
        defaultTokens: (defaultTokens || []).slice(0, 5),
        onSelectTokenA: function(token) {
          if (typeof onSelectTokenA === 'function') {
            onSelectTokenA(token);
          }
        },
        onSelectTokenB: function(token) {
          if (typeof onSelectTokenB === 'function') {
            onSelectTokenB(token);
          }
        },
        provider: provider,
        userAddress: userAddress
      });
      console.log('RemoveLp token modals initialized');
    }
  }, 500);
}

function initializeRemoveLpEventListeners() {
  document.getElementById("lpAmount").addEventListener("input", debounce(updateEstimatedOutput, 300));
  
  document.getElementById("lpMaxText").addEventListener("click", () => {
    if (!window.lpBalanceRaw) {
      notify("LP balance not available", "error");
      return;
    }
    const maxRemoval = window.lpBalanceRaw.mul("10000000000").div("10000000000");
    document.getElementById("lpAmount").value = ethers.utils.formatUnits(maxRemoval, 18);
    updateEstimatedOutput();
  });
  
  document.getElementById("routerSelect").addEventListener("change", () => {
    if (tokenA && tokenB) updateLPInfo();
  });
  
  document.getElementById("removeLiquidityButton").addEventListener("click", executeRemoveLiquidity);
}

document.addEventListener('DOMContentLoaded', function() {
  initializeRemoveLPWalletIntegration();
  populateRouterDropdown();
  initializeButtonAnimations();
  initializeRemoveLpTokenModals();
  setupRemoveLpNotificationSystem();
  initializeRemoveLpEventListeners();
  
  if (window.walletManager) {
    window.walletManager.maintainConnectionState();
  }
});
