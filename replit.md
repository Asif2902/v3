# Mon Bridge Dex

## Overview

Mon Bridge Dex is a decentralized exchange (DEX) aggregator built for the Monad blockchain network (Chain ID: 143). The application compares multiple DEX routers to deliver optimal swap rates for users trading on Monad Mainnet.

**Key Features:**
- Multi-DEX aggregation for best swap rates across 7+ DEX routers
- Liquidity pool management (add/remove liquidity)
- Multi-split routing for optimized trades
- Real-time price tracking via DexScreener API integration
- Transaction simulation to prevent failed swaps
- Transaction history with notification system
- Automatic RPC endpoint failover for reliability

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- Pure vanilla JavaScript (ES6+) with ethers.js v5.7.2 for blockchain interactions
- HTML5 with semantic markup
- CSS3 with CSS custom properties for theming
- No build tools or bundlers - all modules loaded via script tags

**Design Philosophy:**
The codebase is intentionally organized in a React-ready folder structure to facilitate future migration to React, despite being pure vanilla JavaScript. This creates clear separation of concerns and makes the codebase maintainable.

**Modular File Organization:**
```
src/
├── constants/        # Configuration (network, tokens, routers, ABIs)
├── lib/             # Utility libraries (rate limiting, formatters, helpers)
├── services/        # Shared services (contracts, notifications)
├── contexts/        # State management (centralized wallet manager)
├── components/      # Reusable UI components (modals, animations, navigation)
├── features/        # Feature-based modules
│   ├── swap/        # Trading functionality (17+ modular files)
│   ├── liquidity/add/    # Add liquidity (13+ modular files)
│   └── liquidity/remove/ # Remove liquidity (10+ modular files)
└── styles/          # Global styles
```

**Key Architectural Decisions:**

1. **Centralized Wallet Management**: A singleton `WalletManager` class in `src/contexts/wallet.js` handles all wallet connections, maintaining a single source of truth for provider, signer, and user address across all pages.

2. **Feature-Based Organization**: Each major feature (swap, add liquidity, remove liquidity) is isolated in its own directory with subdirectories for components, services, state, and utilities. This enables:
   - Easy code splitting when migrating to React
   - Clear dependency boundaries
   - Independent feature testing

3. **Rate Limiting & Circuit Breaking**: Custom `RateLimiter` class with circuit breaker pattern prevents RPC endpoint overload and automatically fails over to backup endpoints.

4. **Caching Strategy**: Multi-level caching for token balances, route calculations, and price data to minimize RPC calls and improve performance.

5. **Event-Driven UI Updates**: The swap feature uses debounced input handlers and scheduled refresh intervals to provide real-time price updates without overwhelming the RPC endpoints.

### External Dependencies

**Blockchain Integration:**
- **Ethers.js v5.7.2** - Core Web3 library for wallet connection and smart contract interactions
- **MetaMask/Web3 Wallets** - User wallet connectivity via `window.ethereum`

**Network Configuration:**
- **Monad Mainnet** (Chain ID: 143)
- **RPC Endpoints**: 5 redundant endpoints with automatic failover
  - Primary: `https://rpc.monad.xyz`
  - Fallbacks: `rpc1.monad.xyz` through `rpc4.monad.xyz`
- **Block Explorer**: `https://monadscan.com/`

**Smart Contracts:**
- **Aggregator Contract**: `0xd2748ceA2ADa9Bfc4eDA8AD7fe170f8a6A0EABe8` - Routes swaps through multiple DEXes
- **Multi-Split Hop Contract**: `0x7dd7fc9380e3107028a158f49bd25a8a8d48b225` - Handles complex multi-path routing

**DEX Router Integrations:**
The application integrates with 7 Uniswap V2-compatible DEX routers:
- Dyor Swap, Pancakeswap V2, Pinot Finance, Octoswap V2, Purp Swap, Uniswap V2, zkSwap V2
- V3 routers (Octoswap V3, Uniswap V3) used for route naming only

**Third-Party APIs:**
- **DexScreener API** (`https://api.dexscreener.com`) - Token price discovery, logo fetching, and market data
  - Used for MON price tracking via WMON pairs
  - Token search and profile information
  - 5-minute cache for profile data

**Static Asset CDN:**
- Token logos and assets served from `https://monbridgedex.xyz/` and `https://imagedelivery.net/`

**Deployment & Hosting:**
- Configured for Vercel deployment with custom routing (`vercel.json`)
- Local development via `serve` package

**Data Persistence:**
- **LocalStorage** - Transaction history, imported tokens, user preferences (slippage, deadlines), notification state, wallet connection data
- No backend database - fully client-side application

**Browser Requirements:**
- Modern browser with ES6+ support
- Web3 wallet extension (MetaMask or compatible)