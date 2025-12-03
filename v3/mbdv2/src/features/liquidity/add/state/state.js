const savedLpSlippage = localStorage.getItem('lpSlippageTolerance');

window.lpState = {
  provider: null,
  signer: null,
  userAddress: null,
  tokenA: null,
  tokenB: null,
  tokenABalance: 0,
  tokenBBalance: 0,
  currentLiquidityRatio: null,
  updatingAmounts: false,
  lastChanged: null,
  skipMaxInputOnTokenChange: true,
  userSetCustomRatio: false,
  simulationAttempts: 0,
  simulationTimeoutId: null,
  lastSimulationTime: 0,
  selectedDex: null,
  currentReserveA: null,
  currentReserveB: null,
  slippageTolerance: savedLpSlippage !== null ? parseFloat(savedLpSlippage) : 2.0
};

function saveLpSlippage(value) {
  window.lpState.slippageTolerance = value;
  localStorage.setItem('lpSlippageTolerance', value.toString());
}

window.saveLpSlippage = saveLpSlippage;

window.lpDataCache = {};

window.pairDataCache = {
  pairAddress: null,
  token0: null,
  totalSupply: null,
  reserves: null,
  isNewPair: false,
  lastUpdated: 0,
  pairKey: null
};

window.unknownLogo = window.unknownLogo || "https://monbridgedex.xyz/unknown.png";

let importedTokens = JSON.parse(localStorage.getItem('importedTokens')) || [];
window.lpImportedTokens = importedTokens;
