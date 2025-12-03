async function updatePoolShareInfo(forceRefresh = false) {
  const state = window.lpState;
  const cache = window.pairDataCache;
  
  if (!state.tokenA || !state.tokenB || !state.selectedDex) return;

  try {
    const tokenAAmount = document.getElementById("tokenAAmount").value;
    const tokenBAmount = document.getElementById("tokenBAmount").value;

    if (!tokenAAmount || !tokenBAmount) {
      document.getElementById("poolSharePercent").innerText = "-";
      document.getElementById("pairPrice").innerText = "-";
      document.getElementById("expectedLpTokens").innerText = "-";
      return;
    }

    const amountA = parseFloat(tokenAAmount);
    const amountB = parseFloat(tokenBAmount);

    if (isNaN(amountA) || isNaN(amountB) || amountA <= 0 || amountB <= 0) {
      return;
    }

    const tokenAAddress = getTokenAddress(state.tokenA, defaultTokens);
    const tokenBAddress = getTokenAddress(state.tokenB, defaultTokens);
    const pairKey = `${tokenAAddress}_${tokenBAddress}_${state.selectedDex.address}`.toLowerCase();

    const now = Date.now();
    const needsFreshData = forceRefresh || 
                           !cache.pairKey || 
                           cache.pairKey !== pairKey || 
                           (now - cache.lastUpdated > 30000);

    if (needsFreshData) {
      const routerContract = new ethers.Contract(state.selectedDex.address, UNISWAP_V2_ROUTER_ABI, state.provider);
      const factoryAddress = await routerContract.factory();
      const factoryContract = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, state.provider);
      const pairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);

      cache.pairKey = pairKey;
      cache.pairAddress = pairAddress;
      cache.lastUpdated = now;

      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        cache.isNewPair = true;
        document.getElementById("poolSharePercent").innerText = "100% (New Pool)";
        document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(amountB / amountA).toFixed(6)} ${state.tokenB.symbol}`;
        document.getElementById("expectedLpTokens").innerText = `~${Math.sqrt(amountA * amountB).toFixed(6)}`;

        state.userSetCustomRatio = true;
        state.currentLiquidityRatio = amountB / amountA;
        document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);

        return;
      }

      cache.isNewPair = false;
      const pairContract = new ethers.Contract(pairAddress, [
        ...UNISWAP_V2_PAIR_ABI,
        "function totalSupply() view returns (uint)",
        "function balanceOf(address) view returns (uint)"
      ], state.provider);

      const [reserves, token0, totalSupply] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0(),
        pairContract.totalSupply()
      ]);

      cache.reserves = reserves;
      cache.token0 = token0;
      cache.totalSupply = totalSupply;
    }

    if (cache.isNewPair) {
      document.getElementById("poolSharePercent").innerText = "100% (New Pool)";
      document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(amountB / amountA).toFixed(6)} ${state.tokenB.symbol}`;
      document.getElementById("expectedLpTokens").innerText = `~${Math.sqrt(amountA * amountB).toFixed(6)}`;

      state.userSetCustomRatio = true;
      state.currentLiquidityRatio = amountB / amountA;
      document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);

      return;
    }

    const tokenADecimals = getTokenDecimals(state.tokenA);
    const tokenBDecimals = getTokenDecimals(state.tokenB);

    const [reserve0, reserve1] = [cache.reserves[0], cache.reserves[1]];
    const token0 = cache.token0;
    const totalSupply = cache.totalSupply;

    let reserveA, reserveB;
    if (tokenAAddress.toLowerCase() === token0.toLowerCase()) {
      reserveA = reserve0;
      reserveB = reserve1;
    } else {
      reserveA = reserve1;
      reserveB = reserve0;
    }

    const normalizedReserveA = parseFloat(ethers.utils.formatUnits(reserveA, tokenADecimals));
    const normalizedReserveB = parseFloat(ethers.utils.formatUnits(reserveB, tokenBDecimals));

    if (normalizedReserveA > 0) {
      document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(normalizedReserveB / normalizedReserveA).toFixed(6)} ${state.tokenB.symbol}`;
    }

    const totalSupplyFormatted = parseFloat(ethers.utils.formatUnits(totalSupply, 18));
    let lpTokens;

    if (normalizedReserveA === 0 || normalizedReserveB === 0) {
      lpTokens = Math.sqrt(amountA * amountB);
    } else {
      lpTokens = Math.min(
        (amountA * totalSupplyFormatted) / normalizedReserveA,
        (amountB * totalSupplyFormatted) / normalizedReserveB
      );
    }

    document.getElementById("expectedLpTokens").innerText = lpTokens.toFixed(6);

    const poolShare = (lpTokens / (totalSupplyFormatted + lpTokens)) * 100;
    document.getElementById("poolSharePercent").innerText = `${poolShare.toFixed(4)}%`;

  } catch (error) {
    console.error("Error updating pool share info:", error);
    document.getElementById("poolSharePercent").innerText = "Error";
    document.getElementById("pairPrice").innerText = "Error";
    document.getElementById("expectedLpTokens").innerText = "Error";
  }
}

let poolInfoTimer = null;

function schedulePoolInfoUpdate() {
  if (poolInfoTimer) {
    clearTimeout(poolInfoTimer);
  }

  poolInfoTimer = setTimeout(() => {
    updatePoolShareInfo(false);
  }, 500);
}

async function checkLiquidityRatio(forceRefresh = false) {
  const state = window.lpState;
  if (!state.tokenA || !state.tokenB) return;

  if (!state.selectedDex) {
    document.getElementById("liquidityRatio").innerText = "Select Router";
    document.getElementById("pairPrice").innerText = "-";
    state.currentLiquidityRatio = null;
    return;
  }

  try {
    if (forceRefresh) {
      document.getElementById("liquidityRatio").innerText = "Loading...";
      document.getElementById("pairPrice").innerText = "Loading...";
    }

    const dataRefreshed = await refreshPairData(forceRefresh);

    if (!dataRefreshed || state.currentReserveA === 0) {
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
            document.getElementById("liquidityRatio").innerText = "New pair";
            document.getElementById("pairPrice").innerText = "Set initial ratio";
          }
        }
      } else {
        if (!state.userSetCustomRatio) {
          state.currentLiquidityRatio = null;
          document.getElementById("liquidityRatio").innerText = "New pair";
          document.getElementById("pairPrice").innerText = "Set initial ratio";
        }
      }
    }

    if (state.currentLiquidityRatio !== null && state.currentLiquidityRatio > 0 && !state.updatingAmounts && !forceRefresh) {
      await (async () => {
        try {
          state.updatingAmounts = true;
          const aInput = document.getElementById("tokenAAmount");
          const bInput = document.getElementById("tokenBAmount");

          if (state.lastChanged === "A" && aInput.value) {
            const val = parseFloat(aInput.value);
            if (!isNaN(val)) {
              bInput.value = (val * state.currentLiquidityRatio).toFixed(6);
            }
          } else if (state.lastChanged === "B" && bInput.value) {
            const val = parseFloat(bInput.value);
            if (!isNaN(val)) {
              aInput.value = (val / state.currentLiquidityRatio).toFixed(6);
            }
          } else if (aInput.value) {
            const val = parseFloat(aInput.value);
            if (!isNaN(val)) {
              bInput.value = (val * state.currentLiquidityRatio).toFixed(6);
              state.lastChanged = "A";
            }
          } else if (bInput.value) {
            const val = parseFloat(bInput.value);
            if (!isNaN(val)) {
              aInput.value = (val / state.currentLiquidityRatio).toFixed(6);
              state.lastChanged = "B";
            }
          }

          if ((aInput.value && parseFloat(aInput.value) > 0) && 
              (bInput.value && parseFloat(bInput.value) > 0)) {
            updateAddLiquidityButtonText();
          }
        } finally {
          state.updatingAmounts = false;
        }
      })();
    }

    updatePoolShareInfo(forceRefresh);

    return true;
  } catch (error) {
    console.error("Error checking liquidity ratio:", error);
    document.getElementById("liquidityRatio").innerText = "Error";
    document.getElementById("pairPrice").innerText = "Try refreshing";
    state.currentLiquidityRatio = null;
    return false;
  }
}

window.updatePoolShareInfo = updatePoolShareInfo;
window.schedulePoolInfoUpdate = schedulePoolInfoUpdate;
window.checkLiquidityRatio = checkLiquidityRatio;
