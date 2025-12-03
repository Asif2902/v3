let removeLpImportedTokens = JSON.parse(localStorage.getItem('importedTokens')) || [];
const removeLpAllTokens = getAllTokens();

let provider, signer, userAddress;
const PRIMARY_RPC = NETWORK_CONFIG.PRIMARY_RPC;
const CHAIN_ID = NETWORK_CONFIG.CHAIN_ID;
const CHAIN_HEX = NETWORK_CONFIG.CHAIN_HEX;
const CHAIN_EXPLORER = NETWORK_CONFIG.CHAIN_EXPLORER;

const savedRemoveLpSlippage = localStorage.getItem('removeLpSlippageTolerance');
let removeLpSlippageTolerance = savedRemoveLpSlippage !== null ? parseFloat(savedRemoveLpSlippage) : 2.0;

function saveRemoveLpSlippage(value) {
  removeLpSlippageTolerance = value;
  localStorage.setItem('removeLpSlippageTolerance', value.toString());
}

window.saveRemoveLpSlippage = saveRemoveLpSlippage;
window.getRemoveLpSlippage = () => removeLpSlippageTolerance;

const uniswapV2RouterABI = window.UNISWAP_V2_ROUTER_ABI;
const uniswapV2FactoryABI = window.UNISWAP_V2_FACTORY_ABI;
const uniswapV2PairABI = window.UNISWAP_V2_PAIR_ABI;
const erc20ABI = window.ERC20_ABI;

let tokenA = null, tokenB = null;

window.lpTokenAddress = null;
window.lpBalanceRaw = null;

let removeLpTransactionHistory = JSON.parse(localStorage.getItem('removeLpTransactionHistory')) || [];
let removeLpNotificationState = JSON.parse(localStorage.getItem('removeLpNotificationState')) || {
  lastViewedTimestamp: 0,
  viewedTransactionIds: []
};

if (Array.isArray(removeLpNotificationState.viewedTransactionIds)) {
  removeLpNotificationState.viewedTransactionIds = new Set(removeLpNotificationState.viewedTransactionIds);
} else if (!removeLpNotificationState.viewedTransactionIds) {
  removeLpNotificationState.viewedTransactionIds = new Set();
}
