# Seeker GO PWA - Quick Reference Guide

## Overview

Seeker GO PWA is a web3-enabled arcade game with Solana wallet integration and in-game cryptocurrency rewards. This guide provides quick reference for key functionality.

---

## Quick Start for Developers

### 1. Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
# - VITE_SKR_MINT_ADDRESS (your SPL token)
# - TREASURY_PRIVATE_KEY (base58-encoded)
# - VITE_MAGICBLOCK_API_KEY (from magicblock.dev)

# Run locally
npm run dev              # Frontend: localhost:5173
npx vercel dev          # Backend: localhost:3000
```

### 2. Key Imports

```javascript
// In your game code:
import * as Wallet from './js/wallet.js';

// Initialize on startup
Wallet.initializeSolana();

// In game loop
Wallet.load();  // Load saved state
Wallet.earn(10);  // Player earned 10 SKR
Wallet.save();  // Save state

// On wallet connection
if (Wallet.isWalletConnected()) {
  const address = Wallet.getCurrentWallet();
}

// For claims
await Wallet.claimRewards(100);
```

---

## Game Integration Points

### Earning Rewards

When player collects shards or completes objectives:

```javascript
// Add to game balance
Wallet.earn(0.05);  // 0.05 SKR per shard

// On game over, total earned
const totalEarned = +(skrCount * SKR_PER_SHARD).toFixed(2);
Wallet.earn(totalEarned);
Wallet.save();  // Persist to localStorage
```

### Spending Balance

When player buys power-ups:

```javascript
// Try to spend
const success = Wallet.spend(25);  // 25 SKR power-up cost
if (success) {
  // Apply power-up
} else {
  // Not enough SKR
}
```

### Shop Integration

```html
<!-- Show balance in UI -->
<div id="shop-bal">
  <span id="shop-bal">0</span> SKR
</div>
```

```javascript
// Update display
function updateShopBal() {
  document.getElementById('shop-bal').textContent = 
    Wallet.skr.toFixed(2);
}

// Listen for changes
document.addEventListener('wallet-update', updateShopBal);
```

### Claiming Rewards

```javascript
// When user submits claim request
async function handleClaimRewards(amount) {
  if (!Wallet.isWalletConnected()) {
    alert('Connect wallet first');
    return;
  }

  const txId = await Wallet.claimRewards(amount);
  if (txId) {
    // Success - tokens transferred to user wallet
    console.log(`Claimed! Transaction: ${txId}`);
  } else {
    // Failed - show error
    console.error('Claim failed');
  }
}
```

---

## API Reference

### Wallet Module

| Function | Returns | Description |
|----------|---------|-------------|
| `initializeSolana()` | Connection | Initialize Solana connection |
| `connectWallet()` | string (address) or null | Connect Phantom wallet |
| `disconnectWallet()` | void | Disconnect wallet |
| `isWalletConnected()` | boolean | Check if connected |
| `getCurrentWallet()` | string or null | Get connected wallet address |
| `earn(amount)` | void | Add to game balance |
| `spend(amount)` | boolean | Deduct from balance |
| `getBalance()` | number | Get current balance |
| `save()` | void | Save to localStorage |
| `load()` | void | Load from localStorage |
| `claimRewards(amount)` | string (txId) or null | Submit claim to backend |
| `submitOnChainScore(distance, skr)` | string (txId) or null | Record score on-chain |
| `getPlayerSKRBalance(address)` | number | Fetch on-chain balance |
| `getSessionKeyStatus()` | object | Check session key expiry |

### Properties

```javascript
Wallet.skr  // Current game balance (off-chain)
```

---

## Environment Variables

**Frontend (.env file):**
```
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=devnet
VITE_SKR_MINT_ADDRESS=TokenkegQf...  # Your SPL mint
VITE_SKR_DECIMALS=6
VITE_MAGICBLOCK_API_KEY=your_key
VITE_API_ENDPOINT=http://localhost:3000/api  # Local dev
```

**Backend (Vercel env vars):**
```
TREASURY_PRIVATE_KEY=base58_encoded_key  # NEVER in git!
VITE_SKR_MINT_ADDRESS=TokenkegQf...
VITE_SKR_DECIMALS=6
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## Common Scenarios

