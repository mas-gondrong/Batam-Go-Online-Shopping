// ===== AUTH GUARD =====
// File ini berisi fungsi-fungsi otentikasi yang dipakai bersama
// oleh login.html, register.html, admin.html, dan halaman lain.
//
// Lokasi: /auth/auth-guard.js
// Impor firebase-config.js dari satu level ke atas: '../firebase-config.js'

import { auth, db } from '../firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/**
 * Cek apakah ada user yang sedang login.
 * Mengembalikan Promise<{ uid, email, role }> kalau login, atau null kalau tidak.
 *
 * Cara kerja: dengarkan onAuthStateChanged ( sekali pakai dengan resolve),
 * lalu baca role dari database.
 */
function cekLoginSaatIni() {
  return new Promise((resolve) => {
    let sudahResolve = false;

    onAuthStateChanged(auth, async (user) => {
      if (sudahResolve) return; // hindari resolve ganda
      sudahResolve = true;

      if (!user) {
        resolve(null);
        return;
      }

      try {
        const role = await bacaRole(user.uid);
        resolve({
          uid: user.uid,
          email: user.email,
          role: role
        });
      } catch (err) {
        console.error('❌ Gagal baca role di cekLoginSaatIni:', err);
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
  if (!uid) return null;
  const snap = await get(ref(db, 'users/' + uid + '/role'));
  return snap.exists() ? snap.val() : null;
}

/**
 * Redirect user berdasarkan role.
 * Pakai path RELATIF supaya jalan di GitHub Pages subpath (/Toko-Baju-Online/).
 *
 * - admin   → ../admin.html   (panel admin platform)
 * - penjual → ../admin.html   (sementara pakai admin.html; nanti dipindah ke seller.html)
 * - pembeli → ../index.html   (beranda pembeli)
 * - lainnya → balik ke login
 *
 * Dipanggil dari /auth/*.html, jadi path pakai ../
 */
function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '../admin.html';
  } else if (role === 'penjual') {
    window.location.href = '../admin.html';
  } else if (role === 'pembeli') {
    window.location.href = '../index.html';
  } else {
    // role tidak dikenal / belum diset → balik ke login
    window.location.href = 'login.html';
  }
}

/**
 * Guard untuk halaman yang butuh login (admin.html, seller.html, dll).
 * Pakai di awal script halaman: kalau belum login / role tidak sesuai,
 * user dibuang ke /auth/login.html.
 *
 * @param {string[]} roleDiizinkan - mis. ['admin','penjual']
 * @returns {Promise<{uid,email,role}|null>} info user kalau lolos, null kalau di-redirect
 */
async function lindungiHalaman(roleDiizinkan = ['admin', 'penjual']) {
  const info = await cekLoginSaatIni();

  if (!info) {
    // belum login → ke halaman login
    // (dipanggil dari halaman root, jadi path ke auth/login.html)
    const pathLogin = window.location.pathname.includes('/auth/')
      ? 'login.html'
      : 'auth/login.html';
    window.location.href = pathLogin;
    return null;
  }

  if (!info.role) {
    alert('Akun belum punya data peran. Hubungi admin.');
    await logout();
    return null;
  }

  if (!roleDiizinkan.includes(info.role)) {
    // role tidak diizinkan → redirect ke halaman sesuai role-nya
    alert('Akses ditolak. Halaman ini hanya untuk: ' + roleDiizinkan.join(', '));
    redirectByRole(info.role);
    return null;
  }

  return info;
}

/**
 * Logout: sign out dari Firebase + balik ke halaman login.
 */
async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('❌ Gagal logout:', err);
  }
  // kalau dipanggil dari /auth/ langsung login.html, kalau dari root → auth/login.html
  const pathLogin = window.location.pathname.includes('/auth/')
    ? 'login.html'
    : 'auth/login.html';
  window.location.href = pathLogin;
}

export { cekLoginSaatIni, bacaRole, redirectByRole, lindungiHalaman, logout }; 
