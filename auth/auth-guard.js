// ===== AUTH GUARD (versi debug — dengan logging detail) =====
// File ini berisi fungsi-fungsi otentikasi yang dipakai bersama
// oleh login.html, register.html, admin.html, dan halaman lain.
//
// Versi ini punya console.log di setiap langkah supaya kita bisa
// lihat di F12 → Console persis apa yang terjadi saat login.
//
// Lokasi: /auth/auth-guard.js
// Impor firebase-config.js dari satu level ke atas: '../firebase-config.js'

import { auth, db } from '../firebase-config.js';
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

console.log('🛡️ [auth-guard] File auth-guard.js berhasil dimuat');

/**
 * Cek apakah ada user yang sedang login.
 * Mengembalikan Promise<{ uid, email, role }> kalau login, atau null kalau tidak.
 */
function cekLoginSaatIni() {
  console.log('🔍 [auth-guard] cekLoginSaatIni() dipanggil');
  return new Promise((resolve) => {
    let sudahResolve = false;

    onAuthStateChanged(auth, async (user) => {
      console.log('🔔 [auth-guard] onAuthStateChanged fired, user:', user ? {
        uid: user.uid,
        email: user.email
      } : null);

      if (sudahResolve) {
        console.log('⚠️ [auth-guard] sudah resolve sebelumnya, skip');
        return;
      }
      sudahResolve = true;

      if (!user) {
        console.log('ℹ️ [auth-guard] Tidak ada user login → resolve null');
        resolve(null);
        return;
      }

      console.log('👤 [auth-guard] User login:', user.uid, '| email:', user.email);
      try {
        const role = await bacaRole(user.uid);
        console.log('🎭 [auth-guard] Role dari DB:', role);
        resolve({
          uid: user.uid,
          email: user.email,
          role: role
        });
      } catch (err) {
        console.error('❌ [auth-guard] Gagal baca role di cekLoginSaatIni:', err);
        resolve({
          uid: user.uid,
          email: user.email,
          role: null
        });
      }
    });
  });
}

/**
 * Baca role user dari database: users/{uid}/role
 * Mengembalikan: "pembeli" | "penjual" | "admin" | null
 */
async function bacaRole(uid) {
  console.log('📖 [auth-guard] bacaRole() dipanggil untuk uid:', JSON.stringify(uid));
  console.log('📖 [auth-guard] Panjang uid:', uid ? uid.length : 'null');

  if (!uid) {
    console.warn('⚠️ [auth-guard] uid kosong/null, return null');
    return null;
  }

  const path = 'users/' + uid + '/role';
  console.log('📖 [auth-guard] Path yang dibaca:', path);

  try {
    const snap = await get(ref(db, path));
    console.log('📦 [auth-guard] Snapshot exists?', snap.exists());
    console.log('📦 [auth-guard] Snapshot val():', JSON.stringify(snap.val()));

    if (snap.exists()) {
      const val = snap.val();
      console.log('✅ [auth-guard] Role ditemukan:', val);
      return val;
    } else {
      console.warn('⚠️ [auth-guard] Role TIDAK DITEMUKAN di path:', path);
      // Coba baca node users/{uid} utuh untuk debugging
      console.log('🔬 [auth-guard] Coba baca users/' + uid + ' utuh...');
      const snap2 = await get(ref(db, 'users/' + uid));
      console.log('🔬 [auth-guard] Node users/{uid} exists?', snap2.exists());
      if (snap2.exists()) {
        console.log('🔬 [auth-guard] Isi users/{uid}:', JSON.stringify(snap2.val(), null, 2));
        // Coba baca node users/ utuh (untuk lihat semua key yang ada)
        console.log('🔬 [auth-guard] Coba baca users/ utuh...');
        const snap3 = await get(ref(db, 'users'));
        if (snap3.exists()) {
          const usersData = snap3.val();
          console.log('🔬 [auth-guard] Semua key di users/:', Object.keys(usersData || {}));
          console.log('🔬 [auth-guard] UID yang dicari:', JSON.stringify(uid));
          console.log('🔬 [auth-guard] Apakah uid ada di users/?', Object.keys(usersData || {}).includes(uid));
        } else {
          console.warn('⚠️ [auth-guard] Node users/ KOSONG / tidak ada sama sekali!');
        }
      } else {
        console.warn('⚠️ [auth-guard] Node users/' + uid + ' TIDAK ADA');
      }
      return null;
    }
  } catch (err) {
    console.error('💥 [auth-guard] ERROR saat bacaRole:', err);
    console.error('💥 [auth-guard] Error code:', err.code);
    console.error('💥 [auth-guard] Error message:', err.message);
    throw err;
  }
}

/**
 * Redirect user berdasarkan role.
 * Pakai path RELATIF supaya jalan di GitHub Pages subpath.
 */
function redirectByRole(role) {
  console.log('🚀 [auth-guard] redirectByRole() dipanggil, role:', role);
  if (role === 'admin') {
    window.location.href = '../admin.html';
  } else if (role === 'penjual') {
    window.location.href = '../seller.html';
  } else if (role === 'pembeli') {
    window.location.href = '../index.html';
  } else {
    console.warn('⚠️ [auth-guard] Role tidak dikenal:', role, '→ balik ke login');
    window.location.href = 'login.html';
  }
}

/**
 * Guard untuk halaman yang butuh login.
 */
async function lindungiHalaman(roleDiizinkan = ['admin', 'penjual']) {
  const info = await cekLoginSaatIni();
  if (!info) {
    const pathLogin = window.location.pathname.includes('/auth/') ? 'login.html' : 'auth/login.html';
    window.location.href = pathLogin;
    return null;
  }
  if (!info.role) {
    alert('Akun belum punya data peran. Hubungi admin.');
    await logout();
    return null;
  }
  if (!roleDiizinkan.includes(info.role)) {
    alert('Akses ditolak. Halaman ini hanya untuk: ' + roleDiizinkan.join(', '));
    redirectByRole(info.role);
    return null;
  }
  return info;
}

/**
 * Logout.
 */
/**
 * Login / daftar cepat via Google.
 * - User Google yang belum ada di DB → buat data default (role pembeli).
 * - User yang sudah ada → pakai role tersimpan.
 * Mengembalikan { uid, email, role, baru }.
 */
const googleProvider = new GoogleAuthProvider();

async function loginDenganGoogle(roleDefault = 'pembeli') {
  console.log('🔵 [auth-guard] loginDenganGoogle() dipanggil, roleDefault:', roleDefault);
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;
  console.log('🔵 [auth-guard] Google sign-in OK, uid:', user.uid, '| email:', user.email);

  const snap = await get(ref(db, 'users/' + user.uid));
  if (snap.exists()) {
    const data = snap.val();
    console.log('🔵 [auth-guard] User sudah terdaftar, role:', data.role);
    return { uid: user.uid, email: user.email, role: data.role, baru: false };
  }

  console.log('🔵 [auth-guard] User baru, buat data default role:', roleDefault);
  const sekarang = Date.now();
  await set(ref(db, 'users/' + user.uid), {
    role: roleDefault,
    nama: user.displayName || '',
    email: user.email || '',
    foto: user.photoURL || '',
    dibuatPada: sekarang
  });
  return { uid: user.uid, email: user.email, role: roleDefault, baru: true };
}

/**
 * Logout.
 */
async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('❌ Gagal logout:', err);
  }
  const pathLogin = window.location.pathname.includes('/auth/') ? 'login.html' : 'auth/login.html';
  window.location.href = pathLogin;
}

export { cekLoginSaatIni, bacaRole, redirectByRole, lindungiHalaman, logout, loginDenganGoogle }; 
