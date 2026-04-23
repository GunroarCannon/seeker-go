# Vercel Backend for SKR Treasury

This directory contains the Vercel serverless functions for handling SKR token payouts from the Treasury account to players.

---

## Overview

The backend API provides a secure endpoint for:
- ✅ Validating player wallet addresses
- ✅ Checking treasury balance
- ✅ Creating and signing token transfer transactions
- ✅ Rate limiting to prevent abuse
- ✅ Error handling and logging

---

## Setup

### 1. Configure Treasury Keypair

First, create or get a Solana devnet keypair with SPL tokens:

```bash
# Create new keypair
solana-keygen new --outfile treasury-keypair.json

# Get the public key
solana address -k treasury-keypair.json

# Transfer SPL tokens to this address
spl-token transfer YOUR_SKR_MINT AMOUNT TREASURY_ADDRESS --fund-recipient
```

### 2. Encode Private Key to Base58

The private key must be base58-encoded:

```bash
# Extract and encode the private key
node -e "
const fs = require('fs');
const bs58 = require('bs58');
const keypair = JSON.parse(fs.readFileSync('treasury-keypair.json'));
const secret = Buffer.from(keypair);
console.log(bs58.encode(secret));
"
```

### 3. Deploy to Vercel

Option A: Via Vercel Dashboard
1. Go to https://vercel.com/new
2. Select your Git repository
3. Add environment variables (see below)
4. Deploy

Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel
```

### 4. Configure Environment Variables

In your Vercel project settings (Settings → Environment Variables), add:

```
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=devnet
TREASURY_PRIVATE_KEY=YOUR_BASE58_ENCODED_PRIVATE_KEY
VITE_SKR_MINT_ADDRESS=YOUR_SKR_MINT_ADDRESS
VITE_SKR_DECIMALS=6
```

**⚠️ SECURITY WARNING**: 
- `TREASURY_PRIVATE_KEY` should be marked as Secret
- Never commit it to Git
- Only accessible by backend functions
- Rotate keys periodically in production

### 5. Update Frontend

Update `.env` with your Vercel API endpoint:

```
VITE_API_ENDPOINT=https://your-project.vercel.app/api
```

---

## API Endpoints

### POST `/api/claim`

Transfer SKR tokens from Treasury to player's wallet.

**Request:**
```bash
curl -X POST https://your-domain.vercel.app/api/claim \
  -H "Content-Type: application/json" \
  -d '{
    "playerWallet": "8Z...vQgd",
    "amount": 100.5
  }'
