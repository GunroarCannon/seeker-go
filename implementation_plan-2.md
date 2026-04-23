# Web3 & Magicblock Integration Plan

This plan details how we can integrate Solana Wallet connectivity, the Circular Treasury Model, and **Magicblock**, while fully preserving your existing Vanilla JavaScript game logic.

## Goal Description
Implement real Web3 wallet integration to read player SKR balances (for token gating), track off-chain SKR accumulation during gameplay, and payout rewards. This version integrates Vite for building, a Vercel backend for securely holding the treasury, and introduces Magicblock to satisfy the "on-chain" requirement.

## User Review Required

> [!IMPORTANT]
> **Magicblock Integration Strategy**
> You mentioned wanting an "on-chain thing" and preferably usage of Magicblock. Since we want to keep the core game logic in JS, we can't easily put the entire 60FPS game loop on-chain via Magicblock's Ephemeral Rollups. 
> 
> Here are the two ways we can integrate Magicblock and on-chain interactions:
> 
> **Option A: Magicblock Session Keys + Basic On-Chain Logging (Recommended)**
> We will create a very small Solana Smart Contract (in Rust/Anchor) called `SeekerStats`. When a player connects, Magicblock creates a "Session Key" (a temporary wallet that auto-signs on their behalf). When a run ends, the JS game uses the Session Key to seamlessly submit an on-chain transaction to `SeekerStats` recording their score and SKR earned. The Vercel backend listens to these on-chain events and handles the actual payout from the Treasury.
> 
> **Option B: Purely On-Chain Web3 Shop with Magicblock**
> We use Magicblock Session Keys to power an in-game shop. When players buy powerups (Magnet, Shield) using their actual SKR tokens, the Session Key auto-approves the transaction so gameplay isn't interrupted by Phantom popups. The Vercel backend still handles payouts via the Treasury PDA.
> 
> **Which option sounds better to you, or do you want a mix of both? If Option A, I will need to write a small Rust/Anchor smart contract for the on-chain element.**

> [!CAUTION]
> **Wallet Keys**
> Thank you for providing the Devnet keys. I will store them in a local `.env` file and **not** commit them to Git. They will be used by the Vercel backend (Treasury) to fund payouts.

## Proposed Changes

### 1. Framework & Infrastructure
#### [NEW] `package.json` & `vite.config.js`
- Setup Vite and install dependencies: `@solana/web3.js`, `@solana/wallet-adapter-wallets`, and `@magicblock-labs/session-keys`.

#### [NEW] `.env`
- Store the provided Treasury private key securely for backend usage.

### 2. Frontend Wallet & Magicblock UI
#### [MODIFY] `index.html` & `js/wallet.js` (to be created)
- Add "Connect Wallet" button via Solana Wallet Adapter.
- Implement Magicblock Session Key initialization so the player delegates auto-signing for the duration of the game session.

### 3. Backend Treasury
#### [NEW] `api/claim.js` (Vercel Serverless Function)
- A simple backend endpoint that accepts a wallet address and signs the payout transaction using the provided private key, transferring Devnet SKR to the player.

### 4. Smart Contract (If Option A is chosen)
#### [NEW] `program/src/lib.rs`
- A minimal Anchor program to record player scores and runs cryptographically on-chain.

## Verification Plan

### Manual Verification
1. Run `npm run dev` to start the frontend.
2. Click "Connect Wallet" and approve the Magicblock Session Key delegation via Phantom on Devnet.
3. Play a round and intentionally die.
4. Verify an on-chain transaction is fired seamlessly by the Session Key.
5. Click "Claim". Verify the Vercel backend constructed the transaction and check the Phantom wallet balance on Solscan (Devnet) to see the transferred token.
