// notif.js — Notifikasi audio cross-browser via Web Audio API.
//
// Kenapa pakai Web Audio API (bukan <audio>.play())?
// Browser memblok autoplay sampai user pernah berinteraksi (klik/tap) dgn halaman.
// <audio>.play() yg dipanggil otomatis saat pesanan masuk akan DIBLOCK diam-diam.
//
// Pola di sini (3 lapis andal):
// 1. AudioContext di-resume (unlock) pada gesture user (klik/tap/key) + saat halaman
//    kembali visible (visibilitychange) — utk handle background/foreground di HP.
// 2. beep() kalau belum unlock / context suspend → tandai PENDING (tidak hilang!).
//    Pending beep dibunyikan saat user pertama kali interaksi.
// 3. beep() return true kalau langsung bunyi, false kalau pending — supaya pemanggil
//    bisa update "lastSeen" hanya saat benar2 bunyi (lihat prosesNotifPesanan).

let _ctx = null;
let _unlocked = false;
let _pendingBeep = false;

function _pastiCtx() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _ctx = new AC();
  }
  return _ctx;
}

// Unlock/resume AudioContext. Panggil pada gesture user & visibilitychange.
// Kalau ada beep tertunda, mainkan setelah unlock.
export function unlockAudio() {
  const ctx = _pastiCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const wasUnlocked = _unlocked;
  _unlocked = true;
  if (!wasUnlocked && _pendingBeep) {
    _pendingBeep = false;
    setTimeout(() => { beep(); }, 200); // delay utk pastikan context running
  }
}

// Bunyikan beep 2 nada (ding-ding).
// Return true kalau langsung bunyi, false kalau pending (belum unlock / context suspend).
// Penting: false TIDAK berarti hilang — beep antri & dibunyikan saat user interaksi.
export function beep() {
  const ctx = _pastiCtx();
  if (!ctx) return false;
  if (!_unlocked || ctx.state === 'suspended') {
    _pendingBeep = true;          // antri — akan main saat unlockAudio() dipanggil (gesture)
    if (ctx.state === 'suspended') ctx.resume();
    return false;
  }
  const t = ctx.currentTime;
  const main = (freq, mulai, durasi) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t + mulai);
    g.gain.linearRampToValueAtTime(0.3, t + mulai + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + mulai + durasi);
    o.connect(g).connect(ctx.destination);
    o.start(t + mulai);
    o.stop(t + mulai + durasi + 0.02);
  };
  main(880, 0, 0.18);     // nada 1 (A5)
  main(1175, 0.22, 0.22); // nada 2 (D6, lebih tinggi)
  return true;
}

// Hapus beep tertunda (mis. admin sudah lihat pesanan via cara lain).
export function clearPendingBeep() { _pendingBeep = false; }

// Status audio (utk indikator visual: unlocked / pending / state context).
export function audioStatus() {
  return { unlocked: _unlocked, pending: _pendingBeep, state: _ctx ? _ctx.state : 'no-ctx' };
} 
