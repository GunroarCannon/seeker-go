/**
 * AudioManager for Seeker Go
 * Manages BGM and SFX with preloading, volume control, and mobile unlock.
 *
 * Sound files available:
 *   beep_02.ogg
 *   click_sound.mp3
 *   enchantmentinstumental_sonartu... (BGM)
 *   explosion_01.ogg
 *   explosion_02.ogg
 *   glitchstairs.ogg  (main BGM loop)
 *   missile_explosion.ogg
 *   phaserUp.mp3
 *   PM_SD_UI_MAGIC_CONFIRM_1.wav ... _9.wav  (collect/confirm sounds)
 */

const SOUNDS = {
  click: { src: 'assets/sounds/click_sound.mp3', volume: 0.7 },
  collect: { src: 'assets/sounds/PM_SD_UI_MAGIC_CONFIRM_1.wav', volume: 0.9 },
  collect2: { src: 'assets/sounds/PM_SD_UI_MAGIC_CONFIRM_3.wav', volume: 0.9 },
  collect3: { src: 'assets/sounds/PM_SD_UI_MAGIC_CONFIRM_5.wav', volume: 0.9 },
  powerup: { src: 'assets/sounds/phaserUp6.mp3', volume: 0.85 },
  hit: { src: 'assets/sounds/explosion_01.ogg', volume: 0.85 },
  bigHit: { src: 'assets/sounds/explosion_02.ogg', volume: 1.0 },
  missile: { src: 'assets/sounds/missile_explosion.ogg', volume: 0.75 },
  beep: { src: 'assets/sounds/beep_02.ogg', volume: 0.6 },
  confirm: { src: 'assets/sounds/PM_SD_UI_MAGIC_CONFIRM_7.wav', volume: 0.8 },
  gameOver: { src: 'assets/sounds/missile_explosion.ogg', volume: 1.0 },
  buy: { src: 'assets/sounds/PM_SD_UI_MAGIC_CONFIRM_9.wav', volume: 0.9 },
  revive: { src: 'assets/sounds/PM_SD_UI_MAGIC_CONFIRM_2.wav', volume: 1.0 },
};

const MUSIC = {
  bgm_sci: { src: 'assets/sounds/Sci Fi Electro city.mp3', volume: 0.35, loop: true },
  bgm_star: { src: 'assets/sounds/Cheers For Starlight Loop.mp3', volume: 0.35, loop: true },
  bgm_tech: { src: 'assets/sounds/technicko.mp3', volume: 0.35, loop: true },
  bgm_virt: { src: 'assets/sounds/virtual_rush_loop.mp3', volume: 0.35, loop: true },
  ambient: { src: 'assets/sounds/enchantmentinstumental_sonartuning.mp3', volume: 0.2, loop: true },
};

// Pool size for high-frequency sounds
const POOL_SIZE = 4;

class AudioManager {
  constructor() {
    this._pools = {};       // pooled SFX buffers
    this._music = {};       // HTMLAudioElement per music track
    this._unlocked = false;
    this._sfxVolume = 1.0;
    this._musicVolume = 1.0;
    this._muted = false;
    this._currentBGM = null;
    this._lastBGM = null;

    this._loadSettings();
    this._setupUnlockListener();
  }

