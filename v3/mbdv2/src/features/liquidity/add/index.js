document.addEventListener('DOMContentLoaded', function() {
  const state = window.lpState;
  
  if (!state.provider) {
    state.provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.PRIMARY_RPC);
  }
  
  populateManualDexDropdown();
  initDexDropdownListeners();
  initInputListeners();
  initializeLPWalletIntegration();
  setupAddLpNotificationSystem();
  setupPeriodicDataRefresh();
  
  document.getElementById("addLiquidityButton").addEventListener("click", executeAddLiquidity);
  
  const tokenABalance = document.getElementById("tokenABalance");
  const tokenBBalance = document.getElementById("tokenBBalance");
  
  if (tokenABalance) {
    tokenABalance.addEventListener('click', function() {
      const fullBalance = this.getAttribute('data-full-balance');
      if (fullBalance && window.innerWidth < 768) {
        lpNotify(`Token A Balance: ${fullBalance}`, "info");
      }
    });
  }
  
  if (tokenBBalance) {
    tokenBBalance.addEventListener('click', function() {
      const fullBalance = this.getAttribute('data-full-balance');
      if (fullBalance && window.innerWidth < 768) {
        lpNotify(`Token B Balance: ${fullBalance}`, "info");
      }
    });
  }
});
