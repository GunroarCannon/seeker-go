# Web3 & Magicblock Integration Setup Guide

## Overview

This setup integrates Solana wallet connectivity, Magicblock Session Keys, and a circular treasury model to your Seeker GO PWA game. Players can now:

- Connect their Phantom wallet
- View their SKR token balance
- Record on-chain scores via Magicblock Session Keys
- Claim rewards from the Treasury

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit `.env` and fill in your Devnet configuration:

```env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=devnet

# Treasury wallet private key (NEVER commit this)
TREASURY_PRIVATE_KEY=YOUR_BASE58_DEVNET_PRIVATE_KEY

# SKR token configuration
VITE_SKR_MINT_ADDRESS=YOUR_SKR_MINT_ADDRESS
VITE_SKR_DECIMALS=6

# Magicblock API key
VITE_MAGICBLOCK_API_KEY=YOUR_MAGICBLOCK_API_KEY

# Backend URL (local dev)
VITE_API_ENDPOINT=http://localhost:3000/api
```

### 3. Run Development Server

```bash
npm run dev
```

The game will be available at `http://localhost:5173`

### 4. Test Wallet Connection

1. Ensure you have **Phantom Wallet** extension installed and connected to **Devnet**
2. Click "Connect Wallet" on the home screen
3. Approve the connection in Phantom
4. You should see your wallet address and SKR balance

## Architecture

### Frontend (`js/wallet.js`)

- **Solana Connection**: Initializes connection to Devnet RPC
- **Phantom Wallet**: Handles wallet connection and signing
- **Magicblock Session Keys**: Auto-signs transactions during gameplay (placeholder)
- **SKR Balance**: Fetches player's token balance
- **On-Chain Submission**: Records run scores on-chain (Option A)
- **Reward Claiming**: Submits claim requests to backend

### Backend (`api/claim.js`)

- **Vercel Serverless Function**: Handles secure payout transactions
- **Treasury Key Management**: Signs transactions with the Treasury private key
- **Token Transfer**: Transfers SKR tokens to player wallets
- **Error Handling**: Catches and reports failures

### Smart Contract (`program/src/lib.rs`)

- **Option A Integration**: Anchor program to record player stats on-chain
- **PlayerStats Account**: Stores cumulative player statistics
- **Events**: Emits `PlayerInitialized` and `RunRecorded` events
- **Seed PDAs**: Uses player address as seed for deterministic account generation

## File Structure

```
seeker-go-pwa/
├── package.json           # Dependencies
├── vite.config.js         # Vite build config
├── .env                   # Secrets (DO NOT COMMIT)
├── .gitignore             # Excludes .env and node_modules
├── index.html             # Updated with wallet UI
├── js/
│   └── wallet.js          # Web3 integration module
├── api/
│   ├── claim.js           # Vercel payout endpoint
│   └── README.md          # Backend setup guide
└── program/               # Anchor smart contract
    ├── Cargo.toml
    └── src/
        └── lib.rs         # SeekerStats program
```

## Integration Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` configured with Devnet keys
- [ ] Phantom wallet installed and connected to Devnet
- [ ] Dev server running (`npm run dev`)
- [ ] Wallet connection working
- [ ] SKR balance displaying correctly
- [ ] Backend configured and deployed (see `api/README.md`)
- [ ] Anchor program compiled and deployed (if using Option A)

## Testing Verification

### Manual Verification Steps

1. **Wallet Connection**
   - Start dev server
   - Click "Connect Wallet"
   - Approve in Phantom
   - See wallet address displayed

2. **Balance Check**
   - Connect wallet
   - Verify SKR balance displays
   - Toast notification shows balance

3. **On-Chain Score (Option A)**
   - Play a game
   - Finish the run
   - Check if on-chain transaction is submitted
   - View event logs for confirmation

4. **Claim Rewards**
   - Navigate to shop
   - Try "Cash Out" feature
   - Verify backend processes claim
   - Check Solscan (Devnet) for transaction

## Troubleshooting

### Wallet Not Connecting
- Ensure Phantom is installed and unlocked
- Check Phantom is set to **Devnet** network
- Verify browser console for error messages
- Check `.env` RPC URL is valid

### Balance Not Showing
- Ensure player wallet has SKR tokens on Devnet
- Check `VITE_SKR_MINT_ADDRESS` in `.env`
- Verify RPC endpoint is working
- Check browser network tab for API calls

### Backend Errors
- Ensure `TREASURY_PRIVATE_KEY` is valid base58
- Check Vercel environment variables match `.env`
- Verify Treasury wallet has sufficient SOL for gas
- Enable Vercel logs to debug transactions

## Security Notes

⚠️ **IMPORTANT**:

1. **NEVER commit `.env`** - It contains sensitive private keys
2. **Use Devnet only** for testing
3. **Rotate keys** before mainnet deployment
4. **Enable rate limiting** on Vercel endpoints
5. **Add authentication** for production claims
6. **Audit the Anchor program** before mainnet

## Next Steps

1. Configure your Devnet Treasury wallet with initial SKR balance
2. Deploy the Anchor program to Devnet (see program README)
3. Deploy backend to Vercel with production keys
4. Test end-to-end workflow on Devnet
5. Prepare for mainnet migration (update RPC, keys, token mint)

## Support

For issues with:
- **Phantom wallet**: See https://docs.phantom.app/
- **Solana devnet**: See https://docs.solana.com/
- **Anchor programs**: See https://www.anchor-lang.com/
- **Magicblock**: See https://magicblock.org/

---

**Created**: April 2026  
**Network**: Devnet  
**Status**: Development
