import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f5132',
    borderBottomStyle: 'solid',
    paddingBottom: 6,
  },
  headerDocCode: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f5132',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 7.5,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f5132',
    backgroundColor: '#f0fdf4',
    padding: '3 5',
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#0f5132',
    borderLeftStyle: 'solid',
  },
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    minHeight: 16,
    alignItems: 'stretch',
  },
  tableRowHeader: {
    backgroundColor: '#f8fafc',
  },
  tableCellLabel: {
    width: '26%',
    padding: '3 5',
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f8fafc',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableCellValue: {
    width: '74%',
    padding: '3 5',
    fontSize: 7.5,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  tableHeaderCell: {
    padding: '3 4',
    fontSize: 7,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableBodyCell: {
    padding: '3 4',
    fontSize: 7,
    color: '#0f172a',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
    lineHeight: 1.25,
  },
  signaturesContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
  },
  signatureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  signatureCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#ffffff',
  },
  signatureCardSigned: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  signatureRoleHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  signatureName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signatureMeta: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 1,
  },
  signatureImage: {
    height: 32,
    width: 'auto',
    marginVertical: 3,
    objectFit: 'contain',
    alignSelf: 'flex-start',
  },
  badge: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#15803d',
    backgroundColor: '#dcfce7',
    padding: '1.5 3',
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgePending: {
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
  },
  badgeDecision: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#0f5132',
    padding: '2 5',
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    color: '#94a3b8',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 3,
  },
});

export interface CvReportPdfData {
  namaTim: string;
  namaProyek?: string;
  tanggalCetak: string;
  // Section A: Ringkasan Problem & Solusi
  projectMission?: string;
  customerDanContext?: string;
  problemHypothesis?: string;
  hmw?: string;
  validatedSolution?: string;
  valueProposition?: string;
  fiturKunci1?: string;
  fiturKunci2?: string;
  fiturKunci3?: string;
  flowSolusi?: string;
  // Section B: Pengujian Pengguna & Instrumen
  prototypeSolusiLink?: string;
  mekanismeUserTesting?: string;
  tanggalLokasiTesting?: string;
  jumlahRespondenAktual?: number;
  profilRespondenAktual?: string;
  // Section C: Feedback Matrix per Responden
  feedbackRespondenList?: Array<{
    respondenProfil: string;
    usabilitySkorFeedback?: string;
    functionalitySkorFeedback?: string;
    solvabilitySkorFeedback?: string;
    payabilitySkorFeedback?: string;
    others?: string;
    priorityInsightAction?: string;
  }>;
  // Section D: Hasil Pengukuran Metrik
  metrikHasilList?: Array<{
    validasi: string;
    metrik: string;
    target?: string;
    hasilAktual?: string;
    interpretasi?: string;
    learning?: string;
    enhancement?: string;
  }>;
  // Section E: Temuan Kualitatif
  temuanKualitatifList?: Array<{
    kategori: string;
    pertanyaanKunci: string;
    temuanUtama: string;
  }>;
  // Section F: Analisis Akhir & Keputusan
  kesimpulan?: string;
  ketercapaianPsf?: string;
  keputusan?: string;
  catatanMvpPlanning?: string;
  buktiPendukung?: any[];
  // Section G: Tanda Tangan
  ttdDisusun?: any;
  ttdDiperiksa?: any;
  ttdDisetujui?: any;
  inisiatorCharterName?: string;
  coachCharterName?: string;
  poCharterName?: string;
}

