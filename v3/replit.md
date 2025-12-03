# Mon Bridge Dex

## Overview

Mon Bridge Dex is a decentralized exchange (DEX) aggregator built for the Monad blockchain network. The application compares multiple DEX routers to deliver optimal swap rates for users trading on Monad Mainnet (Chain ID: 143). The project is currently implemented as a static vanilla JavaScript application with a modular architecture designed for future React conversion.

**Key Features:**
- Multi-DEX aggregation for best swap rates
- Liquidity pool management (add/remove)
- Multi-split routing for optimized trades
- Real-time price tracking and transaction simulation
- Transaction history and notifications

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- Pure vanilla JavaScript (ES6+)
- HTML5 with semantic markup
- CSS3 with CSS custom properties for theming
- No build tools or bundlers currently used

**Modular File Organization:**
The codebase is organized in a React-ready folder structure to facilitate future migration:

```
src/
├── constants/        # Configuration and static data
├── lib/             # Utility libraries
├── services/        # Shared services
├── contexts/        # State management
├── components/      # Reusable UI components
├── features/        # Feature-based modules
│   ├── swap/
│   ├── liquidity/add/
│   └── liquidity/remove/
└── styles/          # Global styles
```

**Design Patterns:**
- Feature-based module organization (swap, add liquidity, remove liquidity)
- Separation of concerns: state, services, components, and utilities
- Barrel exports via index.js files for clean imports
- Event-driven architecture for UI interactions

**State Management:**
- Global state objects attached to `window` for cross-module access
- LocalStorage for persistence (transaction history, user preferences, imported tokens)
- No formal state management library (designed for future Context API or Redux)

### Blockchain Integration

**Web3 Provider:**
- ethers.js v5 for blockchain interactions
- Multi-RPC endpoint support with automatic failover
- Custom rate limiter to prevent RPC endpoint throttling

**Smart Contract Interactions:**

1. **Aggregator Contract** (`0xd2748ceA2ADa9Bfc4eDA8AD7fe170f8a6A0EABe8`)
   - Primary routing logic
   - Compares multiple DEX outputs
   - Returns optimal swap paths

2. **Multi-Split Hop Contract** (`0x7dd7fc9380e3107028a158f49bd25a8a8d48b225`)
   - Advanced routing with split trades
   - Multi-hop path optimization
   - Fee-on-transfer token support

3. **DEX Router Integration:**
   - Supports 7 Uniswap V2-style routers (Dyor Swap, PancakeSwap V2, Pinot Finance, Octoswap V2, Purp Swap, Uniswap V2, zkSwap V2)
   - Factory contract pattern for pair discovery
   - ERC20 token approval management

**Transaction Flow:**
1. User input triggers rate-limited price estimation
2. Multiple DEX routers queried in parallel
3. Best route selected based on output amount
4. Optional transaction simulation before execution
5. Approval check and execution with user confirmation
6. Transaction tracking and history updates

**Network Configuration:**
- Chain ID: 143 (Monad Mainnet)
- 5 RPC endpoints with automatic rotation on failure
- 30% gas buffer for estimates
- 1-block confirmation requirement

### Key Architectural Decisions

**Rate Limiting & Performance:**
- **Problem:** Public RPC endpoints have strict rate limits
- **Solution:** Custom `RateLimiter` class with queue management and circuit breaker pattern
- **Benefits:** Prevents endpoint bans, graceful degradation, automatic retry logic
- **Trade-offs:** Slightly slower response times during high load

**Caching Strategy:**
- **Problem:** Frequent redundant blockchain queries
- **Solution:** Multi-level caching with TTL (token balances: 5s, routes: 10s, prices: 30s)
- **Benefits:** Reduced RPC calls, faster UI updates
- **Trade-offs:** Potential stale data, cache invalidation complexity

**Token Import System:**
- **Problem:** Users need to trade unknown tokens
- **Solution:** On-chain metadata fetching with local storage persistence
- **Benefits:** Unlimited token support, no centralized token list dependency
- **Trade-offs:** Trust model relies on user verification

