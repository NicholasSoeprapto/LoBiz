# LoBiz — Lokal Bisnis Lo Bisa

**LoBiz** adalah direktori dan etalase digital untuk UMKM lokal. Pemilik usaha bisa mendaftar, mengelola produk, memasang foto dan cerita usaha, serta melihat dashboard penjualan sederhana. Pembeli bisa menjelajahi UMKM yang sudah diverifikasi admin dan memberi rating serta ulasan.

Proyek ini mendukung **SDG 9: Industri, Inovasi, dan Infrastruktur**.

> Ini adalah aplikasi front-end murni (HTML, CSS, JavaScript) tanpa backend. Semua data disimpan di `localStorage` browser, jadi cocok sebagai prototipe atau demo.

## Fitur

**Untuk pengunjung**
- Direktori UMKM terverifikasi dengan pencarian nama, filter kategori, dan filter kota.
- Urutkan berdasarkan: Hot, Trending, Terlaris, Pembeli terbanyak, Terbaru, Rating tertinggi, Ulasan terbanyak, atau Nama A–Z.
- Filter rating minimal dan filter "punya ulasan resmi Tim LoBiz".
- Label otomatis pada kartu: 🔥 Hot, 📈 Trending, 🏆 Terlaris, 🆕 Baru.
- Halaman detail UMKM: banner, logo, slogan, cerita usaha, galeri foto (bisa diperbesar), daftar produk, dan tombol WhatsApp.
- Rating bintang dan ulasan untuk setiap UMKM.
- **Panduan (user guide)**: tombol "❓ Panduan" di navbar membuka tur interaktif bergaya spotlight yang menyorot bagian penting halaman langkah demi langkah. Ada tiga jalur: Pengunjung & Pelanggan, Pemilik UMKM, dan Admin (dua terakhir butuh login). Navigasi dengan tombol, panah kiri/kanan, atau Esc untuk menutup.
- **Chat bantuan Loby**: tombol chat di pojok kanan bawah dengan asisten otomatis bernama Loby (bot berbasis aturan, tanpa server). Menjawab pertanyaan umum seputar pendaftaran, foto toko, ulasan, filter, dan akun demo, lengkap dengan tombol saran jawaban, animasi mengetik, dan riwayat chat tersimpan di browser.
- **Akun pelanggan**: pengunjung bisa menjelajah situs dan mengobrol dengan Loby tanpa akun, tetapi chat dengan UMKM dan menulis ulasan memerlukan akun pelanggan (daftar lewat "Daftar Pelanggan"). Satu pelanggan hanya punya satu ulasan per UMKM, dan bisa memperbaruinya.
- **Checkout (simulasi)**: pelanggan yang login bisa menekan "🛒 Beli" pada produk, mengisi alamat, kode pos, dan memilih pembayaran (kartu, GoPay, OVO, DANA, ShopeePay, QRIS, transfer bank). Form divalidasi, tetapi setelah semua terisi sengaja tidak terjadi apa-apa: tidak ada pembayaran, pesanan, atau data yang disimpan.
- **Pesan**: pelanggan (yang sudah login) bisa chat dengan UMKM pilihannya lewat tombol "Chat dengan UMKM" di halaman detail. Pemilik UMKM dan admin punya kotak masuk lewat tombol "💬 Pesan" di navbar (dengan penanda belum dibaca). Admin bisa memulai chat dengan UMKM mana pun. Pesan disimpan di localStorage dan tersinkron antar tab di browser yang sama.
- Teks berjalan (kanan ke kiri) berisi UMKM terbaru, pembeli terbaru, dan ulasan baru. Datanya buatan (demo).

**Untuk pemilik UMKM**
- Daftar akun dan ajukan UMKM untuk diverifikasi.
- Dashboard ringkasan: pendapatan, unit terjual, rating, grafik tren 14 hari, dan produk terlaris.
- Kelola produk dan catat penjualan.
- **Halaman Toko**: unggah banner, logo, foto "Tentang kami", galeri (maksimal 12 foto), dan foto per produk. Atur slogan, cerita usaha, nomor WhatsApp, dan warna halaman.

**Untuk admin / Tim LoBiz**
- Verifikasi atau tolak pendaftaran UMKM dan kelola data.
- Memberi **ulasan resmi Tim LoBiz** di halaman detail UMKM. Ulasan ini diberi lencana "✔ Ulasan Resmi" dan tampil paling atas.

**Tampilan**
- Warna mengikuti logo LoBiz (maroon, merah, oranye, amber).
- Gradasi bergerak, animasi kartu, dan mode gelap/terang.
- Animasi otomatis nonaktif untuk pengguna dengan pengaturan "kurangi gerakan".

## Struktur file

```
.
├── index.html   # Struktur halaman
├── LoBiz.css    # Gaya dan animasi
├── LoBiz.js     # Logika aplikasi, data demo, dan penyimpanan
├── logo.png     # Logo LoBiz (juga dipakai sebagai favicon)
└── README.md
```

## Cara menjalankan

1. Unduh atau clone repo ini. Pastikan keempat file di atas berada di folder yang sama.
2. Buka `index.html` di browser. Tidak perlu instalasi atau build.

Opsional, jalankan lewat server lokal:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

Font diambil dari Google Fonts, jadi koneksi internet dibutuhkan agar tampilan font sesuai.

## Akun demo

| Peran | Username | Password |
|-------|----------|----------|
| Admin | `admin` | `admin123` |
| Pemilik UMKM | `siti` | `siti123` |
| Pemilik UMKM | `made` | `made123` |
| Pelanggan | `budi` | `budi123` |

Data awal (UMKM, produk, transaksi, dan ulasan) dibuat otomatis saat halaman pertama kali dibuka. Tombol reset data demo tersedia di aplikasi untuk mengembalikan ke kondisi awal.

## Catatan teknis

- **Penyimpanan**: seluruh data ada di `localStorage` browser, jadi tidak dibagikan antar perangkat atau pengguna. Menghapus data situs akan menghapus semuanya.
- **Gambar**: foto yang diunggah dikecilkan dan dikompres di browser, lalu disimpan sebagai data URL. Karena batas `localStorage` sekitar 5 MB, jumlah foto per browser terbatas dan akan muncul peringatan saat penuh.
- **Gambar bawaan**: UMKM yang belum punya foto memakai ilustrasi bergradasi yang dibuat otomatis sesuai kategori, bukan foto stock.
- **Data demo**: angka penjualan, label Hot/Trending/Terlaris, dan teks berjalan berasal dari data buatan.
- **Keamanan**: login hanya simulasi di sisi klien dan tidak aman untuk produksi.

## Pengembangan lanjutan

- Chat antar pengguna lintas perangkat (butuh backend, mis. WebSocket).
- Menghubungkan Loby ke model AI atau layanan live chat sungguhan (saat ini jawabannya berbasis aturan).
- Backend dan database sungguhan (autentikasi, penyimpanan gambar di cloud).
- Foto stock asli atau unggahan ke penyimpanan objek.
- Pembayaran dan pesanan sungguhan (saat ini checkout hanya simulasi).
- Moderasi ulasan dan notifikasi ke pemilik.

## Lisensi

Tambahkan lisensi sesuai kebutuhan repo Anda (misalnya MIT).