```

**Request Body:**
```json
{
  "playerWallet": "string (base58 Solana address)",
  "amount": "number (SKR amount in decimal)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "txId": "claim_tx_1234567890_abc123xyz",
  "amount": 100.5,
  "playerWallet": "8ZvQgd...",
  "treasuryAddress": "7XzAb...",
  "network": "devnet",
  "message": "Claim processed. SKR tokens will be transferred shortly.",
  "timestamp": "2024-04-23T12:34:56.789Z"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid input
```json
{
  "error": "Invalid wallet address",
  "details": "..."
}
```

- **402 Payment Required** - Insufficient treasury balance
```json
{
  "error": "Insufficient treasury balance",
  "treasuryBalance": 50,
  "requestedAmount": 100
}
```

- **429 Too Many Requests** - Rate limit exceeded
```json
{
  "error": "Claim cooldown active",
  "cooldownRemainingMs": 45000,
  "message": "Please wait 45s before claiming again"
}
```

- **500 Internal Server Error** - Processing error
```json
{
  "error": "Claim processing failed",
  "details": "..."
}
```

---

## Configuration Reference

### Rate Limiting

- **Cooldown**: 60 seconds between claims per wallet
- **Max Claim**: 1000 SKR per transaction
- **Min Claim**: 0.01 SKR

Adjust in `api/claim.js`:
```javascript
const CLAIM_COOLDOWN_MS = 60000; // 1 minute
const MAX_CLAIM_AMOUNT = 1000;   // Max SKR per claim
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SOLANA_RPC_URL` | Yes | Solana cluster endpoint |
| `VITE_SOLANA_NETWORK` | No | Network name (for logging) |
| `TREASURY_PRIVATE_KEY` | Yes | Base58-encoded keypair |
| `VITE_SKR_MINT_ADDRESS` | Yes | SPL token mint address |
| `VITE_SKR_DECIMALS` | No | Token decimals (default: 6) |

---

## Security Considerations

### Authentication
- **Current**: No authentication required (use in controlled environments)
- **Production**: Implement one of:
  - JWT tokens from frontend auth
  - Signature verification (player signs request)
  - API keys for authorized clients
  - Rate limiting per user/IP

### Private Key Management
- ✅ Never store in `.env` or Git
- ✅ Use Vercel's Secret environment variables
- ✅ Rotate keys regularly (especially on mainnet)
- ✅ Consider HSM or key management service for production
- ✅ Audit access logs periodically

### Transaction Safety
- ✅ Validates wallet address format
- ✅ Checks treasury balance before transfer
- ✅ Verifies amount limits
- ✅ Implements rate limiting
- ✅ Logs all transactions

### Additional Hardening (Production)
```javascript
// Add request signing/verification
const verifyRequest = (req, signature) => {
  // Verify signature against player public key
  return true/false;
};

// Add API key validation
const validateApiKey = (req) => {
  const key = req.headers['x-api-key'];
  return key === process.env.API_KEY;
};

// Add CORS restrictions
res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
```

---

## Monitoring & Debugging

### View Logs

**Local Development:**
```bash
npx vercel dev --debug
```

**Production:**
- Via Vercel Dashboard → Deployments → Function Logs
- Real-time logs: `vercel logs --url your-domain.vercel.app`

### Debug Checklist

- [ ] Treasury has sufficient SPL tokens
- [ ] Private key is valid base58-encoded keypair
- [ ] SKR mint address is correct
- [ ] RPC endpoint is accessible
- [ ] Rate limiting not blocking legitimate requests
- [ ] CORS headers allow frontend domain

### Common Issues

**Error: TREASURY_PRIVATE_KEY not configured**
- Env var not set in Vercel project settings
- Set it in Settings → Environment Variables

**Error: Invalid wallet address**
- Check wallet is valid base58 format
- Verify it's a real Solana address

**Error: Token transfer fails**
- Treasury lacks SPL tokens: `spl-token accounts --owner TREASURY`
- Token account doesn't exist (should auto-create)
- Check Solana network connectivity

---

## Testing

### Test Locally

```bash
# Start local dev server
npx vercel dev

# In another terminal, test the endpoint
curl -X POST http://localhost:3000/api/claim \
  -H "Content-Type: application/json" \
  -d '{
    "playerWallet": "YOUR_TEST_WALLET",
    "amount": 10
  }'
```

### Test on Vercel

1. Deploy to Vercel
2. Use live endpoint: `https://your-project.vercel.app/api/claim`
3. Monitor logs in Vercel dashboard
4. Verify transactions on Solscan

---

## Production Deployment Checklist

- [ ] Treasury keypair securely stored in Vercel
- [ ] Rate limiting configured appropriately
- [ ] Error handling covers all edge cases
- [ ] Logging configured for monitoring
- [ ] CORS headers restrict to known domains
- [ ] Request validation and sanitization in place
- [ ] Authentication implemented (if needed)
- [ ] Backup treasury keypair stored separately
- [ ] Monitoring/alerting configured
- [ ] Tested with real transactions on testnet first

---

## Support

- **Solana Docs**: https://docs.solana.com
- **SPL Token**: https://spl.solana.com/token
- **Vercel Docs**: https://vercel.com/docs
- **Solscan (testnet)**: https://solscan.io?cluster=devnet

