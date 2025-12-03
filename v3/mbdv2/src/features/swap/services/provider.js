function createProvider() {
  if (userAddress && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }

  const endpoint = RPC_ENDPOINTS[currentRpcIndex];
  return new ethers.providers.JsonRpcProvider(endpoint);
}

function switchToNextRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  console.log(`Switching to RPC: ${RPC_ENDPOINTS[currentRpcIndex]}`);

  provider = createProvider();

  if (userAddress && signer) {
    aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
    multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, provider);
  } else {
    aggregatorContract = new ethers.Contract(aggregatorAddress, aggregatorABI, provider);
    multiSplitHopContract = new ethers.Contract(MULTI_SPLIT_HOP_ADDRESS, MULTI_SPLIT_HOP_ABI, provider);
  }

  if (rpcRateLimiter) {
    rpcRateLimiter.circuitOpen = false;
    rpcRateLimiter.failureCount = 0;
  }
}
