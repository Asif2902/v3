# Mon Bridge Dex UI

## Project Overview
Mon Bridge Dex is an advanced DEX (Decentralized Exchange) aggregator for the Monad Testnet. The platform compares multiple DEX routers to deliver the best swap rates for crypto trading.

**Purpose**: Provide users with optimal swap rates by aggregating and comparing multiple decentralized exchanges on Monad Testnet.

**Current State**: Project restructured with React-ready folder architecture for easier future conversion to React.

## Recent Changes
- **November 30, 2025**: React-Ready Restructuring
  - **Reorganized entire codebase into React-compatible folder structure**:
    - Created `src/constants/` for configuration files (network.js, tokenlist.js, routers.js, abis.js)
    - Created `src/lib/` for utility libraries (rateLimiter.js, formatters.js, helper.js)
    - Created `src/services/` for shared services (contracts.js, notifications.js)
    - Created `src/contexts/` for state management (wallet.js)
    - Created `src/components/common/` for shared UI components (animation.js, dropdown-nav.js, token-modal.js)
    - Created `src/hooks/` for future React hooks
    - Created `src/features/` for feature-based organization:
      - `features/swap/` - Swap functionality with components, services, state, utils folders
      - `features/liquidity/add/` - Add liquidity with components, services, state folders
      - `features/liquidity/remove/` - Remove liquidity with components, services, state, init folders
  - **Split large Removelp.js (717 lines) into modular files**:
    - `state/index.js` - State variables and configuration
    - `services/wallet.js` - Wallet integration
    - `services/tokenBalance.js` - Token balance fetching
    - `services/lpInfo.js` - LP pool information
    - `services/transaction.js` - Transaction execution
    - `services/transactionHistory.js` - Transaction history management
    - `components/tokenSelectors.js` - Token selection UI
    - `components/estimatedOutput.js` - Estimated output display
    - `components/modals.js` - Confirmation modals
    - `init/index.js` - Initialization and event listeners
  - **Updated all HTML files** to reference new file paths
  - **Created barrel index.js files** for clean imports

- **November 29, 2025**: Modularized Add LP Script Architecture
  - Refactored Lp.js into 13 modular files

- **November 29, 2025**: Modularized Swap Script Architecture
  - Refactored script.js into 17 modular files

- **November 24, 2025**: Mainnet Migration
  - Updated to Monad Mainnet (Chain ID: 143)

## Project Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Blockchain Integration**: ethers.js for Web3 wallet connectivity
- **Serving**: npx serve for static file hosting
- **Network**: Monad Mainnet (Chain ID: 143)

### File Structure (React-Ready)
```
.
├── index.html              # Main swap interface
├── Lp.html                 # Liquidity pool creation page
├── RemoveLp.html           # Pool management page
├── src/
│   ├── constants/          # Configuration & static data
│   │   ├── abis.js         # Smart contract ABIs
│   │   ├── network.js      # Network configuration
│   │   ├── routers.js      # DEX router addresses
│   │   ├── tokenlist.js    # Token definitions
│   │   └── index.js        # Barrel export
│   ├── lib/                # Utility libraries
│   │   ├── formatters.js   # Data formatting functions
│   │   ├── helper.js       # Helper utilities
│   │   ├── rateLimiter.js  # API rate limiting
│   │   └── index.js        # Barrel export
│   ├── services/           # Shared services
│   │   ├── contracts.js    # Contract utilities
│   │   ├── notifications.js # Notification system
│   │   └── index.js        # Barrel export
│   ├── contexts/           # State management (future React contexts)
│   │   ├── wallet.js       # Wallet state & connection
│   │   └── index.js        # Barrel export
│   ├── components/         # UI components
│   │   └── common/         # Shared components
│   │       ├── animation.js     # UI animations
│   │       ├── dropdown-nav.js  # Navigation
│   │       ├── token-modal.js   # Token selection modal
│   │       └── index.js         # Barrel export
│   ├── hooks/              # Future React hooks
│   ├── features/           # Feature-based modules
│   │   ├── swap/           # Swap feature
│   │   │   ├── components/     # UI components (settings, notifications, ui, tokenWarning)
│   │   │   ├── services/       # Business logic (swap, estimation, price, balance, etc)
│   │   │   ├── state/          # State management
│   │   │   ├── utils/          # Utilities
│   │   │   └── index.js        # Feature entry point
│   │   └── liquidity/      # Liquidity features
│   │       ├── add/        # Add liquidity
│   │       │   ├── components/   # UI (inputHandlers, tokenHandlers, modals)
│   │       │   ├── services/     # Logic (dexPools, poolInfo, transaction, etc)
│   │       │   ├── state/        # State management
│   │       │   └── index.js      # Feature entry point
│   │       └── remove/     # Remove liquidity
│   │           ├── components/   # UI (tokenSelectors, estimatedOutput, modals)
│   │           ├── services/     # Logic (wallet, lpInfo, transaction, etc)
│   │           ├── state/        # State management
│   │           ├── init/         # Initialization
│   │           └── index.js      # Feature entry point
│   └── styles/
│       └── styles.css      # Global styles
└── package.json            # Dependencies
```

### Key Features
1. **Token Swapping**: Compare multiple DEX routes for best output
2. **Liquidity Pools**: Create and manage liquidity pools
3. **Routing Modes**: 
   - Auto (best route selection)
   - Single router
   - Multi-split hops
4. **Transaction Settings**: Configurable slippage and deadline
5. **Transaction Simulation**: Pre-swap validation
6. **Wallet Integration**: MetaMask and other Web3 wallet support
7. **Transaction History**: Track completed swaps

### Architecture Decisions
- **React-Ready Structure**: Organized for easy conversion to React
- **Feature-First Organization**: Each feature (swap, add LP, remove LP) is self-contained
- **Shared Code**: Common utilities, components, and services extracted
- **Barrel Exports**: Index.js files for clean imports
- **Static Site**: Uses simple HTTP server for fast deployment
- **Client-side Logic**: All swap calculations and routing performed in browser
- **Web3 Integration**: Direct blockchain interaction via ethers.js
- **Modal-based UI**: Token selection and settings use modal interfaces

## Deployment Configuration
- **Workflow**: `npx serve -l 5000`
- **Port**: 5000 (required for Replit webview)
- **Output Type**: webview (static site hosting)

## External Dependencies
- ethers.js (loaded from CDN: https://monbridgedex.xyz/ethers.js)
- Google Fonts (Inter font family)
- Vercel Analytics (optional tracking script)

## Converting to React
This structure is designed for easy React conversion:
1. Components in `components/` can become React components
2. Services remain as pure functions
3. State in `state/` can become React context or useState hooks
4. Hooks folder ready for custom React hooks
5. Feature folders can become React feature modules

## Notes
- Project is a frontend-only application with no backend server
- All blockchain interactions happen client-side
- Original deployment appears to be on monbridgedex.xyz domain
- Bridge functionality links to external subdomain: monadbridge.com
