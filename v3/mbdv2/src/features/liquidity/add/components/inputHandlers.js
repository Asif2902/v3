function resetSimulationState() {
  const state = window.lpState;
  state.simulationAttempts = 0;
  if (state.simulationTimeoutId) {
    clearTimeout(state.simulationTimeoutId);
    state.simulationTimeoutId = null;
  }
}

function calculateCounterValue(inputId) {
  const state = window.lpState;
  if (state.updatingAmounts || !state.currentLiquidityRatio || state.currentLiquidityRatio <= 0) return;

  try {
    state.updatingAmounts = true;
    const aInput = document.getElementById("tokenAAmount");
    const bInput = document.getElementById("tokenBAmount");

    if (inputId === "tokenAAmount" && aInput.value) {
      const val = parseFloat(aInput.value);
      if (!isNaN(val)) {
        bInput.value = (val * state.currentLiquidityRatio).toFixed(6);
        state.lastChanged = "A";
      }
    } else if (inputId === "tokenBAmount" && bInput.value) {
      const val = parseFloat(bInput.value);
      if (!isNaN(val)) {
        aInput.value = (val / state.currentLiquidityRatio).toFixed(6);
        state.lastChanged = "B";
      }
    }
  } finally {
    state.updatingAmounts = false;
  }
}

const inputDebounce = debounce(function(inputId) {
  const state = window.lpState;
  
  if (!state.updatingAmounts) {
    if (state.tokenA && state.tokenB && state.selectedDex) {
      if (state.currentReserveA === 0 || window.pairDataCache.isNewPair) {
        const aInput = document.getElementById("tokenAAmount");
        const bInput = document.getElementById("tokenBAmount");
        const aValue = parseFloat(aInput.value);
        const bValue = parseFloat(bInput.value);

        if (!isNaN(aValue) && !isNaN(bValue) && aValue > 0 && bValue > 0) {
          state.userSetCustomRatio = true;
          state.currentLiquidityRatio = bValue / aValue;
          document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);
          document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(bValue / aValue).toFixed(6)} ${state.tokenB.symbol}`;
        }
      } else if (state.currentLiquidityRatio === null || state.currentLiquidityRatio <= 0) {
        checkLiquidityRatio(false).then(() => {
          if (state.currentLiquidityRatio !== null && state.currentLiquidityRatio > 0) {
            calculateCounterValue(inputId);
          }
        }).catch(err => {
          console.error("Error checking liquidity ratio:", err);
        });
      } else {
        calculateCounterValue(inputId);
      }
    }

    resetSimulationState();

    state.simulationTimeoutId = setTimeout(() => {
      if (state.tokenA && state.tokenB && state.selectedDex) {
        const amountAStr = document.getElementById("tokenAAmount").value;
        const amountBStr = document.getElementById("tokenBAmount").value;

        if (amountAStr && amountBStr && parseFloat(amountAStr) > 0 && parseFloat(amountBStr) > 0) {
          const addLiquidityButton = document.getElementById("addLiquidityButton");
          addLiquidityButton.classList.add("loading");
          addLiquidityButton.innerText = "Checking transaction...";

          updateAddLiquidityButtonText();
        }
      }
    }, 1000);
  }
}, 250);

function setMaxTokenA() {
  const state = window.lpState;
  if (!state.tokenA || !state.userAddress) {
    lpNotify("Please connect wallet and select token", "error");
    return;
  }

  const balance = state.tokenABalance;
  if (!balance || balance <= 0) {
    lpNotify("No balance available", "error");
    return;
  }

  const maxAmount = state.tokenA.symbol === "MON" 
    ? Math.max(0, balance - 0.01).toFixed(6) 
    : balance.toFixed(6);

  document.getElementById("tokenAAmount").value = maxAmount;
  state.lastChanged = "A";

  if (state.currentLiquidityRatio && state.currentLiquidityRatio > 0) {
    document.getElementById("tokenBAmount").value = (parseFloat(maxAmount) * state.currentLiquidityRatio).toFixed(6);
  }

  schedulePoolInfoUpdate();
  inputDebounce("tokenAAmount");
}

function setMaxTokenB() {
  const state = window.lpState;
  if (!state.tokenB || !state.userAddress) {
    lpNotify("Please connect wallet and select token", "error");
    return;
  }

  const balance = state.tokenBBalance;
  if (!balance || balance <= 0) {
    lpNotify("No balance available", "error");
    return;
  }

  const maxAmount = state.tokenB.symbol === "MON" 
    ? Math.max(0, balance - 0.01).toFixed(6) 
    : balance.toFixed(6);

  document.getElementById("tokenBAmount").value = maxAmount;
  state.lastChanged = "B";

  if (state.currentLiquidityRatio && state.currentLiquidityRatio > 0) {
    document.getElementById("tokenAAmount").value = (parseFloat(maxAmount) / state.currentLiquidityRatio).toFixed(6);
  }

  schedulePoolInfoUpdate();
  inputDebounce("tokenBAmount");
}

function initInputListeners() {
  const state = window.lpState;

  document.getElementById("tokenAAmount").addEventListener("input", function() {
    const aValue = parseFloat(this.value);
    const bInput = document.getElementById("tokenBAmount");
    const bValue = parseFloat(bInput.value);

    if (state.currentReserveA === 0 && !isNaN(aValue) && !isNaN(bValue) && aValue > 0 && bValue > 0) {
      state.userSetCustomRatio = true;
      state.currentLiquidityRatio = bValue / aValue;
      document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);
      document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(bValue / aValue).toFixed(6)} ${state.tokenB.symbol}`;
    }

    schedulePoolInfoUpdate();
    inputDebounce("tokenAAmount");
  });

  document.getElementById("tokenBAmount").addEventListener("input", function() {
    const bValue = parseFloat(this.value);
    const aInput = document.getElementById("tokenAAmount");
    const aValue = parseFloat(aInput.value);

    if (state.currentReserveA === 0 && !isNaN(aValue) && !isNaN(bValue) && aValue > 0 && bValue > 0) {
      state.userSetCustomRatio = true;
      state.currentLiquidityRatio = bValue / aValue;
      document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);
      document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(bValue / aValue).toFixed(6)} ${state.tokenB.symbol}`;
    }

    schedulePoolInfoUpdate();
    inputDebounce("tokenBAmount");
  });

  const tokenAMaxText = document.getElementById("tokenAMaxText");
  if (tokenAMaxText) {
    tokenAMaxText.addEventListener("click", setMaxTokenA);
  }

  const tokenBMaxText = document.getElementById("tokenBMaxText");
  if (tokenBMaxText) {
    tokenBMaxText.addEventListener("click", setMaxTokenB);
  }

  const refreshButton = document.getElementById("refreshDataButton");
  if (refreshButton) {
    refreshButton.addEventListener("click", manualRefresh);
  }
}

window.resetSimulationState = resetSimulationState;
window.calculateCounterValue = calculateCounterValue;
window.inputDebounce = inputDebounce;
window.setMaxTokenA = setMaxTokenA;
window.setMaxTokenB = setMaxTokenB;
window.initInputListeners = initInputListeners;
