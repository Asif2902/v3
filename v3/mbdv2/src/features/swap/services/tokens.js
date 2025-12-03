async function importToken(address, retryCount = 0) {
  try {
    if (!ethers.utils.isAddress(address)) {
      notify("Invalid token address", "error");
      return null;
    }

    const existingToken = [...defaultTokens, ...importedTokens].find(
      t => t.address.toLowerCase() === address.toLowerCase()
    );

    if (existingToken) {
      return existingToken;
    }

    if (!provider) {
      provider = createProvider();
    }

    const tokenContract = new ethers.Contract(address, [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ], provider);

    let name, symbol, decimals;
    try {
      [name, symbol, decimals] = await Promise.all([
        rateLimitedCall(() => tokenContract.name()),
        rateLimitedCall(() => tokenContract.symbol()),
        rateLimitedCall(() => tokenContract.decimals())
      ]);
    } catch (error) {
      console.error("Error fetching token details:", error);

      if (retryCount < 2) {
        console.log(`Retrying token import... (${retryCount + 1}/3)`);
        switchToNextRpc();
        return await importToken(address, retryCount + 1);
      }

      notify("Failed to fetch token details", "error");
      return null;
    }

    // Try to fetch logo from DexScreener
    let logo = "https://monbridgedex.xyz/unknown.png";
    try {
      if (typeof getTokenLogo === 'function') {
        const dexScreenerLogo = await getTokenLogo(address);
        if (dexScreenerLogo) {
          logo = dexScreenerLogo;
          console.log(`Found logo for ${symbol} from DexScreener`);
        }
      }
    } catch (error) {
      console.warn("Could not fetch logo from DexScreener:", error);
    }

    const newToken = {
      name,
      symbol,
      address,
      decimals,
      logo
    };

    if (shouldShowTokenWarning(address)) {
      const userConfirmed = await showTokenImportWarning(newToken);
      if (!userConfirmed) {
        return null;
      }
    }

    importedTokens.push(newToken);
    localStorage.setItem('importedTokens', JSON.stringify(importedTokens));

    const allTokens = [...defaultTokens, ...importedTokens];
    
    if (window.tokenModals) {
      if (window.tokenModals.A) {
        window.tokenModals.A.tokens = allTokens;
        window.tokenModals.A.filteredTokens = allTokens;
        if (window.tokenModals.A.renderTokenList) {
          window.tokenModals.A.renderTokenList();
        }
      }
      if (window.tokenModals.B) {
        window.tokenModals.B.tokens = allTokens;
        window.tokenModals.B.filteredTokens = allTokens;
        if (window.tokenModals.B.renderTokenList) {
          window.tokenModals.B.renderTokenList();
        }
      }
    }

    notify(`Token ${symbol} imported successfully`, "success");
    return newToken;
  } catch (error) {
    console.error("Error importing token:", error);
    notify("Failed to import token", "error");
    return null;
  }
}

function loadTokens() {
  const fromList = document.getElementById("fromTokenList");
  const toList = document.getElementById("toTokenList");

  if (!fromList || !toList) return;

  fromList.innerHTML = "";
  toList.innerHTML = "";

  const allTokens = [...defaultTokens, ...importedTokens];

  allTokens.forEach(token => {
    const createTokenItem = (list, side) => {
      const div = document.createElement("div");
      div.className = "token-item";
      div.innerHTML = `
        <img src="${(token.logo && token.logo !== "?") ? token.logo : "https://monbridgedex.xyz/unknown.png"}" alt="${token.symbol}" />
        <span>${token.symbol}</span>
      `;
      div.addEventListener("click", () => {
        if (side === "from") {
          fromToken = token;
          document.getElementById("fromTokenLogo").src = (token.logo && token.logo !== "?") 
            ? token.logo 
            : "https://monbridgedex.xyz/unknown.png";
          document.getElementById("fromTokenSymbol").innerText = token.symbol;
          fetchTokenBalance(token, "from");
        } else {
          toToken = token;
          document.getElementById("toTokenLogo").src = (token.logo && token.logo !== "?") 
            ? token.logo 
            : "https://monbridgedex.xyz/unknown.png";
          document.getElementById("toTokenSymbol").innerText = token.symbol;
          fetchTokenBalance(token, "to");
        }
        estimateSwap();
      });
      list.appendChild(div);
    };

    createTokenItem(fromList, "from");
    createTokenItem(toList, "to");
  });
}

