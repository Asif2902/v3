async function updateLPInfo() {
  if (!tokenA || !tokenB) return;
  const routerAddress = document.getElementById("routerSelect").value;
  try {
    const routerContract = new ethers.Contract(routerAddress, uniswapV2RouterABI, signer);
    const factoryAddress = await routerContract.factory();
    const factoryContract = new ethers.Contract(factoryAddress, uniswapV2FactoryABI, provider);
    const tokenAAddress = (tokenA.symbol === "MON") ? defaultTokens.find(t => t.symbol === "WMON").address : tokenA.address;
    const tokenBAddress = (tokenB.symbol === "MON") ? defaultTokens.find(t => t.symbol === "WMON").address : tokenB.address;
    let pairAddress = await factoryContract.getPair(tokenAAddress, tokenBAddress);
    if (pairAddress === "0x0000000000000000000000000000000000000000") {
      document.getElementById("lpTokenNameDisplay").innerText = "Dex LP";
      document.getElementById("lpBalanceDisplay").innerText = "-";
      window.lpTokenAddress = null;
      return;
    }
    window.lpTokenAddress = pairAddress;
    document.getElementById("lpTokenNameDisplay").innerText = `${tokenA.symbol}-${tokenB.symbol} LP`;
    const lpContract = new ethers.Contract(pairAddress, erc20ABI, provider);
    let lpBalance = await lpContract.balanceOf(userAddress);
    window.lpBalanceRaw = lpBalance;
    document.getElementById("lpBalanceDisplay").innerText = ethers.utils.formatUnits(lpBalance, 18);
    notify("LP Info updated", "success");
  } catch (err) {
    console.error(err);
    notify("Error updating LP info", "error");
  }
}

async function computeMinAmounts(liquidityToRemove) {
  const pairContract = new ethers.Contract(window.lpTokenAddress, uniswapV2PairABI, provider);
  const reserves = await pairContract.getReserves();
  const totalSupply = await pairContract.totalSupply();
  const token0 = await pairContract.token0();
  const tokenAAddress = (tokenA.symbol === "MON") ? defaultTokens.find(t => t.symbol === "WMON").address : tokenA.address;
  let expectedA, expectedB;
  if (tokenAAddress.toLowerCase() === token0.toLowerCase()) {
    expectedA = liquidityToRemove.mul(reserves.reserve0).div(totalSupply);
    expectedB = liquidityToRemove.mul(reserves.reserve1).div(totalSupply);
  } else {
    expectedA = liquidityToRemove.mul(reserves.reserve1).div(totalSupply);
    expectedB = liquidityToRemove.mul(reserves.reserve0).div(totalSupply);
  }
  const minA = expectedA.mul(95).div(100);
  const minB = expectedB.mul(95).div(100);
  return { expectedA, expectedB, minA, minB };
}
