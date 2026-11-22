import { db } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const produkRef    = ref(db, 'produk');
const container    = document.getElementById("daftarProduk");
const inputCari    = document.getElementById("cariProduk");
const tombolFilter = document.querySelectorAll(".category-item");

let semuaProduk   = [];
let kategoriAktif = "semua";

// Listener baca produk dari Firebase
onValue(produkRef, (snapshot) => {
  const data = snapshot.val();

  if (!container) {
    console.error('❌ Container #daftarProduk TIDAK DITEMUKAN di produk.html');
    return;
  }

  if (!data) {
    container.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:#888;padding:30px;">Belum ada produk di Firebase</p>';
    return;
  }

  // Simpan semua produk untuk filter & pencarian
  semuaProduk = Object.keys(data).map(key => ({ id: key, ...data[key] }));
  tampilkanHasil();
}, (error) => {
  console.error("❌ GAGAL BACA PRODUK:", error);
  if (container) {
    container.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:#dc3545;padding:30px;">⚠️ Gagal memuat produk: ' +
      error.message + '<br><small>Cek Firebase Rules: produk: { ".read": true }</small></p>';
  }
});

// Fungsi utama: filter kategori + cari + render kartu
function tampilkanHasil() {
  if (!container) return;

  const kataCari = (inputCari ? inputCari.value : "").toLowerCase().trim();
  let hasil = semuaProduk;

  // Filter kategori (multi-kategori + auto "diskon" untuk produk yang sedang diskon)
  if (kategoriAktif !== "semua") {
    hasil = hasil.filter(p => {
      let k = p.kategori;
      if (Array.isArray(k)) {
        k = k.map(x => String(x).toLowerCase());
      } else if (typeof k === "string") {
        k = [k.toLowerCase()];
      } else {
        k = [];
      }
      // (kategori "diskon" otomatis dihapus — sekarang kategori = klasifikasi produk)
      return k.includes(kategoriAktif);
    });
  }

  // Filter pencarian real-time
  if (kataCari) {
    hasil = hasil.filter(p => (p.nama || "").toLowerCase().includes(kataCari));
  }

  if (hasil.length === 0) {
    container.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:#888;padding:30px;">Produk yang dicari tidak ditemukan</p>';
    return;
  }

  container.innerHTML = hasil.map(item => {
    const harga     = Number(item.harga || 0);
    const diskon    = Number(item.diskon || 0);
    const hargaAsli = item.hargaAsli || (diskon ? Math.round(harga * 100 / (100 - diskon)) : harga);
    const foto      = item.foto || 'https://picsum.photos/id/21/400/400';
    const nama      = item.nama || '(Tanpa nama)';
    const terjual   = Number(item.terjual || 0);

    const badgeDiskon = diskon ? `<span class="product-discount">-${diskon}%</span>` : '';
    const hargaCoret  = (diskon && hargaAsli !== harga)
      ? `<small style="text-decoration:line-through;color:#999;">Rp ${hargaAsli.toLocaleString('id-ID')}</small>`
      : '';

    return `
      <a href="detail.html?id=${item.id}" class="product-card">
        <div class="product-image-wrapper">
          <img src="${foto}" alt="${nama}" class="product-image"
               onerror="this.onerror=null;this.src='https://picsum.photos/id/21/400/400';">
          ${badgeDiskon}
        </div>
        <div class="product-info">
          <h3 class="product-name">${nama}</h3>
          <p class="product-price">Rp ${harga.toLocaleString('id-ID')} ${hargaCoret}</p>
          <p class="product-sold">${terjual.toLocaleString('id-ID')} Terjual</p>
        </div>
      </a>
    `;
  }).join("");

  console.log('✅ Produk (halaman daftar) dimuat:', hasil.length, 'item');
}

// Pencarian real-time
if (inputCari) {
  inputCari.addEventListener("input", tampilkanHasil);
} else {
  console.warn('⚠️ Input #cariProduk tidak ketemu — pencarian tidak akan jalan.');
}

// ===== LACI KATEGORI: toggle bar + tutup saat klik di luar + update label =====
const kategoriWrap = document.getElementById('kategoriWrap');
const kategoriBar = document.getElementById('kategoriBar');
const kategoriTerpilih = document.getElementById('kategoriTerpilih');
if (kategoriBar) {
  kategoriBar.addEventListener('click', () => kategoriWrap.classList.toggle('terbuka'));
}
document.addEventListener('click', (e) => {
  if (kategoriWrap && !kategoriWrap.contains(e.target)) kategoriWrap.classList.remove('terbuka');
});

// Klik kategori di dalam laci
tombolFilter.forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    tombolFilter.forEach(b => b.classList.remove("aktif"));
    btn.classList.add("aktif");
    kategoriAktif = btn.dataset.kategori || "semua";
    if (kategoriTerpilih) kategoriTerpilih.textContent = btn.querySelector('span')?.textContent || 'Semua';
    if (kategoriWrap) kategoriWrap.classList.remove('terbuka');
    tampilkanHasil();
  });
}); 
