
// Centralized Token List Configuration
// This file contains all token definitions used across the application

const defaultTokens = [
  { symbol: "MON", address: "MON", decimals: 18, logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/MON.png/public" },
  { symbol: "WMON", address: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A", decimals: 18, logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/I_t8rg_V_400x400.jpg/public" },
  { symbol: "USDC", address: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", decimals: 6, logo: "https://monbridgedex.xyz/usdc.png" },
  { symbol: "WBTC", address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c", decimals: 8, logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/wbtc.png/public" },
  { symbol: "WETH", address: "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242", decimals: 18, logo: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/weth.jpg/public" }
];

const unknownLogo = "https://monbridgedex.xyz/unknown.png";

// Get all tokens including imported ones
function getAllTokens() {
  const importedTokens = JSON.parse(localStorage.getItem('importedTokens')) || [];
  return [...defaultTokens, ...importedTokens];
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { defaultTokens, unknownLogo, getAllTokens };
}
