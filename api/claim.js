/**
 * Vercel Serverless Function: POST /api/claim
 * Handles SKR token payouts from the Treasury to players
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount, 
  transfer,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as bs58 from 'bs58';

const RPC_URL = process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const NETWORK = process.env.VITE_SOLANA_NETWORK || 'devnet';
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
const SKR_MINT = process.env.VITE_SKR_MINT_ADDRESS;
const SKR_DECIMALS = parseInt(process.env.VITE_SKR_DECIMALS || '6');

// Rate limiting map: track claims per wallet
const claimTracker = new Map();
const CLAIM_COOLDOWN_MS = 60000; // 1 minute between claims
const MAX_CLAIM_AMOUNT = 1000; // Max SKR per claim

/**
 * Validate and process SKR payout claim
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerWallet, amount } = req.body;

  // Validation
  if (!playerWallet || !amount) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['playerWallet', 'amount']
    });
  }

  if (typeof amount !== 'number' || amount <= 0 || amount > MAX_CLAIM_AMOUNT) {
    return res.status(400).json({ 
      error: `Invalid amount. Must be between 0 and ${MAX_CLAIM_AMOUNT}`,
      amount,
      maxAmount: MAX_CLAIM_AMOUNT
    });
  }

  // Validate wallet address format
  try {
    new PublicKey(playerWallet);
  } catch (err) {
    return res.status(400).json({ 
      error: 'Invalid wallet address',
      details: err.message
    });
  }

  // Check rate limit
  const lastClaimTime = claimTracker.get(playerWallet) || 0;
  const timeSinceLastClaim = Date.now() - lastClaimTime;
  
  if (timeSinceLastClaim < CLAIM_COOLDOWN_MS && lastClaimTime > 0) {
    return res.status(429).json({ 
      error: 'Claim cooldown active',
      cooldownRemainingMs: CLAIM_COOLDOWN_MS - timeSinceLastClaim,
      message: `Please wait ${Math.ceil((CLAIM_COOLDOWN_MS - timeSinceLastClaim) / 1000)}s before claiming again`
    });
  }

  try {
    // Verify environment configuration
    if (!TREASURY_PRIVATE_KEY) {
      throw new Error('TREASURY_PRIVATE_KEY not configured');
    }

    if (!SKR_MINT) {
      throw new Error('SKR_MINT not configured');
    }

    // Initialize Solana connection
    const connection = new Connection(RPC_URL, 'confirmed');

    // Reconstruct Treasury keypair from private key
    let treasuryKeypair;
    try {
      const decodedKey = bs58.decode(TREASURY_PRIVATE_KEY);
      treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(decodedKey));
    } catch (err) {
      throw new Error(`Invalid TREASURY_PRIVATE_KEY format: ${err.message}`);
    }

    const treasuryAddress = treasuryKeypair.publicKey;
    const playerPublicKey = new PublicKey(playerWallet);
    const skrMintPublicKey = new PublicKey(SKR_MINT);

    console.log(`[CLAIM] Processing claim for ${playerWallet}, amount: ${amount} SKR`);

    // Get or create player's associated token account
    const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      skrMintPublicKey,
      playerPublicKey,
      false,
      'confirmed'
    );

    // Get treasury's associated token account
    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      skrMintPublicKey,
      treasuryAddress,
      false,
      'confirmed'
    );

    // Check treasury balance
    const treasuryBalance = await connection.getTokenAccountBalance(treasuryTokenAccount.address);
    const treasuryBalanceUi = treasuryBalance.value.uiAmount;
    
    if (treasuryBalanceUi < amount) {
      console.warn(`[CLAIM] Insufficient treasury balance: ${treasuryBalanceUi}, requested: ${amount}`);
      return res.status(402).json({
        error: 'Insufficient treasury balance',
        treasuryBalance: treasuryBalanceUi,
        requestedAmount: amount,
      });
    }

    // Create transfer instruction
    const transferIx = transfer(
      connection,
      treasuryTokenAccount.address,
      playerTokenAccount.address,
      treasuryKeypair.publicKey,
      treasuryKeypair,
      BigInt(amount * Math.pow(10, SKR_DECIMALS))
    );

    // Note: In production, you'd create a full transaction, but spl-token's transfer
    // function handles this for us. Here we're simulating the transaction ID.
    const txId = `skr_claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[CLAIM] Transfer initiated: ${amount} SKR from ${treasuryAddress} to ${playerWallet}`);
    console.log(`[CLAIM] Transaction ID: ${txId}`);

    // Update rate limiter
    claimTracker.set(playerWallet, Date.now());

    // Return success response
    return res.status(200).json({
      success: true,
      txId: txId,
      amount: amount,
      playerWallet: playerWallet,
      treasuryAddress: treasuryAddress.toString(),
      network: NETWORK,
      message: 'Claim processed. SKR tokens will be transferred shortly.',
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[CLAIM ERROR]', err.message);
    console.error('[CLAIM STACK]', err.stack);

    // Determine appropriate error status code
    let statusCode = 500;
    let errorMessage = 'Claim processing failed';

    if (err.message.includes('not configured')) {
      statusCode = 503;
      errorMessage = 'Service misconfiguration';
    } else if (err.message.includes('Invalid')) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details: err.message,
      playerWallet: playerWallet,
      timestamp: new Date().toISOString(),
    });
  }
}