function setTokenPair() {
  const urlParams = new URLSearchParams(window.location.search);
  const fromTokenSymbolOrAddress = urlParams.get('from') || 'MON';
  const toTokenSymbolOrAddress = urlParams.get('to') || 'USDC';
  const initialAmount = urlParams.get('amount');

  const allTokens = [...defaultTokens, ...importedTokens];

  let fromTokenFound = allTokens.find(t => 
    t.symbol.toLowerCase() === fromTokenSymbolOrAddress.toLowerCase() || 
    t.address.toLowerCase() === fromTokenSymbolOrAddress.toLowerCase()
  );

  let toTokenFound = allTokens.find(t => 
    t.symbol.toLowerCase() === toTokenSymbolOrAddress.toLowerCase() || 
    t.address.toLowerCase() === toTokenSymbolOrAddress.toLowerCase()
  );

  if (fromTokenFound) {
    fromToken = fromTokenFound;
    document.getElementById("fromTokenLogo").src = (fromToken.logo && fromToken.logo !== "?")
      ? fromToken.logo
      : "https://monbridgedex.xyz/unknown.png";
    document.getElementById("fromTokenSymbol").innerText = fromToken.symbol;
  } else if (fromTokenSymbolOrAddress.startsWith('0x')) {
    importToken(fromTokenSymbolOrAddress).then(importedToken => {
      if (importedToken) {
        fromToken = importedToken;
        document.getElementById("fromTokenLogo").src = (fromToken.logo && fromToken.logo !== "?")
          ? fromToken.logo
          : "https://monbridgedex.xyz/unknown.png";
        document.getElementById("fromTokenSymbol").innerText = fromToken.symbol;
        fetchTokenBalance(fromToken, "from");
        estimateSwap();
      } else {
        fromToken = allTokens.find(t => t.symbol === "MON");
        document.getElementById("fromTokenLogo").src = (fromToken.logo && fromToken.logo !== "?")
          ? fromToken.logo
          : "https://monbridgedex.xyz/unknown.png";
        document.getElementById("fromTokenSymbol").innerText = fromToken.symbol;
      }
    });
  } else {
    fromToken = allTokens.find(t => t.symbol === "MON");
    document.getElementById("fromTokenLogo").src = (fromToken.logo && fromToken.logo !== "?")
      ? fromToken.logo
      : "https://monbridgedex.xyz/unknown.png";
    document.getElementById("fromTokenSymbol").innerText = fromToken.symbol;
  }

  if (toTokenFound) {
    toToken = toTokenFound;
    document.getElementById("toTokenLogo").src = (toToken.logo && toToken.logo !== "?")
      ? toToken.logo
      : "https://monbridgedex.xyz/unknown.png";
    document.getElementById("toTokenSymbol").innerText = toToken.symbol;
  } else if (toTokenSymbolOrAddress.startsWith('0x')) {
    importToken(toTokenSymbolOrAddress).then(importedToken => {
      if (importedToken) {
        toToken = importedToken;
        document.getElementById("toTokenLogo").src = (toToken.logo && toToken.logo !== "?")
          ? toToken.logo
          : "https://monbridgedex.xyz/unknown.png";
        document.getElementById("toTokenSymbol").innerText = toToken.symbol;
        fetchTokenBalance(toToken, "to");
        estimateSwap();
      } else {
        toToken = allTokens.find(t => t.symbol === "USDC");
        document.getElementById("toTokenLogo").src = (toToken.logo && toToken.logo !== "?")
          ? toToken.logo
          : "https://monbridgedex.xyz/unknown.png";
        document.getElementById("toTokenSymbol").innerText = toToken.symbol;
      }
    });
  } else {
    toToken = allTokens.find(t => t.symbol === "USDC");
    document.getElementById("toTokenLogo").src = (toToken.logo && toToken.logo !== "?")
      ? toToken.logo
      : "https://monbridgedex.xyz/unknown.png";
    document.getElementById("toTokenSymbol").innerText = toToken.symbol;
  }

  if (!provider) {
    provider = createProvider();
    aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
  }

  if (initialAmount && !isNaN(initialAmount)) {
    document.getElementById("fromAmount").value = initialAmount;
  }

  if (userAddress) {
    if (fromToken) fetchTokenBalance(fromToken, "from");
    if (toToken) fetchTokenBalance(toToken, "to");
  }

  estimateSwap();
}

function setDefaultPair() {
  setTokenPair();
}
