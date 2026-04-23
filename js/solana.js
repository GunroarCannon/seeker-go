/**
 * Privy Integration for Seeker Go
 * Replaces the Solana MWA stub with Vanilla JS Privy Email Auth.
 * 
 * Documentation: https://docs.privy.io/guide/frontend/users/authentication/email
 */

import { PrivyClient } from 'https://esm.sh/@privy-io/js-sdk-core@0.17.0';

// NOTE: Replace with your actual Privy App ID for production.
const PRIVY_APP_ID = 'your_privy_app_id_here';

let _privyClient = null;
let _walletAddress = null;
let _isConnecting = false;

function initPrivy() {
  if (!_privyClient) {
    if (PRIVY_APP_ID === 'your_privy_app_id_here') {
      console.warn('⚠️ Privy App ID not set. Using dev mock mode!');
      return null;
    }
    _privyClient = new PrivyClient({ appId: PRIVY_APP_ID });
  }
  return _privyClient;
}

function isAndroidChrome() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  return /Android/i.test(ua) && /Chrome/i.test(ua);
}

export function isMWASupported() {
  // Heuristic: Mobile Wallet Adapter is only relevant on Android Chrome.
  return isAndroidChrome();
}

/**
 * Connect wallet.
 * - On Android Chrome, this is where a real Mobile Wallet Adapter flow would be wired.
 * - On other platforms, falls back to Privy email login or a local mock.
 */
export async function connectWallet() {
  if (_isConnecting) return { ok: false, error: 'Already connecting' };
  _isConnecting = true;

  try {
    if (isMWASupported()) {
      console.log('ℹ️ MWA-capable environment detected (Android Chrome). Falling back to Privy/mock until MWA is wired.');
      // TODO: Plug in Solana Mobile Wallet Adapter connect flow here for Android Chrome.
    }

    const privy = initPrivy();
    if (!privy) {
      // Dev fallback when App ID is missing
      _walletAddress = 'MockPrivyWallet_' + Math.floor(Math.random() * 99999);
      localStorage.setItem('privy_wallet_addr', _walletAddress);
      _isConnecting = false;
      return { ok: true, publicKey: _walletAddress, mock: true };
    }

    return new Promise((resolve) => {
      buildPrivyModal(privy, async (result) => {
        _isConnecting = false;
        if (result?.ok) {
           _walletAddress = result.address;
           localStorage.setItem('privy_wallet_addr', _walletAddress);
           resolve({ ok: true, publicKey: _walletAddress });
        } else {
           resolve({ ok: false, error: result?.error || 'Cancelled' });
        }
      });
    });

  } catch (err) {
    _isConnecting = false;
    console.error('❌ Privy: connectWallet error', err);
    return { ok: false, error: err.message };
  }
}

let _modalEl = null;

function buildPrivyModal(privy, callback) {
  if (_modalEl) _modalEl.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-bd';
  overlay.style.zIndex = '9999';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = `
    <span class="modal-icon">🔐</span>
    <div class="modal-title">Log in with Privy</div>
    <div class="modal-sub">Enter your email to connect or create a non-custodial wallet.</div>
    <div id="privy-step-1">
      <input type="email" id="privy-email" placeholder="you@example.com" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;margin-bottom:12px;" />
      <button class="btn btn-green" id="privy-send-btn">Send Code</button>
      <button class="btn btn-outline btn-sm" id="privy-cancel-btn" style="margin-top:8px">Cancel</button>
    </div>
    <div id="privy-step-2" style="display:none;">
      <input type="text" id="privy-code" placeholder="123456" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.4);color:#fff;margin-bottom:12px;text-align:center;letter-spacing:4px;font-size:20px;" />
      <button class="btn btn-gold" id="privy-verify-btn">Verify Login</button>
      <button class="btn btn-outline btn-sm" id="privy-back-btn" style="margin-top:8px">Back</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  _modalEl = overlay;

  const emailIn = box.querySelector('#privy-email');
  const codeIn = box.querySelector('#privy-code');
  const step1 = box.querySelector('#privy-step-1');
  const step2 = box.querySelector('#privy-step-2');

  box.querySelector('#privy-cancel-btn').onclick = () => { overlay.remove(); callback({ ok: false }); };
  box.querySelector('#privy-back-btn').onclick = () => { step2.style.display = 'none'; step1.style.display = 'block'; };

  box.querySelector('#privy-send-btn').onclick = async () => {
    const email = emailIn.value.trim();
    if (!email) return;
    try {
      box.querySelector('#privy-send-btn').textContent = 'Sending...';
      await privy.auth.email.sendCode({ email });
      step1.style.display = 'none';
      step2.style.display = 'block';
    } catch (e) {
      alert('Error sending code: ' + e.message);
      box.querySelector('#privy-send-btn').textContent = 'Send Code';
    }
  };

  box.querySelector('#privy-verify-btn').onclick = async () => {
    const email = emailIn.value.trim();
    const code = codeIn.value.trim();
    if (!code) return;
    try {
      box.querySelector('#privy-verify-btn').textContent = 'Verifying...';
      const session = await privy.auth.email.loginWithCode({ email, code });
      
      const user = await privy.user.get();
      const addr = user?.wallet?.address || user?.linkedAccounts?.find(a => a.type === 'wallet')?.address || user.id;

      overlay.remove();
      callback({ ok: true, address: addr });
    } catch (e) {
      alert('Error verifying code: ' + e.message);
      box.querySelector('#privy-verify-btn').textContent = 'Verify Login';
    }
  };
}

export function restoreWalletFromRedirect() {
  const stored = localStorage.getItem('privy_wallet_addr');
  if (stored) {
    _walletAddress = stored;
    return stored;
  }
  return null;
}

export async function requestRevive() {
  if (!_walletAddress) return { ok: false, error: 'Wallet not connected' };
  return { ok: true, mock: true, cost: 10, action: 'revive' };
}

export async function signPowerup(powerupType) {
  if (!_walletAddress) return { ok: false, error: 'Wallet not connected' };
  return { ok: true, mock: true, powerupType, timestamp: Date.now() };
}

export async function cashIn(amount) {
  if (!_walletAddress) return { ok: false, error: 'Wallet not connected' };
  if (amount < 10) return { ok: false, error: 'Minimum cash-in is 10 SKR' };
  return { ok: true, mock: true, amount, wallet: _walletAddress };
}

export async function submitScoreOnChain(distance, skr) {
  if (!_walletAddress) return { ok: false };
  return { ok: true, mock: true };
}

export function getWalletPublicKey() { return _walletAddress; }
export function isWalletConnected() { return !!_walletAddress; }

export function disconnectWallet() {
  _walletAddress = null;
  localStorage.removeItem('privy_wallet_addr');
  console.log('🔌 Privy: Wallet disconnected');
}
