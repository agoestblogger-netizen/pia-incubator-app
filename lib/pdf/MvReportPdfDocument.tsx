import React from 'react';
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
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 10,
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 7.5,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 8.5,
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
    minHeight: 14,
    alignItems: 'stretch',
  },
  tableRowHeader: {
    backgroundColor: '#f8fafc',
  },
  tableCellLabel: {
    width: '26%',
    padding: '2.5 4',
    fontSize: 7,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f8fafc',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableCellValue: {
    width: '74%',
    padding: '2.5 4',
    fontSize: 7,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  tableHeaderCell: {
    padding: '2.5 3',
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
    textAlign: 'center',
  },
  tableCell: {
    padding: '2.5 3',
    fontSize: 6.5,
    color: '#1e293b',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  badge: {
    padding: '1.5 4',
    borderRadius: 2,
    fontSize: 6.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  badgeLolos: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgeBelum: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  badgeGo: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgeIterasi: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  badgeStop: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  signatureContainer: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
  signatureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  signatureCol: {
    width: '32%',
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  signatureHeader: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signatureRole: {
    fontSize: 6.5,
    color: '#475569',
    marginTop: 1,
  },
  signatureUnit: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 0.5,
  },
  signatureImage: {
    height: 35,
    width: 'auto',
    objectFit: 'contain',
    marginVertical: 3,
  },
  signatureDate: {
    fontSize: 6,
    color: '#94a3b8',
    marginTop: 2,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 6.5,
    bottom: 12,
    left: 28,
    right: 28,
    textAlign: 'center',
    color: '#94a3b8',
  },
});

function formatDate(dateStr?: string | Date | null) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export interface MvReportPdfProps {
  tim: {
    namaTim: string;
    namaProyekInovasi: string;
    kategoriPia?: string | null;
    klasifikasiInovasi?: string | null;
  };
  plan?: any;
  report?: any;
  releaseLogs?: any[];
  hasilMetrik?: any[];
  dfvRekapitulasi?: any[];
  sprintReviews?: any[];
  allTeamCards?: any[];
}

export function MvReportPdfDocument({
  tim,
  plan,
  report,
  releaseLogs = [],
  hasilMetrik = [],
  dfvRekapitulasi = [],
  sprintReviews = [],
  allTeamCards = [],
}: MvReportPdfProps) {
  // Format Keputusan Badge
  const keputusan = report?.keputusanGoNogo || 'go_ke_fmi';
  const isGo = keputusan === 'go_ke_fmi';
  const isIterasi = keputusan === 'iterasi_mvp';

  return (
    <Document title={`Laporan_Market_Validation_${tim.namaTim}.pdf`}>
      {/* ═══ HALAMAN 1: IDENTITAS & RINGKASAN RILIS MVP ═══ */}
      <Page size="A4" style={styles.page}>
        {/* Header Dokumen */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerDocCode}>FR-PIA-03.2 — FORMULIR LAPORAN MARKET VALIDATION</Text>
          <Text style={styles.headerTitle}>
            LAPORAN MARKET VALIDATION, PRODUCT-MARKET FIT &amp; GERBANG FMI
          </Text>
          <Text style={styles.headerSubtitle}>
            Hasil pengujian MVP di pasar percontohan, evaluasi metrik DFV, dan rekomendasi sidang Forum Manajemen Inovasi
          </Text>
        </View>

        {/* Info Proyek Inovasi */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Nama Tim / Inovator</Text>
            <Text style={styles.tableCellValue}>{tim.namaTim || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Judul Proyek Inovasi</Text>
            <Text style={styles.tableCellValue}>{tim.namaProyekInovasi || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Klasifikasi Inovasi</Text>
            <Text style={styles.tableCellValue}>
              {tim.klasifikasiInovasi || tim.kategoriPia || 'Incremental Innovation'}
            </Text>
          </View>
        </View>

        {/* Section 1: Ringkasan Rencana & Peluncuran MVP */}
        <Text style={styles.sectionTitle}>1. RINGKASAN RILIS DAN OPERASIONAL MVP PILOT</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Versi MVP Dilaporkan</Text>
            <Text style={styles.tableCellValue}>{report?.mvpVersionDilaporkan || plan?.mvpVersion || 'v1.0-pilot'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Periode Rilis</Text>
            <Text style={styles.tableCellValue}>
              {formatDate(report?.periodeRilisMulai || plan?.periodeReleaseMulai)} s.d.{' '}
              {formatDate(report?.periodeRilisSelesai || plan?.periodeReleaseSelesai)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Lokasi &amp; Channel Rilis</Text>
            <Text style={styles.tableCellValue}>
              {report?.lokasiChannelRilis || plan?.channelRelease || plan?.lokasiPilot || '-'}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Pengguna Aktif Aktual (Adopters)</Text>
            <Text style={styles.tableCellValue}>
              {report?.jumlahEarlyAdoptersAktual ?? plan?.jumlahTargetPengguna ?? 0} Pengguna Aktif
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Ringkasan Aktivitas Rilis</Text>
            <Text style={styles.tableCellValue}>
              {report?.ringkasanAktivitasRilis || plan?.deskripsiProsesMvp || '-'}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Kendala Utama &amp; Mitigasi</Text>
            <Text style={styles.tableCellValue}>{report?.kendalaUtama || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Perubahan dari Rencana (MVP Plan)</Text>
            <Text style={styles.tableCellValue}>{report?.perubahanDariPlan || 'Tidak ada perubahan signifikan'}</Text>
          </View>
        </View>

        {/* Section 2: Release Log & Evidence */}
        <Text style={styles.sectionTitle}>2. LOG AKTIVITAS RILIS &amp; EVIDENCE (RELEASE LOG)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Tanggal</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Aktivitas Rilis</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Output Terverifikasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Data / Evidence</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>PIC</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', borderRightWidth: 0 }]}>Catatan</Text>
          </View>
          {releaseLogs.length > 0 ? (
            releaseLogs.map((log: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '15%' }]}>{formatDate(log.tanggal)}</Text>
                <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>{log.aktivitas}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{log.output || '-'}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{log.dataEvidence || '-'}</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>{log.pic || '-'}</Text>
                <Text style={[styles.tableCell, { width: '10%', borderRightWidth: 0 }]}>{log.catatan || '-'}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Belum ada catatan log rilis yang direkam.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} fixed />
      </Page>

      {/* ═══ HALAMAN 2: INTEGRASI SPRINT REVIEW & RETROSPECTIVE ═══ */}
      <Page size="A4" style={styles.page}>
        {/* Section 3: Sprint Review — Outcome */}
        <Text style={styles.sectionTitle}>3. SPRINT REVIEW — OUTCOME</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Sprint / Tgl</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Demo / Fitur Diuji</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Feedback Reviewer</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Value / Hasil</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Learning</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%', borderRightWidth: 0 }]}>Questions</Text>
          </View>
          {sprintReviews.length > 0 ? (
            sprintReviews.map((sr: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '12%' }]}>
                  Sprint {sr.sprintNumber}{'\n'}
                  <Text style={{ fontSize: 5.5, color: '#64748b' }}>{formatDate(sr.tanggalReview)}</Text>
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{sr.demo || sr.demoOutput || '-'}</Text>
                <Text style={[styles.tableCell, { width: '22%' }]}>{sr.feedback || sr.ringkasanPencapaian || '-'}</Text>
                <Text style={[styles.tableCell, { width: '18%' }]}>{sr.value || '-'}</Text>
                <Text style={[styles.tableCell, { width: '14%' }]}>{sr.pembelajaran || '-'}</Text>
                <Text style={[styles.tableCell, { width: '14%', borderRightWidth: 0 }]}>{sr.questions || '-'}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Belum ada data Sprint Review untuk Market Validation.
              </Text>
            </View>
          )}
        </View>

        {/* Section 4: Sprint Review — Backlog */}
        <Text style={styles.sectionTitle}>4. SPRINT REVIEW — BACKLOG</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Sprint</Text>
            <Text style={[styles.tableHeaderCell, { width: '32%' }]}>Backlog yang Diverifikasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { width: '24%' }]}>Backlog Dimodifikasi / Baru</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>Owner / Next Sprint</Text>
          </View>
          {allTeamCards.filter((c: any) => c.tahap === 'market_validation' && c.sprintNumber).length > 0 ? (
            allTeamCards
              .filter((c: any) => c.tahap === 'market_validation' && c.sprintNumber)
              .slice(0, 10)
              .map((card: any, idx: number) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '12%' }]}>Sprint {card.sprintNumber}</Text>
                  <Text style={[styles.tableCell, { width: '32%', fontWeight: 'bold' }]}>{card.judul}</Text>
                  <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>
                    {card.statusKolom === 'Done' ? 'DONE' : card.statusKolom}
                  </Text>
                  <Text style={[styles.tableCell, { width: '24%' }]}>{card.acceptanceCriteria || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '20%', borderRightWidth: 0 }]}>
                    {card.ownerAnggotaId || 'Team'}
                  </Text>
                </View>
              ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Belum ada kartu backlog yang dialokasikan ke sprint Market Validation.
              </Text>
            </View>
          )}
        </View>

        {/* Section 5: Sprint Retrospective */}
        <Text style={styles.sectionTitle}>5. SPRINT RETROSPECTIVE</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Sprint</Text>
            <Text style={[styles.tableHeaderCell, { width: '26%' }]}>Continue (Pertahankan)</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Stop (Hentikan)</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Start (Mulai Hal Baru)</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%', borderRightWidth: 0 }]}>Owner / Target Sprint</Text>
          </View>
          {sprintReviews.length > 0 ? (
            sprintReviews.map((sr: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '12%' }]}>Sprint {sr.sprintNumber}</Text>
                <Text style={[styles.tableCell, { width: '26%' }]}>{sr.continueItems || '-'}</Text>
                <Text style={[styles.tableCell, { width: '22%' }]}>{sr.stopItems || '-'}</Text>
                <Text style={[styles.tableCell, { width: '22%' }]}>{sr.startItems || '-'}</Text>
                <Text style={[styles.tableCell, { width: '18%', borderRightWidth: 0 }]}>{sr.ownerTargetSprint || '-'}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Belum ada catatan retrospektif sprint.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} fixed />
      </Page>

      {/* ═══ HALAMAN 3: PENGUKURAN DFV, PMF & GERBANG FMI ═══ */}
      <Page size="A4" style={styles.page}>
        {/* Section 6: Hasil Pengukuran DFV dan Traction */}
        <Text style={styles.sectionTitle}>6. HASIL PENGUKURAN DFV DAN TRACTION (9 PARAMETER BAKU)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Validasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Metrik</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Target</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Hasil Aktual</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>% Capai</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>Key Learning / Enhancement</Text>
          </View>
          {hasilMetrik.length > 0 ? (
            hasilMetrik.map((m: any, idx: number) => {
              const isLolos = m.status === 'lolos' || (m.persenTercapai && m.persenTercapai >= 70);
              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '14%', fontWeight: 'bold' }]}>{m.validasi}</Text>
                  <Text style={[styles.tableCell, { width: '22%' }]}>{m.metrik}</Text>
                  <Text style={[styles.tableCell, { width: '12%' }]}>{m.target || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '12%', fontWeight: 'bold' }]}>{m.hasilAktual || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>
                    {m.persenTercapai !== null ? `${m.persenTercapai}%` : '-'}
                  </Text>
                  <View style={[styles.tableCell, { width: '10%', alignItems: 'center' }]}>
                    <Text style={[styles.badge, isLolos ? styles.badgeLolos : styles.badgeBelum]}>
                      {isLolos ? 'LOLOS' : 'BELUM'}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { width: '20%', borderRightWidth: 0 }]}>
                    {m.learning || m.enhancement || '-'}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Data pengukuran metrik DFV belum diisi dari kartu Market Testing.
              </Text>
            </View>
          )}
        </View>

        {/* Section 7: Rekapitulasi Ketercapaian DFV */}
        <Text style={styles.sectionTitle}>7. REKAPITULASI KETERCAPAIAN DFV</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Kategori DFV</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Rata-Rata Capai</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Threshold</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Status Kelolosan</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%', borderRightWidth: 0 }]}>Catatan Keputusan</Text>
          </View>
          {dfvRekapitulasi.length > 0 ? (
            dfvRekapitulasi.map((row: any, idx: number) => {
              const isLolos = row.status === 'lolos' || row.rataRataKetercapaian >= (row.threshold || 70);
              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>{row.kategoriDfv}</Text>
                  <Text style={[styles.tableCell, { width: '18%', textAlign: 'center', fontWeight: 'bold' }]}>
                    {row.rataRataKetercapaian}%
                  </Text>
                  <Text style={[styles.tableCell, { width: '16%', textAlign: 'center' }]}>
                    {row.threshold || 70}%
                  </Text>
                  <View style={[styles.tableCell, { width: '16%', alignItems: 'center' }]}>
                    <Text style={[styles.badge, isLolos ? styles.badgeLolos : styles.badgeBelum]}>
                      {isLolos ? 'LOLOS' : 'BELUM LOLOS'}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { width: '30%', borderRightWidth: 0 }]}>
                    {row.catatanKeputusan || '-'}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Rekapitulasi DFV belum diisi dari kartu Analisis Hasil MV.
              </Text>
            </View>
          )}
        </View>

        {/* Section 8: Kesimpulan PMF & Keputusan Gerbang FMI */}
        <Text style={styles.sectionTitle}>8. EVALUASI PRODUCT-MARKET FIT &amp; KEPUTUSAN GERBANG FMI</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Kesimpulan PMF</Text>
            <Text style={styles.tableCellValue}>{report?.kesimpulanPmf || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Keputusan Go / No-Go (Gerbang FMI)</Text>
            <View style={[styles.tableCellValue, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Text
                style={[
                  styles.badge,
                  isGo ? styles.badgeGo : isIterasi ? styles.badgeIterasi : styles.badgeStop,
                ]}
              >
                {isGo
                  ? '🟢 GO — Lanjut ke Sidang Forum Manajemen Inovasi (FMI)'
                  : isIterasi
                  ? '🟡 ITERASI — Lakukan Perbaikan MVP'
                  : '🔴 STOP / HOLD'}
              </Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Rekomendasi Iterasi</Text>
            <Text style={styles.tableCellValue}>{report?.rekomendasiIterasi || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Rencana MVP Tahap Berikutnya</Text>
            <Text style={styles.tableCellValue}>{report?.rencanaMvpBerikutnya || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Rekomendasi Promotor / Sponsor</Text>
            <Text style={styles.tableCellValue}>{report?.rekomendasiPromotorSponsor || '-'}</Text>
          </View>
        </View>

        {/* Section 9: Dokumen & Catatan Preliminary Review SME */}
        <Text style={styles.sectionTitle}>9. DOKUMEN &amp; CATATAN PRELIMINARY REVIEW SME</Text>
        <View style={styles.table}>
          {Array.isArray(report?.buktiPendukung) && report.buktiPendukung.length > 0 ? (
            report.buktiPendukung.map((b: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCellLabel, { width: '30%' }]}>
                  {b.type === 'dokumen_preliminary_review'
                    ? '📎 Dokumen Review'
                    : `Reviewer: ${b.reviewer || 'SME / Coach'}`}
                </Text>
                <Text style={[styles.tableCellValue, { width: '70%' }]}>
                  {b.type === 'dokumen_preliminary_review'
                    ? `${b.file_name || 'Dokumen Preliminary Review'} (${formatDate(b.tanggal)})`
                    : b.content || b.catatan || '-'}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Belum ada dokumen atau catatan preliminary review yang dilampirkan.
              </Text>
            </View>
          )}
        </View>

        {/* Section 10: Lembar Pengesahan (3 Tanda Tangan: PO, Coach, Promotor) */}
        <View style={styles.signatureContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 4, marginBottom: 6 }]}>
            10. LEMBAR PENGESAHAN LAPORAN MARKET VALIDATION
          </Text>
          <View style={styles.signatureGrid}>
            {/* 1. Project Owner */}
            <View style={styles.signatureCol}>
              <Text style={styles.signatureHeader}>Disusun Oleh (PO)</Text>
              {report?.ttdDisusun?.status === 'signed' ? (
                <>
                  <Text style={styles.signatureName}>{report.ttdDisusun.nama}</Text>
                  <Text style={styles.signatureRole}>{report.ttdDisusun.jabatan || 'Project Owner'}</Text>
                  <Text style={styles.signatureUnit}>{report.ttdDisusun.unit || 'PT Pegadaian (Persero)'}</Text>
                  {report.ttdDisusun.signatureImage && (
                    <Image src={report.ttdDisusun.signatureImage} style={styles.signatureImage} />
                  )}
                  <Text style={styles.signatureDate}>Ditandatangani: {formatDate(report.ttdDisusun.tanggal)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.signatureName}>( Project Owner )</Text>
                  <Text style={styles.signatureRole}>Project Owner</Text>
                  <Text style={[styles.signatureDate, { fontStyle: 'italic', marginTop: 15 }]}>
                    [ Belum Ditandatangani ]
                  </Text>
                </>
              )}
            </View>

            {/* 2. Innovation Coach */}
            <View style={styles.signatureCol}>
              <Text style={styles.signatureHeader}>Diperiksa Oleh (Coach)</Text>
              {report?.ttdDiperiksa?.status === 'signed' ? (
                <>
                  <Text style={styles.signatureName}>{report.ttdDiperiksa.nama}</Text>
                  <Text style={styles.signatureRole}>{report.ttdDiperiksa.jabatan || 'Innovation Coach'}</Text>
                  <Text style={styles.signatureUnit}>{report.ttdDiperiksa.unit || 'PT Pegadaian (Persero)'}</Text>
                  {report.ttdDiperiksa.signatureImage && (
                    <Image src={report.ttdDiperiksa.signatureImage} style={styles.signatureImage} />
                  )}
                  <Text style={styles.signatureDate}>Ditandatangani: {formatDate(report.ttdDiperiksa.tanggal)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.signatureName}>( Innovation Coach )</Text>
                  <Text style={styles.signatureRole}>Innovation Coach</Text>
                  <Text style={[styles.signatureDate, { fontStyle: 'italic', marginTop: 15 }]}>
                    [ Belum Ditandatangani ]
                  </Text>
                </>
              )}
            </View>

            {/* 3. Promotor Inovasi */}
            <View style={styles.signatureCol}>
              <Text style={styles.signatureHeader}>Disetujui Oleh (Promotor)</Text>
              {report?.ttdDisetujui?.status === 'approved' || report?.ttdDisetujui?.status === 'signed' ? (
                <>
                  <Text style={styles.signatureName}>{report.ttdDisetujui.nama}</Text>
                  <Text style={styles.signatureRole}>{report.ttdDisetujui.jabatan || 'Promotor Inovasi'}</Text>
                  <Text style={styles.signatureUnit}>{report.ttdDisetujui.unit || 'PT Pegadaian (Persero)'}</Text>
                  {report.ttdDisetujui.signatureImage && (
                    <Image src={report.ttdDisetujui.signatureImage} style={styles.signatureImage} />
                  )}
                  <Text style={styles.signatureDate}>Disetujui: {formatDate(report.ttdDisetujui.tanggal)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.signatureName}>( Promotor Inovasi )</Text>
                  <Text style={styles.signatureRole}>Promotor Inovasi</Text>
                  <Text style={[styles.signatureDate, { fontStyle: 'italic', marginTop: 15 }]}>
                    [ Belum Disetujui ]
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
