async function loadDexPools() {
  const state = window.lpState;
  if (!state.tokenA || !state.tokenB) return;
  
  if (!state.provider) {
    state.provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.PRIMARY_RPC);
  }

  const wasManuallySelected = document.getElementById("dexDropdown").value !== "";
  if (!wasManuallySelected) {
    state.selectedDex = null;
    state.simulationAttempts = 0;
    
    if (state.simulationTimeoutId) {
      clearTimeout(state.simulationTimeoutId);
      state.simulationTimeoutId = null;
    }

    const addLiquidityButton = document.getElementById("addLiquidityButton");
    addLiquidityButton.innerText = "Select DEX";
    addLiquidityButton.disabled = true;
    addLiquidityButton.classList.remove("loading");
  }

  const dexPoolsContainer = document.getElementById("dexPools");
  dexPoolsContainer.innerHTML = '<div class="loading-spinner" style="display:flex; justify-content:center; align-items:center; padding:20px;"><div style="width:24px; height:24px; border:3px solid rgba(79, 172, 254, 0.3); border-radius:50%; border-top-color:#4FACFE; animation:spin 1s linear infinite;"></div><span style="margin-left:10px;">Loading DEX Pools...</span></div>';

  if (!document.getElementById('spinnerStyle')) {
    const style = document.createElement('style');
    style.id = 'spinnerStyle';
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  const validPools = [];

  for (const dex of DEX_ROUTERS) {
    try {
      const routerContract = new ethers.Contract(dex.address, UNISWAP_V2_ROUTER_ABI, state.provider);
      const factoryAddress = await routerContract.factory();
      const factoryContract = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, state.provider);
      
      const tokenAAddress = getTokenAddress(state.tokenA, defaultTokens);
      const tokenBAddress = getTokenAddress(state.tokenB, defaultTokens);
      
      const pairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);
      if (pairAddress === "0x0000000000000000000000000000000000000000") continue;
      
      const pairContract = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, state.provider);
      const [reserve0, reserve1] = await pairContract.getReserves();
      const token0 = await pairContract.token0();
      
      let ratio, normalizedReserveA, normalizedReserveB;
      const tokenADecimals = getTokenDecimals(state.tokenA);
      const tokenBDecimals = getTokenDecimals(state.tokenB);
      
      if (tokenAAddress.toLowerCase() === token0.toLowerCase()) {
        normalizedReserveA = parseFloat(ethers.utils.formatUnits(reserve0, tokenADecimals));
        normalizedReserveB = parseFloat(ethers.utils.formatUnits(reserve1, tokenBDecimals));
        ratio = normalizedReserveB / normalizedReserveA;
      } else {
        normalizedReserveA = parseFloat(ethers.utils.formatUnits(reserve1, tokenADecimals));
        normalizedReserveB = parseFloat(ethers.utils.formatUnits(reserve0, tokenBDecimals));
        ratio = normalizedReserveB / normalizedReserveA;
      }
      
      const feeTier = await getFeeTier(pairContract);

      validPools.push({
        dex,
        ratio,
        normalizedReserveA,
        normalizedReserveB,
        feeTier
      });
    } catch (err) {
      console.error("Error loading DEX pool for", dex.name, err);
    }
  }

  dexPoolsContainer.innerHTML = "";

  if (validPools.length === 0) {
    dexPoolsContainer.innerHTML = "No available DEX pools found for this pair.";
  } else {
    validPools.sort((a, b) => (b.normalizedReserveA + b.normalizedReserveB) - (a.normalizedReserveA + a.normalizedReserveB));

    validPools.forEach((pool, index) => {
      const poolCard = document.createElement("div");
      poolCard.className = "dex-pool";

      if (index < 2) {
        poolCard.style.borderLeft = "3px solid #4FACFE";
      }

      poolCard.innerHTML = `
        <strong>${pool.dex.name}</strong><br>
        Swap Rate: ${pool.ratio ? pool.ratio.toFixed(4) : "N/A"}<br>
        Liquidity: ${formatCurrency(pool.normalizedReserveA)} / ${formatCurrency(pool.normalizedReserveB)}<br>
        Fee: ${pool.feeTier}
      `;
      
      poolCard.addEventListener("click", () => {
        state.selectedDex = pool.dex;
        document.querySelectorAll(".dex-pool").forEach(card => card.classList.remove("selected"));
        poolCard.classList.add("selected");
        
        const dropdown = document.getElementById("dexDropdown");
        if (dropdown) dropdown.selectedIndex = 0;
        
        lpNotify("Selected DEX: " + pool.dex.name, "info");
        checkLiquidityRatio();
        updateAddLiquidityButtonText();
      });
      
      dexPoolsContainer.appendChild(poolCard);
    });
  }
}