export function CvReportPdfDocument({ data }: { data: CvReportPdfData }) {
  const formatTtdDate = (d?: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const getDecisionLabel = (k?: string) => {
    switch (k) {
      case 'lanjut':
        return 'Lanjut ke Market Validation (Fit)';
      case 'iterasi':
        return 'Iterasi Solusi (Belum Fit)';
      case 'hold':
        return 'Hold (Tunda Sementara)';
      case 'stop':
        return 'Stop (Hentikan Proyek)';
      default:
        return k || '-';
    }
  };

  const getPsfLabel = (p?: string) => {
    switch (p) {
      case 'tercapai':
        return 'Tercapai (Fit)';
      case 'tercapai_dengan_catatan':
        return 'Tercapai dengan Catatan';
      case 'belum_tercapai':
        return 'Belum Tercapai';
      default:
        return p || '-';
    }
  };

  return (
    <Document title={`Laporan-CustomerValidation-${data.namaTim}`}>
      {/* ── HALAMAN 1: Ringkasan Problem, Solusi & Pengujian ── */}
      <Page size="A4" style={styles.page}>
        {/* Header Dokumen Resmi */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerDocCode}>
            FR-PIA-02.2 &bull; TEMPLATE RESMI 2.2 &bull; PEGADAIAN INNOVATION AWARD S-12
          </Text>
          <Text style={styles.headerTitle}>
            LAPORAN HASIL VALIDASI PELANGGAN (CUSTOMER VALIDATION)
          </Text>
          <Text style={styles.headerSubtitle}>
            Tim: {data.namaTim} | Proyek: {data.namaProyek || data.namaTim} | Dicetak: {data.tanggalCetak}
          </Text>
        </View>

        {/* Section A: Ringkasan Problem dan Solusi */}
        <Text style={styles.sectionTitle}>
          A. Ringkasan Problem dan Solusi Tervalidasi
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Project Mission</Text>
            <Text style={styles.tableCellValue}>{data.projectMission || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Customer &amp; Context</Text>
            <Text style={styles.tableCellValue}>{data.customerDanContext || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Problem Worth Solving</Text>
            <Text style={styles.tableCellValue}>{data.problemHypothesis || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>How Might We (HMW)</Text>
            <Text style={styles.tableCellValue}>{data.hmw || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Validated Solution</Text>
            <Text style={styles.tableCellValue}>{data.validatedSolution || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Value Proposition</Text>
            <Text style={styles.tableCellValue}>{data.valueProposition || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Fitur Kunci Solusi</Text>
            <Text style={styles.tableCellValue}>
              1. {data.fiturKunci1 || '-'} {'\n'}
              2. {data.fiturKunci2 || '-'} {'\n'}
              3. {data.fiturKunci3 || '-'}
            </Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Flow Solusi</Text>
            <Text style={styles.tableCellValue}>{data.flowSolusi || '-'}</Text>
          </View>
        </View>

        {/* Section B: Pelaksanaan & Instrumen Pengujian */}
        <Text style={styles.sectionTitle}>
          B. Pelaksanaan &amp; Instrumen Pengujian Pengguna
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Link Prototype Solusi</Text>
            <Text style={styles.tableCellValue}>{data.prototypeSolusiLink || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Mekanisme User Testing</Text>
            <Text style={styles.tableCellValue}>{data.mekanismeUserTesting || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Tanggal &amp; Lokasi</Text>
            <Text style={styles.tableCellValue}>{data.tanggalLokasiTesting || '-'}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Responden Aktual</Text>
            <Text style={styles.tableCellValue}>
              Jumlah: {data.jumlahRespondenAktual ?? 0} responden {'\n'}
              Profil: {data.profilRespondenAktual || '-'}
            </Text>
          </View>
        </View>

        {/* Section C: Feedback Matrix per Responden */}
        {data.feedbackRespondenList && data.feedbackRespondenList.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              C. Feedback Matrix per Responden ({data.feedbackRespondenList.length} Responden)
            </Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableRowHeader]}>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Profil Responden</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Usability</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Functionality</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Solvability</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Payability</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>Priority Action</Text>
              </View>
              {data.feedbackRespondenList.slice(0, 4).map((row, idx) => (
                <View key={idx} style={[styles.tableRow, idx === Math.min(3, data.feedbackRespondenList!.length - 1) ? { borderBottomWidth: 0 } : {}]}>
                  <Text style={[styles.tableBodyCell, { width: '20%', fontWeight: 'bold' }]}>{row.respondenProfil}</Text>
                  <Text style={[styles.tableBodyCell, { width: '15%' }]}>{row.usabilitySkorFeedback || '-'}</Text>
                  <Text style={[styles.tableBodyCell, { width: '15%' }]}>{row.functionalitySkorFeedback || '-'}</Text>
                  <Text style={[styles.tableBodyCell, { width: '15%' }]}>{row.solvabilitySkorFeedback || '-'}</Text>
                  <Text style={[styles.tableBodyCell, { width: '15%' }]}>{row.payabilitySkorFeedback || '-'}</Text>
                  <Text style={[styles.tableBodyCell, { width: '20%', borderRightWidth: 0 }]}>{row.priorityInsightAction || '-'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text>PIA Season 12 &bull; Dokumen FR-PIA-02.2</Text>
          <Text>Halaman 1 dari 2</Text>
        </View>
      </Page>

      {/* ── HALAMAN 2: Pengukuran, Temuan Kualitatif, Analisis & Tanda Tangan ── */}
      <Page size="A4" style={styles.page}>
        {/* Section D: Hasil Pengukuran Customer Validation */}
        <Text style={styles.sectionTitle}>
          D. Hasil Pengukuran Customer Validation (7 Parameter)
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Validasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Metrik</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Target</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Hasil Aktual</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Interpretasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%', borderRightWidth: 0 }]}>Enhancement</Text>
          </View>
          {(data.metrikHasilList && data.metrikHasilList.length > 0
            ? data.metrikHasilList
            : [
                { validasi: 'Desirability', metrik: 'Kepuasan Pengguna', target: 'Rata-rata ≥4 atau target lain yang disepakati' },
                { validasi: 'Desirability', metrik: 'Ketertarikan Penggunaan Berulang', target: 'Mayoritas minimal "Sering" atau target lain yang disepakati' },
                { validasi: 'Desirability', metrik: 'Rekomendasi kepada Orang Lain', target: 'Mayoritas minimal "Mungkin"' },
                { validasi: 'Desirability', metrik: 'Kejelasan dan Kemudahan Penggunaan', target: 'Rata-rata ≥4 atau mayoritas "Mudah"' },
                { validasi: 'Desirability', metrik: 'Kesediaan Membayar / Menggunakan', target: 'Mayoritas bersedia membayar/menggunakan' },
                { validasi: 'Feasibility On Paper', metrik: 'Kelayakan teknis/operasional awal', target: 'Tidak ada blocker kritis sebelum MVP' },
                { validasi: 'Viability On Paper', metrik: 'Potensi dampak bisnis/ekonomi awal', target: 'Terdapat potensi manfaat dan asumsi yang dapat diuji saat MVP' },
              ]
          ).map((m, idx) => (
            <View key={idx} style={[styles.tableRow, idx === 6 ? { borderBottomWidth: 0 } : {}]}>
              <Text style={[styles.tableBodyCell, { width: '12%', fontWeight: 'bold' }]}>{m.validasi}</Text>
              <Text style={[styles.tableBodyCell, { width: '22%' }]}>{m.metrik}</Text>
              <Text style={[styles.tableBodyCell, { width: '16%' }]}>{m.target || '-'}</Text>
              <Text style={[styles.tableBodyCell, { width: '16%' }]}>{m.hasilAktual || '-'}</Text>
              <Text style={[styles.tableBodyCell, { width: '18%' }]}>{m.interpretasi || '-'}</Text>
              <Text style={[styles.tableBodyCell, { width: '16%', borderRightWidth: 0 }]}>{m.enhancement || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Section E: Temuan Kualitatif */}
        <Text style={styles.sectionTitle}>
          E. Daftar Pertanyaan Kunci dan Temuan Kualitatif (6 Dimensi)
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Kategori</Text>
            <Text style={[styles.tableHeaderCell, { width: '38%' }]}>Pertanyaan Kunci</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%', borderRightWidth: 0 }]}>Temuan Utama</Text>
          </View>
          {(data.temuanKualitatifList && data.temuanKualitatifList.length > 0
            ? data.temuanKualitatifList
            : [
                { kategori: 'Kepuasan Pengguna', pertanyaanKunci: 'Bagaimana Anda menilai kecocokan prototype dengan kebutuhan?', temuanUtama: '' },
                { kategori: 'Penggunaan Berulang', pertanyaanKunci: 'Seberapa sering Anda akan menggunakan solusi ini jika tersedia?', temuanUtama: '' },
                { kategori: 'Rekomendasi', pertanyaanKunci: 'Apakah Anda akan merekomendasikan solusi ini? Kepada siapa?', temuanUtama: '' },
                { kategori: 'Kemudahan Penggunaan', pertanyaanKunci: 'Bagian mana yang paling mudah, membingungkan, atau perlu disederhanakan?', temuanUtama: '' },
                { kategori: 'Kesediaan Membayar', pertanyaanKunci: 'Apakah value sepadan dengan biaya, waktu, atau effort?', temuanUtama: '' },
                { kategori: 'Feedback Umum', pertanyaanKunci: 'Apa yang perlu ditambah, dikurangi, diubah, atau diprioritaskan?', temuanUtama: '' },
              ]
          ).map((t, idx) => (
            <View key={idx} style={[styles.tableRow, idx === 5 ? { borderBottomWidth: 0 } : {}]}>
              <Text style={[styles.tableBodyCell, { width: '22%', fontWeight: 'bold' }]}>{t.kategori}</Text>
              <Text style={[styles.tableBodyCell, { width: '38%' }]}>{t.pertanyaanKunci}</Text>
              <Text style={[styles.tableBodyCell, { width: '40%', borderRightWidth: 0 }]}>{t.temuanUtama || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Section F: Analisis Akhir, PSF & Keputusan */}
        <Text style={styles.sectionTitle}>
          F. Analisis Akhir, Ketercapaian PSF &amp; Keputusan Gerbang
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Ketercapaian PSF</Text>
            <Text style={styles.tableCellValue}>{getPsfLabel(data.ketercapaianPsf)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Keputusan Lanjut</Text>
            <View style={styles.tableCellValue}>
              <Text style={styles.badgeDecision}>{getDecisionLabel(data.keputusan)}</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Catatan MVP Planning</Text>
            <Text style={styles.tableCellValue}>{data.catatanMvpPlanning || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Kesimpulan &amp; Pembelajaran</Text>
            <Text style={styles.tableCellValue}>{data.kesimpulan || '-'}</Text>
          </View>
          {data.buktiPendukung && data.buktiPendukung.length > 0 ? (
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.tableCellLabel}>Dokumen Review &amp; Bukti</Text>
              <View style={styles.tableCellValue}>
                {data.buktiPendukung.map((b: any, bIdx: number) => (
                  <Text key={bIdx} style={{ marginBottom: 2 }}>
                    • {b.type === 'dokumen_preliminary_review'
                      ? `[Dokumen Review] ${b.file_name || 'Lampiran'}`
                      : `[Review SME - ${b.reviewer || 'SME'}]: ${b.content || b.catatan || ''}`}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Section G: Tanda Tangan 3 Kolom */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signatureGrid}>
            {/* 1. Inisiator Inovasi */}
            <View style={[styles.signatureCard, data.ttdDisusun?.status === 'signed' ? styles.signatureCardSigned : {}]}>
              <Text style={styles.signatureRoleHeader}>Disusun Oleh</Text>
              <Text style={styles.signatureName}>
                {data.ttdDisusun?.nama || data.inisiatorCharterName || 'Inisiator Inovasi'}
              </Text>
              <Text style={styles.signatureMeta}>
                {data.ttdDisusun?.jabatan || 'Inisiator Inovasi'}
              </Text>
              <Text style={styles.signatureMeta}>PT Pegadaian (Persero)</Text>
              {data.ttdDisusun?.signatureImage ? (
                <Image src={data.ttdDisusun.signatureImage} style={styles.signatureImage} />
              ) : null}
              {data.ttdDisusun?.tanggal ? (
                <Text style={styles.signatureMeta}>
                  Tgl: {formatTtdDate(data.ttdDisusun.tanggal)}
                </Text>
              ) : null}
              <Text style={[styles.badge, data.ttdDisusun?.status === 'signed' ? {} : styles.badgePending]}>
                {data.ttdDisusun?.status === 'signed' ? 'DITANDATANGANI' : 'BELUM TTD'}
              </Text>
            </View>

            {/* 2. Innovation Coach */}
            <View style={[styles.signatureCard, data.ttdDiperiksa?.status === 'signed' ? styles.signatureCardSigned : {}]}>
              <Text style={styles.signatureRoleHeader}>Diperiksa Oleh</Text>
              <Text style={styles.signatureName}>
                {data.ttdDiperiksa?.nama || data.coachCharterName || 'Innovation Coach'}
              </Text>
              <Text style={styles.signatureMeta}>
                {data.ttdDiperiksa?.jabatan || 'Innovation Coach'}
              </Text>
              <Text style={styles.signatureMeta}>PT Pegadaian (Persero)</Text>
              {data.ttdDiperiksa?.signatureImage ? (
                <Image src={data.ttdDiperiksa.signatureImage} style={styles.signatureImage} />
              ) : null}
              {data.ttdDiperiksa?.tanggal ? (
                <Text style={styles.signatureMeta}>
                  Tgl: {formatTtdDate(data.ttdDiperiksa.tanggal)}
                </Text>
              ) : null}
              <Text style={[styles.badge, data.ttdDiperiksa?.status === 'signed' ? {} : styles.badgePending]}>
                {data.ttdDiperiksa?.status === 'signed' ? 'DITANDATANGANI' : 'BELUM TTD'}
              </Text>
            </View>

            {/* 3. Project Owner */}
            <View style={[styles.signatureCard, data.ttdDisetujui?.status === 'signed' ? styles.signatureCardSigned : {}]}>
              <Text style={styles.signatureRoleHeader}>Disetujui Oleh</Text>
              <Text style={styles.signatureName}>
                {data.ttdDisetujui?.nama || data.poCharterName || 'Project Owner'}
              </Text>
              <Text style={styles.signatureMeta}>
                {data.ttdDisetujui?.jabatan || 'Project Owner'}
              </Text>
              <Text style={styles.signatureMeta}>PT Pegadaian (Persero)</Text>
              {data.ttdDisetujui?.signatureImage ? (
                <Image src={data.ttdDisetujui.signatureImage} style={styles.signatureImage} />
              ) : null}
              {data.ttdDisetujui?.tanggal ? (
                <Text style={styles.signatureMeta}>
                  Tgl: {formatTtdDate(data.ttdDisetujui.tanggal)}
                </Text>
              ) : null}
              <Text style={[styles.badge, data.ttdDisetujui?.status === 'signed' ? {} : styles.badgePending]}>
                {data.ttdDisetujui?.status === 'signed' ? 'DITANDATANGANI' : 'BELUM TTD'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>PIA Season 12 &bull; Dokumen FR-PIA-02.2</Text>
          <Text>Halaman 2 dari 2</Text>
        </View>
      </Page>
    </Document>
  );
}
