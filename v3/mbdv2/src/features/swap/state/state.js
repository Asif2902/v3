const RPC_ENDPOINTS = NETWORK_CONFIG.RPC_ENDPOINTS;

let currentRpcIndex = 0;
let routingMode = 'auto';

const PRIMARY_RPC = NETWORK_CONFIG.PRIMARY_RPC;
const CHAIN_ID = NETWORK_CONFIG.CHAIN_ID;
const CHAIN_HEX = NETWORK_CONFIG.CHAIN_HEX;
const CHAIN_EXPLORER = NETWORK_CONFIG.CHAIN_EXPLORER;

const routers = DEX_ROUTERS.map(r => r.address);

let importedTokens = JSON.parse(localStorage.getItem('importedTokens')) || [];
let provider, signer, userAddress;
let aggregatorContract;
let multiSplitHopContract;

const aggregatorAddress = NETWORK_CONFIG.CONTRACTS.AGGREGATOR;

let fromToken = null;
let toToken = null;
window.fromTokenBalance = 0;

let currentPriceImpact = 0;
let hasValidSwapData = false;
let isDataLoading = false;

let isSwapInProgress = false;
let isApprovalInProgress = false;
let lockedRoute = null;
let lockedBestSwap = null;
let autoModeRefreshTimer = null;
let mainRefreshTimer = null;
let isRefreshing = false;

let cachedMonPrice = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000;
const priceCache = new Map();
const routeCache = new Map();

let progressTimer = null;
let currentProgress = 0;
let progressStartTime = 0;

const pendingRequests = new Set();

let tokenWarningCache = JSON.parse(localStorage.getItem('tokenWarningCache')) || {};

const savedSlippage = localStorage.getItem('slippageTolerance');
const savedAutoSlippage = localStorage.getItem('isAutoSlippage');
const savedDeadline = localStorage.getItem('transactionDeadline');
const savedSimulationEnabled = localStorage.getItem('isSimulationEnabled');
const savedRoutingMode = localStorage.getItem('routingMode');

let slippageTolerance = savedSlippage !== null ? parseFloat(savedSlippage) : 0.5;
let isAutoSlippage = savedAutoSlippage !== null ? savedAutoSlippage === 'true' : true;
let transactionDeadline = savedDeadline !== null ? parseInt(savedDeadline) : 20;
let isSimulationEnabled = savedSimulationEnabled !== null ? savedSimulationEnabled === 'true' : true;
if (savedRoutingMode) {
  routingMode = savedRoutingMode;
}
