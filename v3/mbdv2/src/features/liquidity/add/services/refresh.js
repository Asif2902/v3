function setupPeriodicDataRefresh() {
  const state = window.lpState;
  
  setInterval(async () => {
    if (state.tokenA && state.tokenB && state.selectedDex) {
      try {
        await refreshPairData(false);
      } catch (err) {
        console.error("Error in periodic data refresh:", err);
      }
    }
  }, 15000);

  setInterval(async () => {
    if (state.tokenA && state.tokenB && state.selectedDex && state.userAddress) {
      const amountAInput = document.getElementById("tokenAAmount");
      const amountBInput = document.getElementById("tokenBAmount");
      const addLiquidityButton = document.getElementById("addLiquidityButton");

      if (amountAInput.value && amountBInput.value) {
        if (!addLiquidityButton.classList.contains("loading") && 
            !addLiquidityButton.innerText.includes("Checking transaction") &&
            !addLiquidityButton.innerText.includes("Verifying transaction") &&
            !addLiquidityButton.innerText.includes("Approving")) {

          if (addLiquidityButton.innerText === "Transaction would fail") {
            state.simulationAttempts = 0;
            updateAddLiquidityButtonText();
          }
          else if (!addLiquidityButton.disabled && 
                   (Date.now() - state.lastSimulationTime) > 15000) {
            state.simulationAttempts = 0;
            updateAddLiquidityButtonText();
          }
        }
      }
    }
  }, 8000);
}

async function refreshPairData(forceRefresh = false) {
  const state = window.lpState;
  if (!state.tokenA || !state.tokenB || !state.selectedDex) return false;

  const tokenAAddress = getTokenAddress(state.tokenA, defaultTokens);
  const tokenBAddress = getTokenAddress(state.tokenB, defaultTokens);
  const cacheKey = `${tokenAAddress.toLowerCase()}_${tokenBAddress.toLowerCase()}_${state.selectedDex.address.toLowerCase()}`;

  const now = Date.now();
  const cachedData = window.lpDataCache[cacheKey];
  const cacheValid = cachedData && 
                     !forceRefresh && 
                     (now - cachedData.timestamp < 30000);

  if (cacheValid) {
    const oldReserveA = state.currentReserveA;
    const oldReserveB = state.currentReserveB;

    if (cachedData.reserveA !== oldReserveA || cachedData.reserveB !== oldReserveB) {
      state.currentReserveA = cachedData.reserveA;
      state.currentReserveB = cachedData.reserveB;

      if (cachedData.reserveA > 0) {
        const ratio = cachedData.reserveB / cachedData.reserveA;
        document.getElementById("liquidityRatio").innerText = ratio.toFixed(4);
        document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(cachedData.reserveB / cachedData.reserveA).toFixed(6)} ${state.tokenB.symbol}`;
        if (!state.userSetCustomRatio) {
          state.currentLiquidityRatio = ratio;
        }
      }

      updatePoolShareInfo();

      const amountAInput = document.getElementById("tokenAAmount");
      const amountBInput = document.getElementById("tokenBAmount");
      if (amountAInput.value && amountBInput.value) {
        state.simulationAttempts = 0;
        if (state.simulationTimeoutId) {
          clearTimeout(state.simulationTimeoutId);
          state.simulationTimeoutId = null;
        }
        updateAddLiquidityButtonText();
      }
    }

    return true;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      if (!state.provider) {
        state.provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.PRIMARY_RPC);
      }

      const routerContract = new ethers.Contract(state.selectedDex.address, UNISWAP_V2_ROUTER_ABI, state.provider);
      const factoryAddress = await routerContract.factory();
      const factoryContract = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, state.provider);
      const pairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);

      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        window.lpDataCache[cacheKey] = {
          isNewPair: true,
          reserveA: 0,
          reserveB: 0,
          timestamp: now
        };

        document.getElementById("liquidityRatio").innerText = "New pair";
        document.getElementById("pairPrice").innerText = "Set initial ratio";
        state.currentReserveA = 0;
        state.currentReserveB = 0;

        const aInput = document.getElementById("tokenAAmount");
        const bInput = document.getElementById("tokenBAmount");

        if (aInput.value && bInput.value) {
          const aValue = parseFloat(aInput.value);
          const bValue = parseFloat(bInput.value);

          if (!isNaN(aValue) && !isNaN(bValue) && aValue > 0 && bValue > 0) {
            state.userSetCustomRatio = true;
            state.currentLiquidityRatio = bValue / aValue;
            document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);
            document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(bValue / aValue).toFixed(6)} ${state.tokenB.symbol}`;
          } else {
            if (!state.userSetCustomRatio) {
              state.currentLiquidityRatio = null;
            }
          }
        } else {
          if (!state.userSetCustomRatio) {
            state.currentLiquidityRatio = null;
          }
        }

        return true;
      }

      const pairContract = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, state.provider);
      const [reserve0, reserve1] = await pairContract.getReserves();
      const token0 = await pairContract.token0();

      const tokenADecimals = getTokenDecimals(state.tokenA);
      const tokenBDecimals = getTokenDecimals(state.tokenB);

      let newReserveA, newReserveB;
      if (tokenAAddress.toLowerCase() === token0.toLowerCase()) {
        newReserveA = parseFloat(ethers.utils.formatUnits(reserve0, tokenADecimals));
        newReserveB = parseFloat(ethers.utils.formatUnits(reserve1, tokenBDecimals));
      } else {
        newReserveA = parseFloat(ethers.utils.formatUnits(reserve1, tokenADecimals));
        newReserveB = parseFloat(ethers.utils.formatUnits(reserve0, tokenBDecimals));
      }

      window.lpDataCache[cacheKey] = {
        isNewPair: false,
        reserveA: newReserveA,
        reserveB: newReserveB,
        pairAddress: pairAddress,
        token0: token0,
        timestamp: now
      };

      const oldReserveA = state.currentReserveA;
      const oldReserveB = state.currentReserveB;

      if (newReserveA !== oldReserveA || newReserveB !== oldReserveB) {
        state.currentReserveA = newReserveA;
        state.currentReserveB = newReserveB;

        if (newReserveA > 0) {
          const ratio = newReserveB / newReserveA;
          document.getElementById("liquidityRatio").innerText = ratio.toFixed(4);
          document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(newReserveB / newReserveA).toFixed(6)} ${state.tokenB.symbol}`;
          if (!state.userSetCustomRatio) {
            state.currentLiquidityRatio = ratio;
          }
        }

        updatePoolShareInfo();

        const amountAInput = document.getElementById("tokenAAmount");
        const amountBInput = document.getElementById("tokenBAmount");
        if (amountAInput.value && amountBInput.value) {
          state.simulationAttempts = 0;
          if (state.simulationTimeoutId) {
            clearTimeout(state.simulationTimeoutId);
            state.simulationTimeoutId = null;
          }
          updateAddLiquidityButtonText();
        }
      }

      return true;
    } catch (error) {
      console.error(`Data refresh attempt ${attempts} failed:`, error);

      if (attempts >= maxAttempts) {
        if (cachedData) {
          state.currentReserveA = cachedData.reserveA;
          state.currentReserveB = cachedData.reserveB;

          if (cachedData.reserveA > 0) {
            const ratio = cachedData.reserveB / cachedData.reserveA;
            document.getElementById("liquidityRatio").innerText = ratio.toFixed(4);
            document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(cachedData.reserveB / cachedData.reserveA).toFixed(6)} ${state.tokenB.symbol}`;
            if (!state.userSetCustomRatio) {
              state.currentLiquidityRatio = ratio;
            }
          }

          window.lpDataCache[cacheKey] = {...cachedData, timestamp: now};
          return true;
        }
        document.getElementById("liquidityRatio").innerText = "Error";
        document.getElementById("pairPrice").innerText = "Refresh failed";
        return false;
      }

      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

