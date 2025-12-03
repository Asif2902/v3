function enforceTokenOrder() {
  const state = window.lpState;
  if (state.tokenA && state.tokenB) {
    const effectiveAddress = (token) => {
      if (token.address === "MON") {
        const wrapped = defaultTokens.find(t => t.symbol === "WMON");
        return wrapped ? wrapped.address.toLowerCase() : "0x0";
      }
      return token.address.toLowerCase();
    };
    
    if (effectiveAddress(state.tokenA) > effectiveAddress(state.tokenB)) {
      const temp = state.tokenA;
      state.tokenA = state.tokenB;
      state.tokenB = temp;
      
      document.getElementById("tokenALogo").src = state.tokenA.logo && state.tokenA.logo !== "?" ? state.tokenA.logo : window.unknownLogo;
      document.getElementById("tokenASymbol").innerText = state.tokenA.symbol;
      document.getElementById("tokenBLogo").src = state.tokenB.logo && state.tokenB.logo !== "?" ? state.tokenB.logo : window.unknownLogo;
      document.getElementById("tokenBSymbol").innerText = state.tokenB.symbol;
      
      lpNotify("Token order adjusted for consistency", "info");
      
      Promise.all([
        fetchLpTokenBalance(state.tokenA, "A"), 
        fetchLpTokenBalance(state.tokenB, "B")
      ]).then(() => {
        onLpPairSelected();
        state.selectedDex = null;
        document.querySelectorAll(".dex-pool").forEach(card => card.classList.remove("selected"));
      });
    }
  }
}

async function fetchLpTokenBalance(token, side, forceRefresh = false) {
  const state = window.lpState;
  if (!state.provider || !state.userAddress) return;
  
  try {
    let balance;
    if (token.symbol === "MON") {
      balance = await state.provider.getBalance(state.userAddress);
      balance = ethers.utils.formatEther(balance);
    } else {
      const tokenContract = new ethers.Contract(
        token.address, 
        ["function balanceOf(address) view returns (uint)"], 
        state.provider
      );
      balance = await tokenContract.balanceOf(state.userAddress);
      balance = ethers.utils.formatUnits(balance, token.decimals);
    }
    
    const balanceElement = document.getElementById(side === "A" ? "tokenABalance" : "tokenBBalance");
    if (balanceElement) {
      const displayBalance = formatBalanceForDisplay(balance);
      balanceElement.innerText = displayBalance;
      balanceElement.setAttribute('data-full-balance', parseFloat(balance).toFixed(6));
      
      if (side === "A") {
        state.tokenABalance = parseFloat(balance);
      } else {
        state.tokenBBalance = parseFloat(balance);
      }
    }
    
    return parseFloat(balance);
  } catch (err) {
    console.error("Error fetching token balance:", err);
    return 0;
  }
}

function onSelectTokenA(token) {
  const state = window.lpState;
  if (!state) {
    console.error('lpState not initialized');
    return;
  }
  state.tokenA = token;
  
  const logoEl = document.getElementById("tokenALogo");
  const symbolEl = document.getElementById("tokenASymbol");
  const labelEl = document.getElementById("tokenALabel");
  
  if (logoEl) logoEl.src = token.logo && token.logo !== "?" ? token.logo : (window.unknownLogo || "https://monbridgedex.xyz/unknown.png");
  if (symbolEl) symbolEl.innerText = token.symbol;
  if (labelEl) labelEl.innerText = token.symbol;
  
  fetchLpTokenBalance(token, "A");
  
  if (state.tokenA && state.tokenB) {
    onLpPairSelected();
  }
}

function onSelectTokenB(token) {
  const state = window.lpState;
  if (!state) {
    console.error('lpState not initialized');
    return;
  }
  state.tokenB = token;
  
  const logoEl = document.getElementById("tokenBLogo");
  const symbolEl = document.getElementById("tokenBSymbol");
  const labelEl = document.getElementById("tokenBLabel");
  
  if (logoEl) logoEl.src = token.logo && token.logo !== "?" ? token.logo : (window.unknownLogo || "https://monbridgedex.xyz/unknown.png");
  if (symbolEl) symbolEl.innerText = token.symbol;
  if (labelEl) labelEl.innerText = token.symbol;
  
  fetchLpTokenBalance(token, "B");
  
  if (state.tokenA && state.tokenB) {
    onLpPairSelected();
  }
}

function onLpPairSelected() {
  const state = window.lpState;
  if (state.tokenA && state.tokenB) {
    enforceTokenOrder();
    loadDexPools();
    checkLiquidityRatio();
  }
}

async function importToken(address) {
  const state = window.lpState;
  if (!state.provider) {
    lpNotify("Please connect your wallet first to import token", "error");
    return null;
  }
  
  try {
    const token = await importTokenFromAddress(address, state.provider, window.unknownLogo);
    lpNotify("Token imported: " + token.symbol, "success");
    
    window.lpImportedTokens.push(token);
    
    return token;
  } catch (error) {
    console.error(error);
    lpNotify("Failed to import token", "error");
    return null;
  }
}

window.enforceTokenOrder = enforceTokenOrder;
window.fetchLpTokenBalance = fetchLpTokenBalance;
window.onSelectTokenA = onSelectTokenA;
window.onSelectTokenB = onSelectTokenB;
window.onLpPairSelected = onLpPairSelected;
window.importToken = importToken;
