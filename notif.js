// notif.js — Notifikasi audio cross-browser via Web Audio API.
//
// Kenapa pakai Web Audio API (bukan <audio>.play())?
// Browser memblok autoplay sampai user pernah berinteraksi (klik/tap) dgn halaman.
// <audio>.play() yg dipanggil otomatis saat pesanan masuk akan DIBLOCK diam-diam
// (itulah sebabnya notifikasi suara sering "tak bunyi" meski setting HP aktif).
//
// Pola di sini: AudioContext di-resume (unlock) pada gesture pertama user,
// lalu beep() cuma dibunyikan kalau sudah unlock. Setelah unlock, beep selalu jalan.

let _ctx = null;
let _unlocked = false;

function _pastiCtx() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _ctx = new AC();
  }
  return _ctx;
}

// Panggil saat user pertama kali interaksi (klik/tap/key) — unlock audio.
export function unlockAudio() {
  const ctx = _pastiCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  _unlocked = true;
}

// Bunyikan beep 2 nada (ding-ding) — hanya kalau sudah unlock.
// Kalau belum unlock (user belum pernah klik), diam — browser akan blok.
export function beep() {
  if (!_unlocked) return;
  const ctx = _pastiCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
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
}

// Status audio (untuk indikator visual: sudah unlock atau belum).
export function audioStatus() {
  return { unlocked: _unlocked, state: _ctx ? _ctx.state : 'no-ctx' };
} 
