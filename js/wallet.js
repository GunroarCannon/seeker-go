/**
 * Wallet & Magicblock Session Key Integration
 * Handles Solana wallet connection, token balance checks, and on-chain score submission
 * 
 * Session Keys enable auto-signing during gameplay without wallet popups
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';

// Magicblock Session Key configuration
const SESSION_KEY_CONFIG = {
  DURATION: 3600, // 1 hour in seconds
  MAX_TRANSACTIONS: 100, // Max transactions per session
  MAX_TOKEN_AMOUNT: 10000, // Max tokens per transaction (0.01 SOL equivalent)
  SCOPE: ['claim', 'purchase'], // Allowed actions
};

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
const SKR_MINT = import.meta.env.VITE_SKR_MINT_ADDRESS;
const SKR_DECIMALS = parseInt(import.meta.env.VITE_SKR_DECIMALS || '6');
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';

let connection = null;
let walletAdapter = null;
let sessionKeyManager = null;
let playerWalletAddress = null;
let sessionKeyWallet = null;

// Game state: off-chain SKR balance
let gameState = {
  skr: 0, // Off-chain balance accumulated during gameplay
};

/**
 * Initialize Solana Connection
 */
export function initializeSolana() {
  connection = new Connection(RPC_URL, 'confirmed');
  console.log(`✓ Connected to Solana ${NETWORK}`);
  return connection;
}

/**
 * Connect wallet and initialize Magicblock Session Key
 */
export async function connectWallet() {
  if (!window.phantom?.solana) {
    alert('Phantom wallet not found. Please install it from https://phantom.app');
    return null;
  }

  try {
    // Connect to Phantom wallet
    const resp = await window.phantom.solana.connect();
    playerWalletAddress = resp.publicKey.toString();
    walletAdapter = window.phantom.solana;
    console.log(`✓ Connected wallet: ${playerWalletAddress}`);
    
    // Initialize Magicblock Session Key for auto-signing
    await initializeMagicblockSessionKey(playerWalletAddress);
    
    return playerWalletAddress;
  } catch (err) {
    console.error('Failed to connect wallet:', err);
    return null;
  }
}

/**
 * Initialize Magicblock Session Key for auto-signing transactions
 * This allows seamless in-game transactions without interrupting gameplay
 */
async function initializeMagicblockSessionKey(walletAddress) {
  try {
    // In production with real Magicblock:
    // const sessionKeys = await SessionKeysManager.create({
    //   rpcConnection: connection,
    //   playerWallet: new PublicKey(walletAddress),
    //   // Session key valid for 1 hour
    //   expiresIn: 3600,
    // });
    
    console.log(`✓ Magicblock Session Key initialized for ${walletAddress}`);
    
    // For now, create a mock session key manager
    sessionKeyManager = {
      playerWallet: new PublicKey(walletAddress),
      isActive: true,
      createdAt: Date.now(),
      expiresIn: 3600000, // 1 hour
    };
    
    // Store in localStorage for persistence
    localStorage.setItem('sessionKeyCreated', Date.now().toString());
    
  } catch (err) {
    console.error('Failed to initialize Magicblock Session Key:', err);
    sessionKeyManager = null;
  }
}

/**
 * Get Player SKR Balance from blockchain
 */
export async function getPlayerSKRBalance(walletAddress) {
  if (!connection) {
    console.error('Solana connection not initialized');
    return 0;
  }

  try {
    if (!SKR_MINT) {
      console.warn('SKR_MINT not configured, returning 0');
      return 0;
    }

    const wallet = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      mint: new PublicKey(SKR_MINT),
    });

    if (tokenAccounts.value.length === 0) {
      console.log(`No SKR tokens found for ${walletAddress}`);
      return 0;
    }

    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    console.log(`✓ SKR Balance: ${balance}`);
    return balance;
  } catch (err) {
    console.error('Failed to fetch SKR balance:', err);
    return 0;
  }
}

/**
 * Add SKR to the game balance (earned during gameplay)
 */
export function earn(amount) {
  gameState.skr += amount;
  // Emit event for UI updates
  window.dispatchEvent(new CustomEvent('wallet-update', { 
    detail: { skr: gameState.skr } 
  }));
  console.log(`✓ Earned ${amount} SKR (Total: ${gameState.skr})`);
}

/**
 * Spend SKR from the game balance
 */
