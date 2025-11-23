import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const GSHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1YfG_YoJbRCMVEbLuzcxq-d_Gxv1c1i59iN4tWQCcloo/export?format=csv&gid=1769997494"
const MAX_QUOTA = 50
const GOOGLE_FORM_URL = "https://forms.gle/m8uJU9yBq8jmKeUZ6"

function App() {
  const [registrants, setRegistrants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchRegistrants()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRegistrants, 30000)
    return () => clearInterval(interval)
  }, [])

  const parseCSV = (text) => {
    const rows = text.split(/\r?\n/).filter(r => r.trim() !== "")
    return rows.map(r => {
      const cols = []
      let cur = ""
      let inQuotes = false
      
      for (let i = 0; i < r.length; i++) {
        const ch = r[i]
        if (ch === '"') {
          inQuotes = !inQuotes
          continue
        }
        if (ch === ',' && !inQuotes) {
          cols.push(cur)
          cur = ""
          continue
        }
        cur += ch
      }
      cols.push(cur)
      return cols.map(c => c.trim())
    })
  }

  const fetchRegistrants = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const resp = await fetch(GSHEET_CSV_URL, { cache: "no-store" })
      if (!resp.ok) throw new Error(`Tidak dapat memuat data sheet (status ${resp.status})`)
      
      const txt = await resp.text()
      const data = parseCSV(txt)
      
      if (data.length === 0) throw new Error('Sheet kosong')
      
      const header = data[0].map(h => h.toLowerCase())
      
      const findIndex = (nameCandidates) => {
        for (const cand of nameCandidates) {
          const i = header.findIndex(h => h.includes(cand))
          if (i >= 0) return i
        }
        return -1
      }
      
      const col_nama = findIndex(["nama anak", "nama anak/ peserta", "nama", "nama anak"])
      const col_tgllahir = findIndex(["tanggal lahir", "tgl lahir", "ttl", "tanggal"])
      const col_ayah = findIndex(["nama ayah", "ayah", "nama ayah / wali"])
      const col_ibu = findIndex(["nama ibu", "ibu"])
      const col_phone = findIndex(["no hp", "no handphone", "whatsapp", "no wa", "phone", "hp"])
      const col_alamat = findIndex(["alamat", "address"])
      
      const rows = data.slice(1)
        .map((r, i) => ({
          no: i + 1,
          nama: col_nama >= 0 ? (r[col_nama] || "") : (r[0] || ""),
          lahir: col_tgllahir >= 0 ? (r[col_tgllahir] || "") : (r[1] || ""),
          ayah: col_ayah >= 0 ? (r[col_ayah] || "") : (r[2] || ""),
          ibu: col_ibu >= 0 ? (r[col_ibu] || "") : (r[3] || ""),
          phone: col_phone >= 0 ? (r[col_phone] || "") : (r[4] || ""),
          alamat: col_alamat >= 0 ? (r[col_alamat] || "") : (r[5] || ""),
        }))
        .filter(r => r.nama && r.nama.trim() !== "")
      
      setRegistrants(rows)
      setLastUpdated(new Date())
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError(err.message)
      setLoading(false)
      setLastUpdated(new Date())
    }
  }

  const escapeHtml = (s) => {
    if (!s) return ""
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  }

  const downloadPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4')
    
    // Header
    doc.setFontSize(18)
    doc.setTextColor(43, 15, 110) // Purple color
    doc.text('Daftar Pendaftar Bakti Amal Khitan', 14, 15)
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text('Masjid Al Hidayah - Periode ke-8', 14, 22)
    doc.text(`Tahun 1447 H / 2025 M`, 14, 28)
    
    // Date
    const now = new Date()
    doc.setFontSize(10)
    doc.text(`Dicetak: ${now.toLocaleString('id-ID')}`, 14, 34)
    
    // Table data
    const tableData = registrants.map((r) => [
      r.no,
      r.nama || '-',
      r.lahir || '-',
      r.ayah || '-',
      r.ibu || '-',
      r.phone || '-',
      r.alamat || '-'
    ])
    
    // AutoTable
    doc.autoTable({
      head: [['No', 'Nama Anak', 'Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'No HP / WhatsApp', 'Alamat']],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [246, 200, 76], // Gold color
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 40, left: 14, right: 14 },
    })
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(
        `Halaman ${i} dari ${pageCount} - Total Pendaftar: ${registrants.length} dari ${MAX_QUOTA} kuota`,
        14,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }
    
    // Save
    doc.save(`Daftar_Pendaftar_Bakti_Khitan_${now.toISOString().split('T')[0]}.pdf`)
  }

  const total = registrants.length
  const quotaLeft = Math.max(0, MAX_QUOTA - total)

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Hero Section - Professional */}
      <section className="relative overflow-hidden">
        {/* Background Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-purple-800/50"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative max-w-[1100px] mx-auto px-3 sm:px-5 md:px-7 pt-8 sm:pt-12 md:pt-16 pb-6 sm:pb-8 md:pb-12">
          <div className="text-center">
            {/* Badge Periode */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 sm:px-5 sm:py-2 mb-4 sm:mb-6">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="text-white text-xs sm:text-sm font-semibold">Periode ke-8 · Tahun 1447 H / 2025 M</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-4 md:mb-6 leading-tight tracking-tight">
              <span className="block text-white drop-shadow-2xl">Bakti Amal Khitan</span>
              <span className="block text-gold mt-1 sm:mt-2">Masjid Al Hidayah</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
              Program khitan gratis dengan fasilitas lengkap untuk putra Anda. 
              <span className="block mt-1 sm:mt-2 text-sm sm:text-base text-white/80">
                Metode laser modern · Petugas berpengalaman · Kuota terbatas
              </span>
            </p>

            {/* Key Features Badges */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="bg-gold/20 backdrop-blur-sm border border-gold/30 rounded-full px-4 py-2 sm:px-5 sm:py-2.5">
                <span className="text-gold font-bold text-sm sm:text-base">100% Gratis</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 sm:px-5 sm:py-2.5">
                <span className="text-white font-semibold text-sm sm:text-base">Metode Laser</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 sm:px-5 sm:py-2.5">
                <span className="text-white font-semibold text-sm sm:text-base">Kuota: 50 Anak</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <a
                href={GOOGLE_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2.5 sm:gap-3 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gold text-black font-bold text-base sm:text-lg shadow-2xl hover:shadow-gold/50 hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Daftar Sekarang</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="https://wa.me/6285249209213"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 sm:gap-3 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white font-semibold text-base sm:text-lg hover:bg-white/20 hover:border-white/30 transition-all duration-300 w-full sm:w-auto"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span>Hubungi Kami</span>
              </a>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 sm:p-4">
                <div className="text-2xl sm:text-3xl font-bold text-gold mb-1">{quotaLeft}</div>
                <div className="text-xs sm:text-sm text-white/70">Sisa Kuota</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 sm:p-4">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{total}</div>
                <div className="text-xs sm:text-sm text-white/70">Terdaftar</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 sm:p-4">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">50</div>
                <div className="text-xs sm:text-sm text-white/70">Total Kuota</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-[1100px] mx-auto px-3 sm:px-5 md:px-7 pb-3 sm:pb-5 md:pb-7">
        <div className="bg-gradient-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-7 shadow-2xl border border-white/5 -mt-6 sm:-mt-8 md:-mt-12 relative z-10">
          {/* Poster Image - Mobile First */}
          <div className="mb-4 sm:mb-5 md:mb-6">
            <img 
              src="/poster.jpg" 
              alt="Poster Bakti Amal Khitan Masjid Al Hidayah Periode ke-8"
              className="w-full h-auto rounded-lg sm:rounded-xl shadow-lg object-cover"
              onError={(e) => {
                // Fallback jika gambar tidak ditemukan
                e.target.style.display = 'none'
              }}
            />
          </div>

        {/* Header Section - Mobile First */}
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-2 leading-tight tracking-wide text-white drop-shadow-lg">
            Bakti Amal Khitan — Masjid Al Hidayah (Periode ke-8)
          </h1>
          <div className="text-muted mb-3 text-xs sm:text-sm md:text-base">
            Tahun 1447 H / 2025 M — Gratis, fasilitas lengkap, kuota terbatas
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            <span className="bg-gold text-black px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-semibold text-xs sm:text-sm">
              Gratis
            </span>
            <span className="bg-gold text-black px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-semibold text-xs sm:text-sm">
              Kuota: 50 Anak
            </span>
            <span className="bg-gold text-black px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full font-semibold text-xs sm:text-sm">
              Metode Laser
            </span>
          </div>

          {/* Hadith Quote - Mobile Optimized */}
          <div className="bg-white/6 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/10 mb-3">
            <p className="text-white font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Rasulullah ﷺ bersabda:</p>
            <p className="text-white/95 text-xs sm:text-sm leading-relaxed italic">
              "Fitrah itu ada lima: khitan (sunat), mencukur bulu kemaluan, memotong kumis, memotong kuku, dan mencabut bulu ketiak."
            </p>
            <p className="text-muted text-[10px] sm:text-xs mt-1.5 sm:mt-2">(HR. Bukhari No. 5891 dan Muslim No. 257)</p>
          </div>

          {/* Requirements Card - Mobile First */}
          <div className="bg-white/3 p-4 sm:p-5 rounded-lg sm:rounded-xl border border-white/5">
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-white">Persyaratan Utama</h3>
            <ul className="list-disc list-inside space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-white/90 leading-relaxed ml-1 sm:ml-2">
              <li>Melakukan pendaftaran (Offline / Online).</li>
              <li>Anak berusia minimal 6 tahun dan belum baligh.</li>
              <li>Tidak memiliki riwayat alergi obat.</li>
              <li>Tidak memiliki riwayat kelainan pembekuan darah.</li>
            </ul>

            <div className="bg-gradient-to-r from-white/3 to-black/3 p-2.5 sm:p-3 rounded-lg mt-3 sm:mt-4 text-xs sm:text-sm font-semibold">
              <div className="mb-1">
                <strong>Waktu Pelaksanaan:</strong> Ahad, 07 Rajab 1447 H / 27 Desember 2025 M
              </div>
              <div>
                <strong>Tempat:</strong> Masjid Al Hidayah — Jl. Simpang Patimura Gg. Taher, Kuala Pembuang, Kab. Seruyan, Kalteng
              </div>
            </div>

            {/* CTA Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4">
              <a
                href={GOOGLE_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 sm:gap-2.5 px-4 py-2.5 sm:py-2.5 rounded-lg bg-gold text-black font-bold shadow-lg hover:opacity-90 transition-opacity text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Daftar Sekarang
              </a>
              <button
                onClick={downloadPDF}
                disabled={loading || registrants.length === 0}
                className="inline-flex items-center justify-center gap-2 sm:gap-2.5 px-4 py-2.5 sm:py-2.5 rounded-lg bg-transparent border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Unduh Data (PDF)
              </button>
              <a
                href="https://wa.me/6285249209213"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 sm:gap-2.5 px-4 py-2.5 sm:py-2.5 rounded-lg bg-transparent border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Kontak & Info
              </a>
            </div>
          </div>
        </div>

        {/* Highlighted Donation Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-gold/20 via-gold/10 to-transparent p-6 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-gold/30 shadow-xl relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gold/20 rounded-lg">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Infaq / Donasi Kegiatan</h3>
                  <p className="text-gold/80 text-xs sm:text-sm">Bantu program ini dengan infaq terbaik Anda</p>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-5">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <div>
                      <p className="text-white font-semibold text-sm sm:text-base mb-1">Bank Muamalat</p>
                      <p className="text-muted text-xs sm:text-sm">Kode Bank: 147</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    <div>
                      <p className="text-white font-semibold text-sm sm:text-base mb-1">Nomor Rekening</p>
                      <p className="text-gold font-bold text-lg sm:text-xl font-mono tracking-wider">8070010010700250</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <p className="text-white font-semibold text-sm sm:text-base mb-1">Atas Nama</p>
                      <p className="text-white text-sm sm:text-base font-medium">MASJID AL HIDAYAH</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-gold/80">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Jazakumullahu khairan atas infaq dan dukungannya</span>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">

          {/* Facilities */}
          <div className="bg-white/3 p-4 sm:p-5 rounded-lg sm:rounded-xl border border-white/5">
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-white">Fasilitas & Keunggulan</h3>
            <ul className="list-disc list-inside space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-white/90 leading-relaxed ml-1 sm:ml-2">
              <li>Piagam Penghargaan Khitan</li>
              <li>Khitan Metode Laser</li>
              <li>Petugas khitan berpengalaman</li>
              <li>Obat-obatan pasca khitan & konsultasi perawatan</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="bg-white/3 p-4 sm:p-5 rounded-lg sm:rounded-xl border border-white/5">
            <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-white">Kontak Informasi</h3>
            <p className="text-muted text-xs sm:text-sm leading-relaxed">
              Muhammad Hairudin: <a href="https://wa.me/6285249209213" className="text-gold hover:underline">0852 4920 9213</a><br />
              Abu Dzaky: 0821 5090 4592
            </p>
            <p className="text-muted text-xs sm:text-sm mt-2 sm:mt-3">
              <strong>Catatan:</strong> Pendaftaran offline juga dapat dilakukan langsung ke panitia masjid. Pendaftaran akan ditutup bila kuota terpenuhi.
            </p>
          </div>
        </div>

        {/* Full Width Registrants Table */}
        <div className="bg-white/3 p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">Daftar Pendaftar</h2>
              <div className="text-muted text-xs sm:text-sm">
                {lastUpdated
                  ? `Terakhir sinkron: ${lastUpdated.toLocaleString('id-ID', { 
                      day: '2-digit', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}`
                  : 'Memuat...'}
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={fetchRegistrants}
                disabled={loading}
                className="p-2 sm:p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh data"
              >
                <svg 
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="bg-black/25 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-sm sm:text-base bg-gradient-to-r from-gold/20 to-white/5 text-gold flex-1 sm:flex-none text-center">
                {total} peserta
              </div>
            </div>
          </div>

          {/* Table Container - Full Width */}
          <div className="max-h-[500px] sm:max-h-[600px] md:max-h-[700px] overflow-auto rounded-lg border border-white/5 bg-gradient-to-b from-black/10 to-white/1">
            {loading && !error && (
              <div className="text-center py-12 sm:py-16 text-muted text-sm sm:text-base">
                Memuat data...
              </div>
            )}

            {error && (
              <div className="text-center py-12 sm:py-16 px-4 sm:px-6 text-muted text-sm sm:text-base">
                Gagal memuat data: {error}. Pastikan Google Sheet sudah dipublikasikan / di-share "Anyone with link can view".
              </div>
            )}

            {!loading && !error && registrants.length === 0 && (
              <div className="text-center py-12 sm:py-16 text-muted text-sm sm:text-base">
                Belum ada pendaftar
              </div>
            )}

            {!loading && !error && registrants.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-black/30 backdrop-blur-md z-10">
                      <th className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm md:text-base font-bold border-b border-dashed border-white/10">No</th>
                      <th className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm md:text-base font-bold border-b border-dashed border-white/10">Nama Anak</th>
                      <th className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm md:text-base font-bold border-b border-dashed border-white/10">Tanggal Lahir</th>
                      <th className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm md:text-base font-bold border-b border-dashed border-white/10">Nama Ayah</th>
                      <th className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm md:text-base font-bold border-b border-dashed border-white/10">Nama Ibu</th>
                      <th className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm md:text-base font-bold border-b border-dashed border-white/10">No HP / WhatsApp</th>
                      <th className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm md:text-base font-bold border-b border-dashed border-white/10">Alamat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrants.map((r, i) => (
                      <tr key={i} className="border-b border-dashed border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm md:text-base">{r.no}</td>
                        <td className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm md:text-base font-medium text-white">{escapeHtml(r.nama)}</td>
                        <td className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm md:text-base">{escapeHtml(r.lahir)}</td>
                        <td className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm md:text-base">{escapeHtml(r.ayah)}</td>
                        <td className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm md:text-base">{escapeHtml(r.ibu)}</td>
                        <td className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm md:text-base">{escapeHtml(r.phone)}</td>
                        <td className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm md:text-base">{escapeHtml(r.alamat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Statistics - Full Width */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-white/3 px-4 sm:px-5 py-3 sm:py-4 rounded-lg min-w-[120px] sm:min-w-[140px] text-center flex-1">
              <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-gold mb-1 sm:mb-2">{quotaLeft}</h4>
              <p className="text-muted text-xs sm:text-sm">Sisa Kuota</p>
            </div>
            <div className="bg-white/3 px-4 sm:px-5 py-3 sm:py-4 rounded-lg min-w-[120px] sm:min-w-[140px] text-center flex-1">
              <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">{total}</h4>
              <p className="text-muted text-xs sm:text-sm">Total Terdaftar</p>
            </div>
            <div className="bg-white/3 px-4 sm:px-5 py-3 sm:py-4 rounded-lg min-w-[120px] sm:min-w-[140px] text-center flex-1">
              <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
                {lastUpdated ? lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </h4>
              <p className="text-muted text-xs sm:text-sm">Terakhir Sinkron</p>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-8 sm:mt-10 md:mt-12 mb-6 sm:mb-8">
          <div className="bg-white/3 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="p-2 bg-gold/20 rounded-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Lokasi Masjid Al Hidayah</h3>
                <p className="text-muted text-xs sm:text-sm">Jl. Simpang Patimura Gg. Taher, Kuala Pembuang, Kab. Seruyan, Kalteng</p>
              </div>
            </div>
            <div className="rounded-lg sm:rounded-xl overflow-hidden border border-white/10 shadow-lg bg-white/5">
              <iframe
                src="https://www.google.com/maps?q=Masjid+Al+Hidayah+Kuala+Pembuang+Seruyan+Kalimantan+Tengah&output=embed"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Masjid Al Hidayah"
                className="w-full"
              ></iframe>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Masjid+Al+Hidayah+Kuala+Pembuang+Seruyan"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 hover:bg-gold/30 border border-gold/30 rounded-lg text-gold font-semibold text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Buka di Google Maps
              </a>
            </div>
          </div>
        </div>

        {/* Footer - Professional */}
        <footer className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {/* About Section */}
            <div className="text-center md:text-left">
              <h3 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Tentang Program</h3>
              <p className="text-muted text-xs sm:text-sm leading-relaxed mb-3">
                Bakti Amal Khitan adalah program khitan gratis yang diselenggarakan oleh Masjid Al Hidayah untuk membantu masyarakat dalam melaksanakan sunnah Rasulullah ﷺ.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 text-gold">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-xs sm:text-sm font-semibold">Periode ke-8</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="text-center md:text-left">
              <h3 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Informasi</h3>
              <ul className="space-y-2 text-muted text-xs sm:text-sm">
                <li>
                  <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors inline-flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Form Pendaftaran
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/6285249209213" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors inline-flex items-center gap-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Hubungi Panitia
                  </a>
                </li>
                <li>
                  <button
                    onClick={downloadPDF}
                    disabled={loading || registrants.length === 0}
                    className="hover:text-gold transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Download Data PDF
                  </button>
                </li>
                <li className="pt-2">
                  <div className="text-white/60 text-[10px] sm:text-xs">
                    <strong className="text-white">Waktu:</strong> Ahad, 07 Rajab 1447 H / 27 Desember 2025 M
                  </div>
                </li>
              </ul>
            </div>

            {/* Contact Section */}
            <div className="text-center md:text-left">
              <h3 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Kontak</h3>
              <div className="space-y-2 text-muted text-xs sm:text-sm">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-white font-medium">Muhammad Hairudin</div>
                    <a href="https://wa.me/6285249209213" className="hover:text-gold transition-colors">0852 4920 9213</a>
                  </div>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-white font-medium">Abu Dzaky</div>
                    <span>0821 5090 4592</span>
                  </div>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2 pt-2">
                  <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="text-white/80 text-[10px] sm:text-xs">
                    Jl. Simpang Patimura Gg. Taher<br />
                    Kuala Pembuang, Kab. Seruyan, Kalteng
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 sm:pt-8 border-t border-white/5">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
              <div className="text-center sm:text-left">
                <p className="text-white font-semibold text-sm sm:text-base mb-1">Masjid Al Hidayah</p>
                <p className="text-muted text-xs sm:text-sm">
                  Halaman informasi & pendaftaran Bakti Amal Khitan Periode ke-8
                </p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-muted text-xs sm:text-sm mb-1">
                  © {new Date().getFullYear()} Masjid Al Hidayah. All rights reserved.
                </p>
                <p className="text-gold text-xs sm:text-sm font-medium">
                  Baarokallahu 'Alaikum
                </p>
              </div>
            </div>
          </div>
        </footer>
        </div>
      </div>
    </div>
  )
}

export default App
