# Quick Reference: Getting Started

## Step 1: Install & Configure

```bash
# Install dependencies
npm install

# Open and fill in .env with your Devnet values
# See below for what each value is
code .env
```

## Step 2: Environment Variables Guide

| Variable | What It Is | Where to Get It | Example |
|----------|-----------|-----------------|---------|
| `VITE_SOLANA_RPC_URL` | Solana API endpoint | Fixed for Devnet | `https://api.devnet.solana.com` |
| `VITE_SOLANA_NETWORK` | Network name | Fixed | `devnet` |
| `TREASURY_PRIVATE_KEY` | Treasury wallet secret key (base58) | Your Treasury Devnet wallet | `YourBase58EncodedPrivateKey...` |
| `VITE_SKR_MINT_ADDRESS` | Token address (Devnet) | Your SPL token mint | `11111111111111111111111111111111` |
| `VITE_SKR_DECIMALS` | Token decimal places | Usually 6 for SPL tokens | `6` |
| `VITE_MAGICBLOCK_API_KEY` | Magicblock API key | Magicblock dashboard | `your_api_key_here` |
| `VITE_API_ENDPOINT` | Backend URL (local or Vercel) | Your Vercel project URL | `http://localhost:3000/api` |

## Step 3: Start Development

```bash
npm run dev
```

Then open: **http://localhost:5173**

## Step 4: Test Wallet Connection

1. Open the game in browser
2. Click "Connect Wallet" button (top right of home screen)
3. Approve connection in Phantom wallet
4. See your address and SKR balance displayed

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Phantom not showing | Install extension or check it's unlocked |
| Network mismatch | Ensure Phantom is set to **Devnet** |
| Balance shows 0 | Transfer test SKR tokens to your wallet on Devnet |
| Connection fails | Check `.env` RPC URL and network setting |
| Backend errors | See `api/README.md` for Vercel setup |

## File Location Reference

```
Your Edits:
├── .env ........................... ← FILL THIS IN with your values
├── package.json ................... Ready to use
├── vite.config.js ................. Ready to use
├── js/wallet.js ................... Ready to use
├── api/claim.js ................... Deploy to Vercel
├── program/src/lib.rs ............. Deploy to Devnet (optional)
├── SETUP.md ....................... Full guide
└── IMPLEMENTATION_SUMMARY.md ...... This summary
```

## Key Concepts

### Phantom Wallet
- Browser extension that signs transactions
- Must be connected to **Devnet** for testing
- Handles user authentication

### Solana Devnet
- Test network with free SOL faucet
- Use for development only
- RPC endpoint: `https://api.devnet.solana.com`

### Magicblock Session Keys
- Auto-signs transactions during gameplay
- Placeholder in current code
- Reduces user friction (no popup for every action)

### Treasury
- Backend-controlled wallet holding the SKR payout pool
- Private key stored in environment variables
- Only accessible by Vercel backend

### SKR Token
- Custom SPL token on Devnet
- Awarded to players after each game
- Can be traded/transferred
- Stored in player's token account

## Next: Deployment

### Frontend to Vercel
```bash
npm run build
vercel
```

### Backend Already Deployed
`api/claim.js` is a Vercel function - automatically deployed

### Smart Contract (Optional)
```bash
cd program
anchor build
anchor deploy --provider.cluster devnet
```

---

**Ready?** Update your `.env` file and run `npm run dev` 🚀