function populateManualDexDropdown() {
  const dropdown = document.getElementById("dexDropdown");
  dropdown.innerHTML = "";
  
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.text = "Select Router";
  dropdown.appendChild(defaultOption);
  
  DEX_ROUTERS.forEach(dex => {
    const option = document.createElement("option");
    option.value = dex.address;
    option.text = dex.name;
    dropdown.appendChild(option);
  });
}

function initDexDropdownListeners() {
  document.getElementById("manualDexToggle").addEventListener("click", () => {
    const manualDiv = document.getElementById("manualDexSelect");
    manualDiv.style.display = manualDiv.style.display === "none" ? "block" : "none";
  });

  document.getElementById("dexDropdown").addEventListener("change", async function() {
    const state = window.lpState;
    const selectedAddress = this.value;
    
    if (!selectedAddress) {
      state.selectedDex = null;
      document.getElementById("liquidityRatio").innerText = "Select Router";
      document.getElementById("pairPrice").innerText = "-";
      document.getElementById("expectedLpTokens").innerText = "-";
      document.getElementById("poolSharePercent").innerText = "-";
      return;
    }

    document.getElementById("liquidityRatio").innerText = "Loading...";
    document.getElementById("pairPrice").innerText = "Loading...";
    document.getElementById("expectedLpTokens").innerText = "Loading...";
    document.getElementById("poolSharePercent").innerText = "Loading...";

    const originalLabel = this.selectedOptions[0].text;
    this.selectedOptions[0].text = "Loading " + originalLabel + "...";

    const dex = DEX_ROUTERS.find(d => d.address === selectedAddress);
    state.selectedDex = dex;
    document.querySelectorAll(".dex-pool").forEach(card => card.classList.remove("selected"));
    lpNotify("Selected DEX (manual): " + dex.name, "info");

    state.simulationAttempts = 0;
    if (state.simulationTimeoutId) {
      clearTimeout(state.simulationTimeoutId);
      state.simulationTimeoutId = null;
    }

    try {
      let ratioSuccess = false;
      let attempts = 0;

      while (!ratioSuccess && attempts < 3) {
        attempts++;
        try {
          await refreshPairData(true);
          ratioSuccess = true;
        } catch (err) {
          console.error(`Manual DEX selection - ratio check attempt ${attempts} failed:`, err);
          if (attempts < 3) {
            await new Promise(r => setTimeout(r, 800));
          }
        }
      }

      if (!ratioSuccess) {
        lpNotify("Failed to load liquidity data. Please try again or select a different DEX.", "error");
      } else {
        await updatePoolShareInfo(true);
      }

      const amountAInput = document.getElementById("tokenAAmount");
      const amountBInput = document.getElementById("tokenBAmount");
      if (amountAInput.value && amountBInput.value && 
          parseFloat(amountAInput.value) > 0 && parseFloat(amountBInput.value) > 0) {
        const addLiquidityButton = document.getElementById("addLiquidityButton");
        addLiquidityButton.classList.add("loading");
        addLiquidityButton.innerText = "Checking transaction...";

        const aValue = parseFloat(amountAInput.value);
        const bValue = parseFloat(amountBInput.value);

        if (!isNaN(aValue) && !isNaN(bValue) && aValue > 0 && bValue > 0) {
          state.userSetCustomRatio = true;
          state.currentLiquidityRatio = bValue / aValue;
          document.getElementById("liquidityRatio").innerText = "Custom: " + state.currentLiquidityRatio.toFixed(4);
          document.getElementById("pairPrice").innerText = `1 ${state.tokenA.symbol} = ${(bValue / aValue).toFixed(6)} ${state.tokenB.symbol}`;
        }

        await updateAddLiquidityButtonText(true);
      }
    } catch (error) {
      console.error("Error during manual DEX selection:", error);
      lpNotify("Error loading DEX data. Please try refreshing the data.", "error");
    } finally {
      this.selectedOptions[0].text = originalLabel;
    }
  });
}

window.loadDexPools = loadDexPools;
window.populateManualDexDropdown = populateManualDexDropdown;
window.initDexDropdownListeners = initDexDropdownListeners;