### Scenario 1: Player Connects Wallet

```javascript
$('connect-btn').addEventListener('click', async () => {
  const address = await Wallet.connectWallet();
  if (address) {
    console.log(`Connected: ${address}`);
    // Update UI
    $('wallet-status').textContent = address.slice(0, 8) + '…';
  }
});
```

### Scenario 2: Player Earns and Saves

```javascript
// During gameplay
function collectShard() {
  skrCount += 1;
  Wallet.earn(0.05);
}

// On app close
window.addEventListener('beforeunload', () => {
  Wallet.save();
});
```

### Scenario 3: Player Cashes Out

```javascript
async function cashOut(amount) {
  // Validate
  if (amount < 10) {
    alert('Minimum 10 SKR');
    return;
  }
  
  if (amount > Wallet.skr) {
    alert('Insufficient balance');
    return;
  }

  // Process claim
  try {
    const txId = await Wallet.claimRewards(amount);
    if (txId) {
      // Deduct already happened in claimRewards()
      alert(`✓ Claimed! TxId: ${txId}`);
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
}
```

### Scenario 4: Buy Power-Up in Shop

```javascript
function buyPowerUp(powerUp) {
  const cost = powerUp.cost;
  
  if (Wallet.spend(cost)) {
    // Activate power-up
    applySKRMagnet();
    updateShopBal();
    
    // Save state
    Wallet.save();
  } else {
    toast('Not enough SKR', 't-red');
  }
}
```

---

## Debugging

### Enable Logs

All wallet operations log to console. Monitor:

```javascript
// In browser console
localStorage.getItem('gameState')  // View saved balance
```

### Check Wallet Status

```javascript
// In browser console
console.log(Wallet.isWalletConnected());
console.log(Wallet.getCurrentWallet());
console.log(Wallet.skr);
console.log(Wallet.getSessionKeyStatus());
```

### Test Claim Endpoint

```bash
# From terminal
curl -X POST http://localhost:3000/api/claim \
  -H "Content-Type: application/json" \
  -d '{
    "playerWallet": "YOUR_WALLET",
    "amount": 10
  }'
```

---

## Error Handling

### Common Errors

```javascript
// "Wallet not connected"
if (!Wallet.isWalletConnected()) {
  toast('Connect wallet from home screen', 't-red');
}

// "Insufficient balance"
if (amount > Wallet.skr) {
  toast('Not enough SKR', 't-red');
}

// "Rate limited"
// (Automatic - wait 60s between claims)

// "Session key expired"
const status = Wallet.getSessionKeyStatus();
if (!status.isActive) {
  // Re-initialize or re-connect
}
```

---

## Events

The wallet module emits custom events:

```javascript
// Listen for wallet updates
document.addEventListener('wallet-update', (e) => {
  console.log('Balance updated:', e.detail.skr);
});

// Listen for score submission
document.addEventListener('scoreSubmitted', (e) => {
  console.log('Score recorded:', e.detail);
});

// Listen for rewards claimed
document.addEventListener('rewardsClaimed', (e) => {
  console.log('Rewards claimed:', e.detail);
});
```

---

## Useful Links

- **Solana Docs**: https://docs.solana.com
- **Phantom Wallet**: https://phantom.app
- **SPL Token**: https://spl.solana.com/token
- **Magicblock**: https://magicblock.dev
- **Vercel**: https://vercel.com
- **Anchor**: https://www.anchor-lang.com
- **Solscan**: https://solscan.io?cluster=devnet

---

## Support

For issues or questions:
1. Check browser console for error messages
2. Review the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
3. Check the [API documentation](./api/README.md)
4. Review [Anchor documentation](./program/Cargo.toml) for smart contract issues
