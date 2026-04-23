# Deployment & Web3 Integration Guide

## Overview

This guide covers deploying Seeker GO PWA with Web3/Solana integration to Vercel, including:
- Frontend deployment (Vite build)
- Backend API (Vercel Serverless Functions)
- Solana wallet integration (Phantom)
- Magicblock Session Keys
- Treasury management for SKR payouts

---

## Prerequisites

1. **Solana Devnet Setup**
   - Phantom wallet extension installed
   - Devnet SOL for transaction fees (get from [faucet](https://faucet.solana.com))
   - SKR token mint address
   - Treasury keypair with SPL tokens

2. **Vercel Account**
   - Account at https://vercel.com
   - Git repository (GitHub, GitLab, or Bitbucket)

3. **Development Tools**
   - Node.js 16+ and npm
   - Git CLI

---

## Step 1: Local Development Setup

### 1.1 Clone and Install

```bash
git clone https://github.com/your-username/seeker-go-pwa.git
cd seeker-go-pwa
npm install
```

### 1.2 Configure Environment Variables

Copy the example file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=devnet
VITE_SKR_MINT_ADDRESS=YOUR_SKR_MINT
VITE_SKR_DECIMALS=6
TREASURY_PRIVATE_KEY=YOUR_TREASURY_KEYPAIR
VITE_MAGICBLOCK_API_KEY=YOUR_API_KEY
VITE_API_ENDPOINT=http://localhost:3000/api
```

### 1.3 Get Your Treasury Keypair

If you don't have a treasury keypair yet:

```bash
# Using Solana CLI
solana-keygen new --outfile treasury-keypair.json

# Convert to base58 format (for the private key)
cat treasury-keypair.json | jq -r '.[] | @base64d' | base64 | tail -c +3 | head -c 88
```

Then copy your SPL tokens to the treasury wallet:

```bash
# Using SPL token transfer
spl-token transfer YOUR_SKR_MINT AMOUNT TREASURY_ADDRESS
```

### 1.4 Run Locally

```bash
# Frontend dev server
npm run dev

# Backend API (separate terminal)
npx vercel dev
```

The app will be available at `http://localhost:5173`

---

## Step 2: Prepare for Deployment

### 2.1 Build Frontend

```bash
npm run build
```

This creates the `dist/` folder with optimized assets.

### 2.2 Verify Build

```bash
npm run preview
```

Test the production build locally.

---

## Step 3: Deploy to Vercel

### 3.1 Push to Git Repository

```bash
git add .
git commit -m "Web3 integration with Magicblock and treasury"
git push origin main
```

### 3.2 Import Project to Vercel

1. Go to https://vercel.com/new
2. Select your Git provider (GitHub, GitLab, Bitbucket)
3. Select the `seeker-go-pwa` repository
4. Configure project settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3.3 Set Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

```
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=devnet
VITE_SKR_MINT_ADDRESS=YOUR_SKR_MINT
VITE_SKR_DECIMALS=6
TREASURY_PRIVATE_KEY=YOUR_TREASURY_KEYPAIR (keep this SECRET!)
VITE_MAGICBLOCK_API_KEY=YOUR_API_KEY
VITE_API_ENDPOINT=https://your-domain.vercel.app/api
```

**⚠️ SECURITY WARNING**: The `TREASURY_PRIVATE_KEY` should only be accessible by the backend API, never exposed to the frontend. Vercel automatically protects sensitive environment variables.

### 3.4 Deploy

Click **Deploy** to build and deploy your application.

---

## Step 4: Verify Deployment

### 4.1 Test Frontend

- Visit `https://your-domain.vercel.app`
- Verify the game loads
- Check browser console for errors

### 4.2 Test Wallet Connection

1. Click "Connect Wallet" on home screen
2. Approve connection in Phantom
3. Verify wallet address appears in UI
4. Check console logs for successful initialization

### 4.3 Test Rewards Claim

1. Play a round and earn SKR shards
2. Go to Shop → Cash In
3. Enter amount and confirm
4. Monitor Solscan for transaction confirmation

---

## Configuration Reference

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SOLANA_RPC_URL` | Solana cluster RPC endpoint | `https://api.devnet.solana.com` |
| `VITE_SOLANA_NETWORK` | Network name (for UI) | `devnet` or `mainnet` |
| `VITE_SKR_MINT_ADDRESS` | SPL token mint address | `TokenkegQfe... (base58)` |
| `VITE_SKR_DECIMALS` | Token decimals | `6` |
| `TREASURY_PRIVATE_KEY` | Treasury wallet private key | Base58 encoded keypair |
| `VITE_MAGICBLOCK_API_KEY` | Magicblock API key | From magicblock.dev |
| `VITE_API_ENDPOINT` | Backend API URL | `https://your-domain.vercel.app/api` |

### Vercel Configuration

The `vercel.json` file configures:
- Build settings for Node.js functions
- Static file serving
- API route handling
- Environment variable bindings

---

## Monitoring & Debugging

### View Logs

```bash
# Local API logs
npx vercel logs

# Production function logs
# Via Vercel dashboard → Deployments → Function Logs
```

### Common Issues

#### 1. Wallet Connection Fails
- Check Phantom is installed and unlocked
- Verify RPC endpoint is accessible
- Check browser console for error details

#### 2. Claim Transaction Fails
- Verify treasury has sufficient SPL tokens
- Check treasury private key is valid
- Monitor API function logs on Vercel

#### 3. Session Key Expires
- Session keys are valid for 1 hour
- Implement re-authentication if needed
- Check `getSessionKeyStatus()` return value

#### 4. CORS Issues
- Ensure API endpoint matches `VITE_API_ENDPOINT`
- Check CORS headers in `api/claim.js`
- Verify domain is in Vercel project settings

---

## On-Chain Integration (Option A)

To enable full on-chain recording via SeekerStats program:

### 4.1 Deploy Anchor Program

```bash
cd program
anchor build
anchor deploy --provider.cluster devnet
```

### 4.2 Update Program ID

1. Get deployed program ID from deployment output
2. Update `declare_id!()` in `src/lib.rs`
3. Update wallet.js references

### 4.3 Initialize Player Account

When a player connects wallet for first time:

```javascript
// Automatically initialize player stats on-chain
await initializePlayerOnChain(walletAddress);
```

---

## Production Checklist

- [ ] Environment variables configured in Vercel
- [ ] Treasury private key secured (never in git/code)
- [ ] Phantom wallet tested with testnet SPL tokens
- [ ] API endpoint responds with proper CORS headers
- [ ] Transaction signing verified on Solscan
- [ ] Error handling tested (insufficient balance, network errors)
- [ ] Rate limiting configured (60s cooldown between claims)
- [ ] Monitoring/alerting set up for API errors
- [ ] Backup treasury keypair stored securely

---

## Support & Resources

- **Solana Docs**: https://docs.solana.com
- **Phantom Wallet**: https://phantom.app
- **Magicblock**: https://magicblock.dev
- **Vercel**: https://vercel.com/docs
- **Anchor Framework**: https://www.anchor-lang.com

---

## Troubleshooting

### Can't connect to Phantom

1. Ensure Phantom is installed: https://phantom.app
2. Create/import wallet in Phantom
3. Switch to Devnet in Phantom settings
4. Clear browser cache and try again

### Transaction keeps failing

1. Check treasury has SPL tokens: `spl-token accounts --mint YOUR_MINT`
2. Verify amount is within rate limit
3. Check transaction logs: `solana logs --url devnet`

### API returning 500 error

1. Check Vercel function logs
2. Verify all env vars are set
3. Test locally with `npx vercel dev`
4. Check for syntax errors in `api/claim.js`

---

## Next Steps

1. **Mainnet Migration**: Update RPC URL and mint address for production
2. **Enhanced Magicblock**: Integrate real Session Key signing
3. **Shop Integration**: Add in-game purchases with Session Keys
4. **Leaderboard**: Add on-chain leaderboard via Magicblock indexing
5. **Mobile Wallet Adapter**: Support mobile Solana wallets on Android
