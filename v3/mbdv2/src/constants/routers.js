
// Centralized Router List Configuration
// This file contains all DEX router configurations

const DEX_ROUTERS = [
  {
    name: "Dyor Swap",
    address: "0x26CEb692410c4b3C12D63e01CFc03eEA103fc474",
    type: "UniswapV2"
  },
  {
    name: "Pancakeswap V2",
    address: "0xB1Bc24c34e88f7D43D5923034E3a14B24DaACfF9",
    type: "UniswapV2"
  },
  {
    name: "Pinot Finance v2",
    address: "0x452146eb925F089A5999976674f40692aD44549C",
    type: "UniswapV2"
  },
  {
    name: "Octoswap V2",
    address: "0x60fd5Aa15Debd5ffdEfB5129FD9FD8A34d80d608",
    type: "UniswapV2"
  },
  {
    name: "Purp Swap",
    address: "0x22aDf91b491abc7a50895Cd5c5c194EcCC93f5E2",
    type: "UniswapV2"
  },
  {
    name: "Uniswap V2",
    address: "0x4B2ab38DBF28D31D467aA8993f6c2585981D6804",
    type: "UniswapV2"
  },
  {
    name: "zkSwap V2",
    address: "0x68225b5ba7cE309fD0d3f0C9A74b947c7d7e03dA",
    type: "UniswapV2"
  }
];

// V3 Routers for swap route naming
const V3_ROUTERS = [
  {
    name: "Octoswap V3",
    address: "0xBfd2cf709A17c4eEE8DaaF3B96E134408881259e"
  },
  {
    name: "Uniswap V3",
    address: "0xd6145b2D3F379919E8CdEda7B97e37c4b2Ca9c40"
  },
  {
    name: "Pinot Finance v3",
    address:
"0x252b9C1A6C9867a514ea70fe9bBB23621ACc1a50"
  },
  {
    name: "Monday Trade",
    address: "0xFE951b693A2FE54BE5148614B109E316B567632F"
  },
  {
    name: "Capricorn",
    address: "0xdac97b6a3951641B177283028A8f428332333071"
  }
];

// Helper function to get router by address
function getRouterByAddress(address) {
  const normalizedAddress = address.toLowerCase();
  return DEX_ROUTERS.find(r => r.address.toLowerCase() === normalizedAddress);
}

// Helper function to get V3 router by address
function getV3RouterByAddress(address) {
  const normalizedAddress = address.toLowerCase();
  return V3_ROUTERS.find(r => r.address.toLowerCase() === normalizedAddress);
}

// Helper function to get router name (checks both V2 and V3)
function getRouterName(address) {
  const normalizedAddress = address.toLowerCase();
  
  // Check V2 routers first
  const v2Router = DEX_ROUTERS.find(r => r.address.toLowerCase() === normalizedAddress);
  if (v2Router) return v2Router.name;
  
  // Check V3 routers
  const v3Router = V3_ROUTERS.find(r => r.address.toLowerCase() === normalizedAddress);
  if (v3Router) return v3Router.name;
  
  return address;
}

// Helper function to determine if route uses multiple routers
function isMultiRouterPath(routerAddresses) {
  if (!Array.isArray(routerAddresses) || routerAddresses.length <= 1) {
    return false;
  }
  
  // Check if all addresses are the same
  const firstAddress = routerAddresses[0].toLowerCase();
  return !routerAddresses.every(addr => addr.toLowerCase() === firstAddress);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    DEX_ROUTERS, 
    V3_ROUTERS,
    getRouterByAddress, 
    getV3RouterByAddress,
    getRouterName,
    isMultiRouterPath
  };
}
