async function updateEstimatedOutput() {
  const outputDiv = document.getElementById("estimatedOutput");
  outputDiv.innerHTML = "";

  if(!tokenA || !tokenB || !window.lpTokenAddress) return;

  const lpInput = document.getElementById("lpAmount").value;
  if (!lpInput || parseFloat(lpInput) <= 0) return;

  let liquidity;
  try {
    liquidity = ethers.utils.parseUnits(lpInput, 18);
  } catch (err) {
    outputDiv.innerHTML = "<p>Invalid LP amount</p>";
    return;
  }

  try {
    const { expectedA, expectedB } = await computeMinAmounts(liquidity);
    const formattedExpectedA = ethers.utils.formatUnits(expectedA, tokenA.decimals);
    const formattedExpectedB = ethers.utils.formatUnits(expectedB, tokenB.decimals);
    const tokenALogo = tokenA.logo && tokenA.logo !== "?" ? tokenA.logo : "https://monbridgedex.xyz/unknown.png";
    const tokenBLogo = tokenB.logo && tokenB.logo !== "?" ? tokenB.logo : "https://monbridgedex.xyz/unknown.png";

    outputDiv.innerHTML = `
      <p style="font-weight: bold; margin-bottom: 10px;">You Will Receive</p>
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <img src="${tokenALogo}" alt="${tokenA.symbol}" style="width: 24px; height: 24px; margin-right: 10px; border-radius: 50%;">
        <span style="font-size: 16px;">${parseFloat(formattedExpectedA).toFixed(6)} ${tokenA.symbol}</span>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="${tokenBLogo}" alt="${tokenB.symbol}" style="width: 24px; height: 24px; margin-right: 10px; border-radius: 50%;">
        <span style="font-size: 16px;">${parseFloat(formattedExpectedB).toFixed(6)} ${tokenB.symbol}</span>
      </div>
    `;
  } catch (err) {
    console.error("Error computing estimated output:", err);
    outputDiv.innerHTML = "<p>Error computing estimated output</p>";
  }
}
