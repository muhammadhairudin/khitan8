# Bakti Amal Khitan - Masjid Al Hidayah (Periode ke-8)

Halaman web profesional untuk event Bakti Amal Khitan Masjid Al Hidayah Periode ke-8, dibangun dengan React, JSX, dan Tailwind CSS.

## Fitur

- ✅ **Hero Section Profesional** - Hero section dengan gradient overlay, decorative elements, dan CTA buttons
- ✅ **Mobile-First Design** - Optimized untuk mobile dengan responsive breakpoints
- ✅ **Poster Image** - Menampilkan poster event di bagian atas
- ✅ Desain modern dan profesional dengan gradient purple/blue
- ✅ Informasi lengkap event (persyaratan, waktu, tempat)
- ✅ Integrasi Google Sheets untuk menampilkan daftar pendaftar secara real-time
- ✅ Auto-refresh setiap 30 detik
- ✅ Statistik kuota dan pendaftar
- ✅ Download data PDF dengan format profesional
- ✅ Link pendaftaran Google Form
- ✅ Link WhatsApp langsung ke Muhammad Hairudin (0852 4920 9213)
- ✅ Informasi donasi dan kontak

## Teknologi

- **React 18** - UI Framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Google Sheets API** - Data source

## Instalasi

1. Install dependencies:
```bash
npm install
```

2. Jalankan development server:
```bash
npm run dev
```

3. Build untuk production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Konfigurasi

### Google Sheets Setup

1. Pastikan Google Sheet sudah dipublikasikan:
   - Buka Google Sheets
   - File → Share → "Anyone with the link can view"
   - Atau File → Publish to the web

2. URL CSV sudah dikonfigurasi di `src/App.jsx`:
   ```javascript
   const GSHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/..."
   ```

3. Format kolom yang didukung:
   - Nama Anak / Nama Anak/ Peserta / Nama
   - Tanggal Lahir / Tgl Lahir / TTL
   - Nama Ayah / Ayah
   - Nama Ibu / Ibu
   - No HP / No Handphone / WhatsApp / No WA
   - Alamat / Address

### Customization

- **Kuota maksimal**: Edit `MAX_QUOTA` di `src/App.jsx`
- **Google Form URL**: Edit `GOOGLE_FORM_URL` di `src/App.jsx`
- **Warna & styling**: Edit `tailwind.config.js`

## Struktur Proyek

```
khitan8/
├── public/
│   ├── poster.jpg       # Poster event (tambahkan file Anda di sini)
│   └── README_POSTER.md # Instruksi poster
├── src/
│   ├── App.jsx          # Komponen utama
│   ├── main.jsx         # Entry point
│   └── index.css        # Tailwind CSS
├── index.html           # HTML template
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind configuration
├── vite.config.js       # Vite configuration
└── README.md            # Dokumentasi
```

## Menambahkan Poster

1. Simpan file poster dengan nama `poster.jpg` di folder `public/`
2. Format yang didukung: JPG, PNG, atau WebP
3. Ukuran disarankan: minimal 800px lebar untuk kualitas baik
4. Jika file tidak ditemukan, gambar akan disembunyikan otomatis

## Lisensi

Proyek ini dibuat untuk Masjid Al Hidayah.

