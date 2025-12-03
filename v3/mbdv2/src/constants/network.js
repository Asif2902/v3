// Centralized Network Configuration
// This file contains all network-related configurations

const NETWORK_CONFIG = {
  // Chain Information
  CHAIN_ID: 143,
  CHAIN_HEX: "0x8f",
  CHAIN_NAME: "Monad Mainnet",
  CHAIN_EXPLORER: "https://monadscan.com/",

  // RPC Endpoints (in order of preference)
  RPC_ENDPOINTS: [
    "https://rpc.monad.xyz",
    "https://rpc1.monad.xyz",
    "https://rpc2.monad.xyz",
    "https://rpc3.monad.xyz",
    "https://rpc4.monad.xyz"
  ],

  // Primary RPC (default)
  PRIMARY_RPC: "https://rpc.monad.xyz",

  // Contract Addresses
  CONTRACTS: {
    AGGREGATOR: "0xd2748ceA2ADa9Bfc4eDA8AD7fe170f8a6A0EABe8",
    MULTI_SPLIT_HOP: "0x7dd7fc9380e3107028a158f49bd25a8a8d48b225"
  },

  // Network Settings
  SETTINGS: {
    BLOCK_TIME: 1000, // ms
    CONFIRMATION_BLOCKS: 1,
    GAS_BUFFER_PERCENTAGE: 30 // 30% buffer for gas estimates
  }
};

// Helper function to get current RPC endpoint
function getCurrentRPC(index = 0) {
  return NETWORK_CONFIG.RPC_ENDPOINTS[index % NETWORK_CONFIG.RPC_ENDPOINTS.length];
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NETWORK_CONFIG, getCurrentRPC };
}