  _loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('audio_settings') || '{}');
      this._sfxVolume = s.sfxVolume ?? 1.0;
      this._musicVolume = s.musicVolume ?? 1.0;
      this._muted = s.muted ?? false;
    } catch { }
  }

  _saveSettings() {
    localStorage.setItem('audio_settings', JSON.stringify({
      sfxVolume: this._sfxVolume,
      musicVolume: this._musicVolume,
      muted: this._muted,
    }));
  }

  // iOS/Android require user gesture to unlock audio context
  _setupUnlockListener() {
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;
      // Play & immediately pause a silent buffer to unlock
      Object.values(this._pools).forEach(pool => {
        pool.forEach(a => { a.play().then(() => a.pause()).catch(() => { }); });
      });
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('click', unlock, { passive: true });
  }

  /** Preload all SFX pools */
  preload() {
    Object.entries(SOUNDS).forEach(([key, cfg]) => {
      const pool = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const a = new Audio();
        a.src = cfg.src;
        a.preload = 'auto';
        a.volume = cfg.volume * this._sfxVolume;
        pool.push(a);
      }
      this._pools[key] = pool;
    });

    Object.entries(MUSIC).forEach(([key, cfg]) => {
      const a = new Audio();
      a.src = cfg.src;
      a.preload = 'auto';
      a.loop = cfg.loop ?? false;
      a.volume = cfg.volume * this._musicVolume;
      this._music[key] = a;
    });

    console.log('🔊 AudioManager: Preloaded', Object.keys(SOUNDS).length, 'SFX,', Object.keys(MUSIC).length, 'music tracks');
  }

  /** Play a sound effect by key */
  play(key) {
    if (this._muted) return;
    const pool = this._pools[key];
    if (!pool) { console.warn(`⚠️ Audio: Unknown sound key "${key}"`); return; }
    const cfg = SOUNDS[key];
    // Find a free (ended or paused) audio element
    const avail = pool.find(a => a.ended || a.paused) || pool[0];
    avail.currentTime = 0;
    avail.volume = (cfg?.volume ?? 0.8) * this._sfxVolume;
    avail.play().catch(() => { });
  }

  /** Play a random collect sound from the confirm series */
  playCollect() {
    const keys = ['collect', 'collect2', 'collect3'];
    this.play(keys[Math.floor(Math.random() * keys.length)]);
  }

  /** Start a music track */
  playMusic(key) {
    if (this._muted) return;

    if (key === 'bgm') {
      const tracks = ['bgm_sci', 'bgm_star', 'bgm_tech', 'bgm_virt'];
      let nextTrack;
      do {
        nextTrack = tracks[Math.floor(Math.random() * tracks.length)];
      } while (tracks.length > 1 && nextTrack === this._lastBGM);

      this._lastBGM = nextTrack;
      key = nextTrack;
    }

    if (this._currentBGM && this._currentBGM !== key) {
      this.stopMusic(this._currentBGM);
    }
    const track = this._music[key];
    if (!track) return;
    track.volume = (MUSIC[key]?.volume ?? 0.35) * this._musicVolume;
    track.currentTime = 0;
    track.play().catch(() => { });
    this._currentBGM = key;
  }

  /** Stop a music track */
  stopMusic(key) {
    if (key === 'bgm') key = this._currentBGM;
    const track = this._music[key];
    if (!track) return;
    track.pause();
    track.currentTime = 0;
  }

  /** Fade out current music over `durationMs` ms */
  fadeOutMusic(key, durationMs = 1500) {
    if (key === 'bgm') key = this._currentBGM;
    const track = this._music[key];
    if (!track) return;
    const startVol = track.volume;
    const step = startVol / (durationMs / 50);
    const fade = setInterval(() => {
      if (track.volume > step) {
        track.volume = Math.max(0, track.volume - step);
      } else {
        track.volume = 0;
        track.pause();
        clearInterval(fade);
      }
    }, 50);
  }

  /** Toggle mute */
  toggleMute() {
    this._muted = !this._muted;
    if (this._muted && this._currentBGM) {
      this._music[this._currentBGM]?.pause();
    } else if (!this._muted && this._currentBGM) {
      this._music[this._currentBGM]?.play().catch(() => { });
    }
    this._saveSettings();
    return this._muted;
  }

  setSFXVolume(v) { this._sfxVolume = v; this._saveSettings(); }
  setMusicVolume(v) {
    this._musicVolume = v;
    Object.entries(this._music).forEach(([k, a]) => {
      a.volume = (MUSIC[k]?.volume ?? 0.35) * v;
    });
    this._saveSettings();
  }

  get isMuted() { return this._muted; }
  get sfxVolume() { return this._sfxVolume; }
  get musicVolume() { return this._musicVolume; }
}

export const audioManager = new AudioManager();
