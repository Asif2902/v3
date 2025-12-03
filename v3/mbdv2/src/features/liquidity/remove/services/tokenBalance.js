async function fetchTokenBalance(token, side) {
  if (!provider || !userAddress) return;
  try {
    let balance;
    if (token.symbol === "MON") {
      balance = await provider.getBalance(userAddress);
      balance = ethers.utils.formatEther(balance);
    } else {
      const tokenContract = new ethers.Contract(token.address, ["function balanceOf(address) view returns (uint)"], provider);
      balance = await tokenContract.balanceOf(userAddress);
      balance = ethers.utils.formatUnits(balance, token.decimals);
    }
    if (side === "A") {
      document.getElementById("tokenABalance").innerText = parseFloat(balance).toFixed(6);
    } else if (side === "B") {
      document.getElementById("tokenBBalance").innerText = parseFloat(balance).toFixed(6);
    }
  } catch (err) {
    console.error(err);
  }
}

async function importToken(address) {
  if (!provider) {
    notify("Please connect your wallet first to import token", "error");
    return null;
  }
  try {
    const tokenContract = new ethers.Contract(address, [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address) view returns (uint)"
    ], provider);
    const symbol = await rateLimitedCall(() => tokenContract.symbol());
    const decimals = await rateLimitedCall(() => tokenContract.decimals());
    const token = { symbol, address, decimals, logo: "https://monbridgedex.xyz/unknown.png" };
    importedTokens.push(token);
    localStorage.setItem('importedTokens', JSON.stringify(importedTokens));
    notify("Token imported: " + symbol, "success");
    allTokens.push(token);
    updateTokenAList();
    updateTokenBList();
    return token;
  } catch (error) {
    console.error(error);
    notify("Failed to import token", "error");
    return null;
  }
}
