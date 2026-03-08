/**
 * Solana Mobile Wallet Adapter (MWA) Integration for Seeker Go
 * SKR Token Mint: 56Fi8yiotnK4SqyjFWmoHScfzATAEvXSNU1r8iUJ9xQm
 * Game Treasury: ctRxs4aFQiuLrcEDeHgTaywCgcffmumMCBa1PZ6yJZy
 *
 * On a PWA in Android Chrome, MWA works via deep-link Intent.
 * The wallet app (e.g. Phantom, Solflare) must be installed on device.
 * These stubs fire the correct intent URI — swap bodies for real tx logic.
 */

const SOLANA_CONFIG = {
  skrMint: '56Fi8yiotnK4SqyjFWmoHScfzATAEvXSNU1r8iUJ9xQm',
  treasury: 'ctRxs4aFQiuLrcEDeHgTaywCgcffmumMCBa1PZ6yJZy',
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  // Switch to devnet for testing:
  // rpcEndpoint: 'https://api.devnet.solana.com',
};

let _walletPublicKey = null;
let _isConnecting = false;

/**
 * Check if we're running inside an Android browser that supports MWA.
 * MWA requires Android Chrome or a Solana-compatible dApp browser.
 */
export function isMWASupported() {
  const ua = navigator.userAgent || '';
  return /android/i.test(ua);
}

/**
 * Connect wallet via MWA deep link.
 * On Android Chrome this fires a solana-wallet:// intent.
 * On desktop / unsupported it falls back to a mock for dev.
 */
export async function connectWallet() {
  if (_isConnecting) return { ok: false, error: 'Already connecting' };
  _isConnecting = true;

  try {
    if (!isMWASupported()) {
      // Dev fallback — mock a public key so the rest of the UI works
      console.warn('⚠️ Solana MWA: Not on Android — using mock wallet for dev');
      _walletPublicKey = 'MockWallet1111111111111111111111111111111111';
      _isConnecting = false;
      return { ok: true, publicKey: _walletPublicKey, mock: true };
    }

    // Build the MWA deep link
    const callbackUrl = encodeURIComponent(window.location.href);
    const intentUri = `solana-wallet://v1/connect?cluster=mainnet-beta&app_url=${callbackUrl}`;

    // Fire Android Intent
    window.location.href = intentUri;

    // The wallet app will deep-link back — read pk from URL params on return
    _isConnecting = false;
    return { ok: true, pending: true, message: 'Wallet app opening…' };
  } catch (err) {
    _isConnecting = false;
    console.error('❌ Solana: connectWallet error', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Read wallet public key from URL params after MWA redirect.
 * Call this on app load to restore connection state.
 */
export function restoreWalletFromRedirect() {
  const params = new URLSearchParams(window.location.search);
  const pk = params.get('wallet_public_key') || params.get('publicKey');
  if (pk) {
    _walletPublicKey = pk;
    // Clean up URL
    const clean = window.location.pathname;
    window.history.replaceState({}, '', clean);
    console.log('✅ Solana: Wallet restored from redirect', pk.slice(0, 8) + '…');
    return pk;
  }
  // Restore from localStorage if previously connected
  const stored = localStorage.getItem('solana_wallet_pk');
  if (stored) {
    _walletPublicKey = stored;
    return stored;
  }
  return null;
}

/**
 * Request a revive transaction (costs 10 SKR).
 * In production: build a SPL token transfer TX and send via MWA.
 */
export async function requestRevive() {
  if (!_walletPublicKey) {
    return { ok: false, error: 'Wallet not connected' };
  }
  console.log('💸 Solana: requestRevive stub — would transfer 10 SKR from', _walletPublicKey);
  // TODO: Build and sign SPL transfer TX via MWA session keys
  // const tx = buildTransferTx(_walletPublicKey, SOLANA_CONFIG.treasury, 10, SOLANA_CONFIG.skrMint);
  // const sig = await sendViaMWA(tx);
  return { ok: true, mock: true, cost: 10, action: 'revive' };
}

/**
 * Sign a powerup activation event.
 * In production: send a small memo TX to anchor the event on-chain.
 * Session Keys allow this without per-action wallet prompts.
 */
export async function signPowerup(powerupType) {
  if (!_walletPublicKey) {
    return { ok: false, error: 'Wallet not connected' };
  }
  console.log(`⚡ Solana: signPowerup stub — type: ${powerupType}, player: ${_walletPublicKey.slice(0, 8)}…`);
  // TODO: Build memo TX with powerup event data
  return { ok: true, mock: true, powerupType, timestamp: Date.now() };
}

/**
 * Cash In: convert accumulated in-game SKR shards to real SPL tokens.
 * @param {number} amount - number of shards to convert
 */
export async function cashIn(amount) {
  if (!_walletPublicKey) {
    return { ok: false, error: 'Wallet not connected' };
  }
  if (amount < 10) {
    return { ok: false, error: 'Minimum cash-in is 10 SKR' };
  }
  console.log(`💰 Solana: cashIn stub — ${amount} SKR → ${_walletPublicKey.slice(0, 8)}…`);
  // TODO: Treasury signs a mint/transfer of SKR tokens to player wallet
  return { ok: true, mock: true, amount, wallet: _walletPublicKey };
}

/**
 * Submit final game score as an on-chain memo (optional, for verifiability).
 */
export async function submitScoreOnChain(distance, skr) {
  if (!_walletPublicKey) return { ok: false };
  console.log(`📊 Solana: submitScoreOnChain stub — dist: ${distance}m, skr: ${skr}`);
  return { ok: true, mock: true };
}

export function getWalletPublicKey() { return _walletPublicKey; }
export function isWalletConnected() { return !!_walletPublicKey; }

export function disconnectWallet() {
  _walletPublicKey = null;
  localStorage.removeItem('solana_wallet_pk');
  console.log('🔌 Solana: Wallet disconnected');
}
