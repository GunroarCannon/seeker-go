# 🚀 Seeker Go — PWA Edition

A Solana-native space runner game built as a Progressive Web App.

## Project Structure

```
seeker-go/
├── index.html              # Main game (all-in-one: engine + UI + screens)
├── manifest.json           # PWA manifest (installable on Android home screen)
├── sw.js                   # Service worker (offline support + caching)
├── js/
│   ├── lootlocker.js       # LootLocker leaderboard & player accounts
│   ├── solana.js           # Solana MWA stubs (connect wallet, sign txs)
│   ├── audio.js            # AudioManager (BGM, SFX, preloading)
│   └── localScores.js      # Local high score persistence (AsyncStorage equiv)
└── assets/
    ├── icon-192.png         # PWA icon
    ├── icon-512.png         # PWA icon
    ├── models/              # Your GLB files go here
    │   ├── low_poly_space_ship.glb
    │   ├── asteroid_low_poly.glb
    │   ├── shard.glb
    │   ├── power_up.glb
    │   ├── magnet.glb
    │   └── ps1_style_low_poly_moon.glb
    └── sounds/              # Your sound files go here
        ├── glitchstairs.ogg           (BGM)
        ├── click_sound.mp3
        ├── explosion_01.ogg
        ├── explosion_02.ogg
        ├── missile_explosion.ogg
        ├── beep_02.ogg
        ├── phaserUp6.mp3
        └── PM_SD_UI_MAGIC_CONFIRM_1.wav ... _9.wav
```

## Integrations

### LootLocker
- **Game ID**: `102803`
- **Leaderboard Key**: `seeker_go_leaderboard`
- **API Domain**: `https://8qcdgnbx.api.lootlocker.io/`
- Features: Guest sessions, score submission, global leaderboard, player names

### Solana MWA
- **SKR Token Mint**: `56Fi8yiotnK4SqyjFWmoHScfzATAEvXSNU1r8iUJ9xQm`
- **Treasury**: `ctRxs4aFQiuLrcEDeHgTaywCgcffmumMCBa1PZ6yJZy`
- MWA fires Android `solana-wallet://` intent on Android Chrome
- Stubs ready for: `connectWallet`, `requestRevive`, `signPowerup`, `cashIn`, `submitScoreOnChain`

## Deployment

### Serve locally
```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# Then open on Android Chrome: http://YOUR_IP:8080
```

> **Important**: PWA features (install prompt, service worker) require **HTTPS** in production.  
> For local testing on Android, use your computer's local IP over HTTP — Android Chrome allows SW on LAN.

### Deploy to production
Any static host works: **Vercel**, **Netlify**, **GitHub Pages**, **Cloudflare Pages**

```bash
# Vercel (one command)
npx vercel .

# Netlify
npx netlify deploy --prod --dir .
```

### Android MWA / Privy notes
- Privy Email embedded wallets work universally via Vanilla JS (no Android forced routing).
- MWA fallback works in **Android Chrome** — the `solana-wallet://` intent fires the installed wallet app.
- For the Solana Mobile Hackathon / Bags hackathon: deploy to HTTPS, test on Android Chrome or Desktop, submit URL.

### Potential Distribution Layers
- **Google Play & App Store**: Via Trusted Web Activity (TWA) wrappers.
- **Seeker DApp Store / Baseapp**: Direct integration utilizing Privy embedded wallets.
- **Telegram Mini Apps / Farcaster Frames & Webapps**: Vanilla JS allows rendering within an existing IFrame perfectly.

### LootLocker Backend Architecture
*Do I need to make a backend to make LootLocker work with this?*
**No!** LootLocker has a robust Guest Session and User Accounts system that can be securely handled completely client-side in the browser. High scores, leaderboards, and basic identity are entirely embedded in `js/lootlocker.js` with no middleman server needed.

## Game Features

| Feature | Status |
|---|---|
| 3-lane runner (Three.js) | ✅ |
| Asteroid obstacles | ✅ |
| SKR shard collection | ✅ |
| Shield / Magnet / Life powerups | ✅ |
| Dynamic moon growth | ✅ |
| Warp events | ✅ |
| Smoke + explosion FX | ✅ |
| Wind trail particles | ✅ |
| Speed lines | ✅ |
| Hull damage + death anim | ✅ |
| Revive for 10 SKR | ✅ |
| Shop (Shield/Magnet/Repair) | ✅ |
| LootLocker leaderboard | ✅ |
| Local high score | ✅ |
| Solana MWA wallet connect | ✅ (stubs) |
| BGM + SFX | ✅ |
| PWA installable | ✅ |
| Offline support | ✅ |
| Safe-area (notch) support | ✅ |

## PWA on Android

1. Deploy to HTTPS
2. Open in Android Chrome
3. Chrome shows "Add to Home Screen" banner
4. Game launches fullscreen like a native app
5. MWA wallet connection works in Chrome WebView

## 🔧 Connecting Real Solana Transactions

Edit `js/solana.js` — each function has a `// TODO:` comment showing where to add the real SPL transaction logic. Session Keys (Solana Mobile) let you batch many small actions without prompting the user for every signature.