export function spend(amount) {
  if (gameState.skr < amount) {
    console.warn(`❌ Insufficient SKR: ${gameState.skr} < ${amount}`);
    return false;
  }
  gameState.skr -= amount;
  // Emit event for UI updates
  window.dispatchEvent(new CustomEvent('wallet-update', { 
    detail: { skr: gameState.skr } 
  }));
  console.log(`✓ Spent ${amount} SKR (Remaining: ${gameState.skr})`);
  return true;
}

/**
 * Load game state from localStorage
 */
export function load() {
  try {
    const saved = localStorage.getItem('gameState');
    if (saved) {
      gameState = JSON.parse(saved);
      console.log(`✓ Loaded game state: ${gameState.skr} SKR`);
    }
  } catch (err) {
    console.error('Failed to load game state:', err);
  }
}

/**
 * Save game state to localStorage
 */
export function save() {
  try {
    localStorage.setItem('gameState', JSON.stringify(gameState));
    console.log(`✓ Saved game state: ${gameState.skr} SKR`);
  } catch (err) {
    console.error('Failed to save game state:', err);
  }
}

/**
 * Get current game SKR balance (off-chain)
 */
export function getBalance() {
  return gameState.skr;
}

/**
 * Export as property for backward compatibility
 */
Object.defineProperty(exports, 'skr', {
  get: () => gameState.skr,
  enumerable: true,
});

/**
 * Submit On-Chain Score via SeekerStats Program (Option A)
 * Records player score and SKR earned to the blockchain
 */
export async function submitOnChainScore(distance, skrEarned) {
  if (!sessionKeyManager || !sessionKeyManager.isActive) {
    console.error('Session Key not initialized');
    return null;
  }

  if (!connection) {
    console.error('Solana connection not initialized');
    return null;
  }

  try {
    // In production, this would create and sign a transaction to the SeekerStats program:
    // 1. Create initialization instruction (if first run)
    // 2. Create record_run instruction with distance and skrEarned
    // 3. Sign with Magicblock Session Key
    // 4. Send transaction
    
    // For now, simulate the on-chain submission
    const txId = `seeker_score_${Date.now()}`;
    console.log(`✓ On-chain score submitted: distance=${distance}, skr=${skrEarned}, txId=${txId}`);
    
    // Emit event for tracking
    window.dispatchEvent(new CustomEvent('scoreSubmitted', {
      detail: { distance, skrEarned, txId }
    }));
    
    return txId;
  } catch (err) {
    console.error('Failed to submit on-chain score:', err);
    return null;
  }
}

/**
 * Claim SKR Rewards from Treasury (via Vercel backend)
 */
export async function claimRewards(amount) {
  if (!playerWalletAddress) {
    console.error('No wallet connected');
    return null;
  }

  try {
    const response = await fetch(`${API_ENDPOINT}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerWallet: playerWalletAddress,
        amount: amount,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claim failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✓ Claim successful: txId=${data.txId}`);
    
    // Deduct from game balance since it's been claimed
    if (data.success) {
      spend(amount);
    }
    
    // Emit event for tracking
    window.dispatchEvent(new CustomEvent('rewardsClaimed', {
      detail: { amount, txId: data.txId }
    }));
    
    return data.txId;
  } catch (err) {
    console.error('Failed to claim rewards:', err);
    return null;
  }
}

/**
 * Get current session key status
 */
export function getSessionKeyStatus() {
  if (!sessionKeyManager) {
    return { isActive: false, expiresIn: 0 };
  }

  const elapsedMs = Date.now() - sessionKeyManager.createdAt;
  const expiresInMs = sessionKeyManager.expiresIn - elapsedMs;
  const isActive = expiresInMs > 0;

  return {
    isActive,
    expiresInMs,
    createdAt: sessionKeyManager.createdAt,
  };
}

/**
 * Disconnect Wallet
 */
export async function disconnectWallet() {
  try {
    if (walletAdapter) {
      await walletAdapter.disconnect();
    }
    playerWalletAddress = null;
    walletAdapter = null;
    sessionKeyManager = null;
    sessionKeyWallet = null;
    localStorage.removeItem('sessionKeyCreated');
    console.log('✓ Wallet disconnected');
  } catch (err) {
    console.error('Error disconnecting wallet:', err);
  }
}

/**
 * Get Current Player Wallet
 */
export function getCurrentWallet() {
  return playerWalletAddress;
}

/**
 * Check if Wallet is Connected
 */
export function isWalletConnected() {
  return playerWalletAddress !== null;
}
}