function manualRefresh() {
  const state = window.lpState;
  const refreshButton = document.getElementById("refreshDataButton");
  
  if (!refreshButton) return;
  
  const originalContent = refreshButton.innerHTML;
  refreshButton.innerHTML = '<div style="width:20px;height:20px;border:2px solid #eee;border-top:2px solid #836EF9;border-radius:50%;animation:spin 1s linear infinite;"></div>';

  const dataElements = ["liquidityRatio", "pairPrice", "expectedLpTokens", "poolSharePercent"];
  const originalValues = {};
  
  dataElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      originalValues[id] = element.innerText;
      if (element.innerText !== "-") {
        element.innerText = "Refreshing...";
      }
    }
  });

  lpNotify("Refreshing all data...", "info");

  state.simulationAttempts = 0;
  if (state.simulationTimeoutId) {
    clearTimeout(state.simulationTimeoutId);
    state.simulationTimeoutId = null;
  }

  for (const key in window.lpDataCache) {
    delete window.lpDataCache[key];
  }

  window.pairDataCache.lastUpdated = 0;
  state.userSetCustomRatio = false;

  let refreshSucceeded = true;
  let refreshErrors = [];

  const refreshSequentially = async () => {
    try {
      state.updatingAmounts = true;
      state.currentReserveA = null;
      state.currentReserveB = null;
      state.userSetCustomRatio = false;
      state.currentLiquidityRatio = null;

      if (state.userAddress) {
        try {
          let balanceSuccess = false;
          let balanceAttempts = 0;

          while (!balanceSuccess && balanceAttempts < 3) {
            balanceAttempts++;
            try {
              if (state.tokenA) await fetchLpTokenBalance(state.tokenA, "A", true);
              if (state.tokenB) await fetchLpTokenBalance(state.tokenB, "B", true);
              balanceSuccess = true;
            } catch (err) {
              console.error(`Balance refresh attempt ${balanceAttempts} failed:`, err);
              if (balanceAttempts < 3) {
                await new Promise(r => setTimeout(r, 500));
              }
            }
          }

          if (!balanceSuccess) {
            refreshErrors.push("Failed to refresh token balances after multiple attempts");
            refreshSucceeded = false;
          }
        } catch (err) {
          console.error("Balance refresh error:", err);
          refreshErrors.push("Failed to refresh token balances");
          refreshSucceeded = false;
        }
      }

      if (state.tokenA && state.tokenB) {
        const wasManuallySelected = document.getElementById("dexDropdown").value !== "";
        if (!wasManuallySelected) {
          try {
            await new Promise((resolve, reject) => {
              try {
                const dexPoolsContainer = document.getElementById("dexPools");
                dexPoolsContainer.innerHTML = '<div class="loading-spinner" style="display:flex; justify-content:center; align-items:center; padding:20px;"><div style="width:24px; height:24px; border:3px solid rgba(79, 172, 254, 0.3); border-radius:50%; border-top-color:#4FACFE; animation:spin 1s linear infinite;"></div><span style="margin-left:10px;">Refreshing DEX Pools...</span></div>';

                const poolLoadTimeout = setTimeout(() => {
                  reject(new Error("DEX pools loading timed out"));
                }, 8000);

                loadDexPools().then(() => {
                  clearTimeout(poolLoadTimeout);
                  resolve();
                }).catch(err => {
                  clearTimeout(poolLoadTimeout);
                  reject(err);
                });
              } catch (err) {
                reject(err);
              }
            });
          } catch (err) {
            console.error("DEX pools refresh error:", err);
            refreshErrors.push("Failed to load DEX pools");
            refreshSucceeded = false;
          }
        }

        if (state.selectedDex) {
          try {
            const pairDataSuccess = await refreshPairData(true);

            if (!pairDataSuccess) {
              refreshErrors.push("Failed to refresh pair data");
              refreshSucceeded = false;
            }

            try {
              await updatePoolShareInfo(true);
            } catch (err) {
              console.error("Pool share info update error:", err);
              refreshErrors.push("Failed to update pool information");
              refreshSucceeded = false;
            }

            const amountAInput = document.getElementById("tokenAAmount");
            const amountBInput = document.getElementById("tokenBAmount");

            if (amountAInput.value && amountBInput.value && 
                parseFloat(amountAInput.value) > 0 && parseFloat(amountBInput.value) > 0) {
              try {
                const aValue = parseFloat(amountAInput.value);
                const bValue = parseFloat(amountBInput.value);

                if (!isNaN(aValue) && !isNaN(bValue) && aValue > 0 && bValue > 0) {
                  state.userSetCustomRatio = true;
                  state.currentLiquidityRatio = bValue / aValue;
                  document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);
                  document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(bValue / aValue).toFixed(6)} ${state.tokenB.symbol}`;
                }

                const addLiquidityButton = document.getElementById("addLiquidityButton");
                addLiquidityButton.classList.add("loading");
                addLiquidityButton.innerText = "Checking transaction...";

                await updateAddLiquidityButtonText(true);
              } catch (err) {
                console.error("Transaction simulation error:", err);
                refreshErrors.push("Failed to check transaction feasibility");
                refreshSucceeded = false;
              }
            }
          } catch (err) {
            console.error("Error refreshing liquidity data:", err);
            refreshErrors.push("Failed to refresh liquidity data");
            refreshSucceeded = false;
          }
        }
      }
    } catch (err) {
      console.error("Unexpected error during refresh:", err);
      refreshErrors.push("Unexpected error during refresh");
      refreshSucceeded = false;
    } finally {
      state.updatingAmounts = false;

      refreshButton.innerHTML = originalContent;

      dataElements.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.innerText === "Refreshing...") {
          element.innerText = originalValues[id] || "-";
        }
      });

      if (refreshSucceeded) {
        lpNotify("All data refreshed successfully", "success");
      } else {
        const errorMsg = refreshErrors.length > 0 ? 
          `Some data failed to refresh: ${refreshErrors[0]}` : 
          "Some data failed to refresh";
        lpNotify(errorMsg, "error");

        if (refreshErrors.some(err => 
            err.includes("Failed to refresh pair data") || 
            err.includes("Failed to update pool information"))) {
          setTimeout(() => {
            lpNotify("Automatically retrying failed refresh operations...", "info");
            if (state.selectedDex && state.tokenA && state.tokenB) {
              refreshPairData(true)
                .then(() => updatePoolShareInfo(true))
                .catch(err => console.error("Auto-retry failed:", err));
            }
          }, 2000);
        }
      }
    }
  };

  refreshSequentially();
}

window.setupPeriodicDataRefresh = setupPeriodicDataRefresh;
window.refreshPairData = refreshPairData;
window.manualRefresh = manualRefresh;
