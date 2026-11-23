// ===================================================
//  SERVICE WORKER — Batam Go Online Shopping (PWA)
//  Versi fault-tolerant: 1 aset gagal tidak crash install
// ===================================================
const CACHE_NAME = 'batam-go-v90';
const ASSETS = [
  './',
  './index.html',
  './produk.html',
  './detail.html',
  './keranjang.html',
  './checkout.html',
  './toko.html',
  './style.css',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// === INSTALL: cache aset inti (tiap file di-cache terpisah, gagal 1 tidak menggagalkan lainnya) ===
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(() => console.warn('[SW] Gagal cache:', url))
        )
      )
    )
  );
  self.skipWaiting(); // aktifkan SW baru segera
});

// === ACTIVATE: hapus cache versi lama ===
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // ambil kendali halaman langsung
});

// === FETCH: cache-first, fallback network, fallback index.html ===
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // JANGAN cache data Firebase / Google Auth (dinamis, harus selalu fresh)
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com')
  ) {
    return;
  }

  // Hanya tangani GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(resp => {
          // Simpan respons valid ke cache (opsional, salin dulu)
          if (resp && resp.status === 200) {
            const salinan = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, salinan));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html')); // offline → fallback beranda
    })
  );
});

// === Pesan: SW baru tersedia (siap update) ===
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
}); 