**Routing Modes:**
- **Auto Mode:** Automatic route optimization with 10-second refresh
- **Manual Mode:** User locks route with 20-second refresh
- **Rationale:** Balances price accuracy with transaction control

**Slippage Protection:**
- **Auto Slippage:** Dynamically calculated based on liquidity
- **Custom Slippage:** User-defined tolerance (0.1% - 50%)
- **High Impact Warning:** Modal confirmation for >15% price impact

**Transaction Simulation:**
- **Problem:** Transactions may fail due to slippage, insufficient funds, or contract logic
- **Solution:** Pre-execution simulation using `eth_call`
- **Benefits:** Prevents failed transactions and wasted gas
- **Trade-offs:** Additional RPC call overhead

### Code Organization

**Modularization Strategy:**

Large monolithic scripts have been refactored into feature-based modules:

- **Swap Feature** (17 files): State, services (balance, contracts, estimation, price, provider, swap, tokens, wallet, rateLimiter, refresh), components (notifications, settings, tokenWarning, ui), utils
- **Add Liquidity Feature** (13 files): State, services (approval, dexPools, poolInfo, refresh, simulation, transaction, transactionHistory, walletIntegration), components (inputHandlers, modals, tokenHandlers)
- **Remove Liquidity Feature** (10 files): State, services (lpInfo, tokenBalance, transaction, transactionHistory, wallet), components (estimatedOutput, modals, tokenSelectors), init

**File Dependency Management:**
- HTML files load scripts in dependency order via `<script>` tags
- Barrel index.js files document load order for future bundler integration
- Global namespace objects (`window.lpState`, `window.walletManager`) bridge modules

**Wallet Management:**
- Centralized `WalletManager` class in `contexts/wallet.js`
- Event-based callbacks for connection/disconnection
- Persistent wallet state in localStorage
- Silent reconnection on page load

## External Dependencies

### Third-Party Services

**Blockchain RPC Providers:**
- Primary: `https://rpc.monad.xyz`
- Fallbacks: rpc1, rpc2, rpc3, rpc4 (monad.xyz subdomains)
- Provider rotation on failure

**Price Oracle:**
- DexScreener API (`api.dexscreener.com`)
- Provides USD prices for tokens
- Used for display purposes only (not for routing)

**Block Explorer:**
- MonadScan (`https://monadscan.com/`)
- Transaction verification and history

### JavaScript Libraries

**ethers.js v5:**
- Loaded from CDN: `https://monbridgedex.xyz/ethers.js`
- Core library for all blockchain interactions
- No other NPM dependencies for blockchain functionality

**Static File Serving:**
- `serve` package (v14.2.5) - Development server
- Vercel for production deployment with custom routing

### External Assets

**Fonts:**
- Google Fonts: Inter (weights 100-900)

**Images:**
- Token logos hosted on external CDN (ImageDelivery.net)
- Fallback to local `unknown.png` for unrecognized tokens
- Logo references stored in token metadata

### Contract Dependencies

**Standard Interfaces:**
- Uniswap V2 Router ABI
- Uniswap V2 Factory ABI
- Uniswap V2 Pair ABI
- ERC20 ABI

**Custom Contracts:**
- Mon Bridge Dex Aggregator (proprietary routing logic)
- Multi-Split Hop Router (advanced path finding)

### Configuration Files

**Vercel Routing:**
- Custom route mappings for clean URLs
- SPA-style fallback routing

**localStorage Schema:**
- `importedTokens`: User-added token list
- `transactionHistory`: Swap transaction records
- `addLpTransactionHistory`: Add liquidity records
- `removeLpTransactionHistory`: Remove liquidity records
- `notificationState`: Read/unread tracking
- `walletConnection`: Persistent wallet state
- `slippageTolerance`: User preferences
- `tokenWarningCache`: 24-hour warning suppression