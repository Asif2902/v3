async function getFeeTier(pairContract) {
  try {
    const feeContract = new ethers.Contract(
      pairContract.address,
      ["function fee() view returns (uint24)"],
      pairContract.provider
    );
    const fee = await feeContract.fee();
    return (fee / 10000).toFixed(2) + "%";
  } catch {
    return "0.30%";
  }
}

async function importTokenFromAddress(address, provider, unknownLogo = "https://monbridgedex.xyz/unknown.png") {
  if (!provider) {
    throw new Error("Provider not available");
  }

  try {
    const tokenContract = new ethers.Contract(address, [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address) view returns (uint)"
    ], provider);

    const symbol = await window.rateLimitedCall(() => tokenContract.symbol());
    const decimals = await window.rateLimitedCall(() => tokenContract.decimals());

    const token = { 
      symbol, 
      address, 
      decimals, 
      logo: unknownLogo 
    };

    let importedTokens = JSON.parse(localStorage.getItem('importedTokens')) || [];
    const exists = importedTokens.some(t => t.address.toLowerCase() === address.toLowerCase());
    
    if (!exists) {
      importedTokens.push(token);
      localStorage.setItem('importedTokens', JSON.stringify(importedTokens));
    }

    return token;
  } catch (error) {
    console.error("Failed to import token:", error);
    throw error;
  }
}

async function isFeeOnTransferToken(tokenAddress, provider) {
  if (!tokenAddress || tokenAddress === "MON") return false;
  
  try {
    const feeCheckContract = new ethers.Contract(tokenAddress, [
      "function _taxFee() external view returns (uint256)",
      "function _liquidityFee() external view returns (uint256)", 
      "function taxFee() external view returns (uint256)",
      "function liquidityFee() external view returns (uint256)",
      "function sellTax() external view returns (uint256)",
      "function buyTax() external view returns (uint256)"
    ], provider);
    
    const feeChecks = [
      () => feeCheckContract._taxFee(),
      () => feeCheckContract._liquidityFee(),
      () => feeCheckContract.taxFee(),
      () => feeCheckContract.liquidityFee(),
      () => feeCheckContract.sellTax(),
      () => feeCheckContract.buyTax()
    ];
    
    for (const check of feeChecks) {
      try {
        const result = await check();
        if (result && !result.isZero()) {
          console.log(`Detected fee-on-transfer token: ${tokenAddress}`);
          return true;
        }
      } catch (e) {
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking fee-on-transfer:", error);
    return false;
  }
}

function getTokenAddress(token, defaultTokens) {
  if (token.symbol === "MON") {
    const wmon = defaultTokens.find(t => t.symbol === "WMON");
    return wmon ? wmon.address : token.address;
  }
  return token.address;
}

function getTokenDecimals(token) {
  return token.symbol === "MON" ? 18 : token.decimals;
}

window.getFeeTier = getFeeTier;
window.importTokenFromAddress = importTokenFromAddress;
window.isFeeOnTransferToken = isFeeOnTransferToken;
window.getTokenAddress = getTokenAddress;
window.getTokenDecimals = getTokenDecimals;
