function IUniswapV2Router02(address) {
  const abi = [
    "function factory() external pure returns (address)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
  ];
  return new ethers.Contract(address, abi, provider);
}

function IUniswapV2Factory(address) {
  const abi = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)"
  ];
  return new ethers.Contract(address, abi, provider);
}

function IUniswapV2Pair(address) {
  const abi = [
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
  ];
  return new ethers.Contract(address, abi, provider);
}

const MULTI_SPLIT_HOP_ADDRESS = NETWORK_CONFIG.CONTRACTS.MULTI_SPLIT_HOP;
const MULTI_SPLIT_HOP_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "address[]", "name": "path", "type": "address[]"},
      {"internalType": "bool", "name": "supportFeeOnTransfer", "type": "bool"},
      {"internalType": "uint16", "name": "userSlippageBPS", "type": "uint16"}
    ],
    "name": "getBestSwapData",
    "outputs": [
      {
        "components": [
          {"internalType": "uint8", "name": "swapType", "type": "uint8"},
          {"internalType": "uint8", "name": "routerType", "type": "uint8"},
          {"internalType": "address", "name": "router", "type": "address"},
          {"internalType": "address[]", "name": "path", "type": "address[]"},
          {"internalType": "uint24[]", "name": "v3Fees", "type": "uint24[]"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
          {"internalType": "uint256", "name": "deadline", "type": "uint256"},
          {"internalType": "bool", "name": "supportFeeOnTransfer", "type": "bool"}
        ],
        "internalType": "struct MonBridgeDex.SwapData",
        "name": "swapData",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {"internalType": "uint8", "name": "swapType", "type": "uint8"},
          {"internalType": "uint8", "name": "routerType", "type": "uint8"},
          {"internalType": "address", "name": "router", "type": "address"},
          {"internalType": "address[]", "name": "path", "type": "address[]"},
          {"internalType": "uint24[]", "name": "v3Fees", "type": "uint24[]"},
          {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
          {"internalType": "uint256", "name": "deadline", "type": "uint256"},
          {"internalType": "bool", "name": "supportFeeOnTransfer", "type": "bool"}
        ],
        "internalType": "struct MonBridgeDex.SwapData",
        "name": "swapData",
        "type": "tuple"
      }
    ],
    "name": "execute",
    "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "address[]", "name": "path", "type": "address[]"},
      {"internalType": "bool", "name": "supportFeeOnTransfer", "type": "bool"},
      {"internalType": "uint16", "name": "userSlippageBPS", "type": "uint16"}
    ],
    "name": "getSplitSwapData",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {"internalType": "uint8", "name": "swapType", "type": "uint8"},
              {"internalType": "uint8", "name": "routerType", "type": "uint8"},
              {"internalType": "address", "name": "router", "type": "address"},
              {"internalType": "address[]", "name": "path", "type": "address[]"},
              {"internalType": "uint24[]", "name": "v3Fees", "type": "uint24[]"},
              {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
              {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
              {"internalType": "uint256", "name": "deadline", "type": "uint256"},
              {"internalType": "bool", "name": "supportFeeOnTransfer", "type": "bool"}
            ],
            "internalType": "struct MonBridgeDex.SwapData[]",
            "name": "splits",
            "type": "tuple[]"
          },
          {"internalType": "uint256", "name": "totalAmountIn", "type": "uint256"},
          {"internalType": "uint256", "name": "totalAmountOutMin", "type": "uint256"},
          {"internalType": "uint16[]", "name": "splitPercentages", "type": "uint16[]"}
        ],
        "internalType": "struct MonBridgeDex.SplitSwapData",
        "name": "splitData",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "WETH",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRouters",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getV3Routers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getV3FeeTiers",
    "outputs": [{"internalType": "uint24[]", "name": "", "type": "uint24[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const aggregatorABI = [
  "function getBestSwap(uint amountIn, address[] calldata path) external view returns (address routerAddress, uint amountOut)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, uint deadline) external returns (uint[] memory amounts)",
  "function getPriceImpact(address router, address tokenIn, address tokenOut, uint amountIn) external view returns (uint priceImpact)"
];

const wmonABI = [
  "function deposit() payable",
  "function withdraw(uint wad)"
];
