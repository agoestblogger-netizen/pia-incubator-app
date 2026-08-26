import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f5132',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
  },
  headerDocCode: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f5132',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 8,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#0f5132',
    backgroundColor: '#f0fdf4',
    padding: '4 6',
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
    minHeight: 18,
    alignItems: 'stretch',
  },
  tableRowHeader: {
    backgroundColor: '#f8fafc',
  },
  tableCellLabel: {
    width: '28%',
    padding: '4 6',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f8fafc',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableCellValue: {
    width: '72%',
    padding: '4 6',
    fontSize: 8,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  tableHeaderCell: {
    padding: '4 6',
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableDataCell: {
    padding: '4 6',
    fontSize: 7.5,
    color: '#0f172a',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
    lineHeight: 1.25,
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#fafafa',
  },
  signatureRoleTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f5132',
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  signatureLine: {
    marginTop: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: '#94a3b8',
    borderBottomStyle: 'solid',
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  signatureSubtext: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 6.5,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
});

export interface CvPlanningPdfData {
  namaProyekInovasi: string;
  klasifikasiInovasi: string;
  // Section A
  projectMission?: string | null;
  customerDanContext?: string | null;
  problemHypothesis?: string | null;
  hmw?: string | null;
  solutionHypothesis?: string | null;
  // Section B
  prototypeType?: string | null;
  fiturAlurDiuji?: string | null;
  skenarioUserTesting?: string | null;
  instrumenValidasi?: string | null;
  dataDukung?: string[] | null;
  // Section C
  targetEarlyAdopters?: string | null;
  kriteriaSeleksi?: string | null;
  jumlahTargetResponden?: number | null;
  lokasiChannelTesting?: string | null;
  metodeRekrutmen?: string | null;
  etikaPersetujuanData?: string | null;
  // Section D
  dimensiEvidence?: Record<string, string>;
  // Section E
  metrikCatatan?: Record<string, string>;
  // Signatures
  ttdDisusun?: { nama: string; jabatan?: string; unit?: string; tanggal?: string } | null;
  ttdDiperiksa?: { nama: string; jabatan?: string; unit?: string; tanggal?: string } | null;
  ttdDisetujui?: { nama: string; jabatan?: string; unit?: string; tanggal?: string } | null;
}

const DIMENSI_STATIC = [
  { key: 'usability', label: 'Usability', fokus: 'Kemudahan & kejelasan interaksi prototype' },
  { key: 'functionality', label: 'Functionality', fokus: 'Kesesuaian fungsi dan alur solusi' },
  { key: 'solvability', label: 'Solvability', fokus: 'Penyelesaian problem worth solving' },
  { key: 'payability', label: 'Payability', fokus: 'Kesediaan adopsi/membayar/effort' },
  { key: 'others', label: 'Others', fokus: 'Risiko, masukan tambahan & ide baru' },
];

const METRIK_STATIC = [
  { validasi: 'Desirability', metrik: 'Kepuasan Pengguna', unit: 'Skala 1-5', kriteria: 'Rata-rata >= 4' },
  { validasi: 'Desirability', metrik: 'Ketertarikan Penggunaan Berulang', unit: 'Frekuensi', kriteria: 'Mayoritas minimal "Sering"' },
  { validasi: 'Desirability', metrik: 'Rekomendasi kepada Orang Lain', unit: 'Skala Kesediaan', kriteria: 'Mayoritas minimal "Mungkin"' },
  { validasi: 'Desirability', metrik: 'Kejelasan dan Kemudahan Penggunaan', unit: 'Skala 1-5', kriteria: 'Rata-rata >= 4 atau "Mudah"' },
  { validasi: 'Desirability', metrik: 'Kesediaan Membayar / Menggunakan', unit: 'Skala Komitmen', kriteria: 'Mayoritas bersedia berkomitmen' },
  { validasi: 'Feasibility', metrik: 'Kelayakan teknis/operasional awal', unit: 'Skala 1-5', kriteria: 'Tidak ada blocker kritis' },
  { validasi: 'Viability', metrik: 'Potensi dampak bisnis/ekonomi awal', unit: 'Estimasi Rp/%', kriteria: 'Terdapat potensi manfaat teruji' },
];

function fmtVal(val?: string | number | null): string {
  if (val === undefined || val === null || String(val).trim() === '') {
    return '-';
  }
  return String(val);
}

function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function CvPlanningPdfDocument({ data }: { data: CvPlanningPdfData }) {
  return (
    <Document>
      {/* PAGE 1: Header + Section A + Section B + Section C */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerDocCode}>PT PEGADAIAN · INCUBATOR PROGRAM · TEMPLATE JUKLAK 2.1</Text>
          <Text style={styles.headerTitle}>Rencana Pengujian Customer Validation</Text>
          <Text style={styles.headerSubtitle}>
            Dokumen Perencanaan Pengujian Prototype, Kriteria Responden, dan Metodologi Validasi Pengguna
          </Text>
        </View>

        {/* Info Proyek */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Nama Proyek Inovasi</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.namaProyekInovasi)}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Klasifikasi Inovasi</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.klasifikasiInovasi)}</Text>
          </View>
        </View>

        {/* Section A */}
        <Text style={styles.sectionTitle}>A. Konteks Inovasi &amp; Hipotesis</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Project Mission</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.projectMission)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Customer &amp; Context</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.customerDanContext)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Problem Hypothesis</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.problemHypothesis)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>How Might We (HMW)</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.hmw)}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Solution Hypothesis</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.solutionHypothesis)}</Text>
          </View>
        </View>

        {/* Section B */}
        <Text style={styles.sectionTitle}>B. Instrumen &amp; Skenario Pengujian</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Tipe Prototype</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.prototypeType)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Fitur / Alur yang Diuji</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.fiturAlurDiuji)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Skenario User Testing</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.skenarioUserTesting)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Instrumen Validasi</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.instrumenValidasi)}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Data Dukung / Lampiran</Text>
            <Text style={styles.tableCellValue}>
              {data.dataDukung && data.dataDukung.length > 0
                ? data.dataDukung.map((u, i) => `${i + 1}. ${u.split('/').pop()}`).join('\n')
                : '-'}
            </Text>
          </View>
        </View>

        {/* Section C */}
        <Text style={styles.sectionTitle}>C. Early Adopters &amp; Rekrutmen</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Target Early Adopters</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.targetEarlyAdopters)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Kriteria Seleksi</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.kriteriaSeleksi)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Jumlah Target Responden</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.jumlahTargetResponden)} orang</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Lokasi / Channel Testing</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.lokasiChannelTesting)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Metode Rekrutmen</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.metodeRekrutmen)}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Etika &amp; Persetujuan Data</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.etikaPersetujuanData)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Dokumen ini digenerate secara otomatis melalui PIA Incubator Platform · Halaman 1 dari 2
        </Text>
      </Page>

      {/* PAGE 2: Section D (Feedback) + Section E (Metrik) + Signature Block */}
      <Page size="A4" style={styles.page}>
        {/* Section D */}
        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
          D. Dimensi Customer Testing Feedback
        </Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Dimensi</Text>
            <Text style={[styles.tableHeaderCell, { width: '38%' }]}>Fokus Pengujian</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%', borderRightWidth: 0 }]}>
              Evidence yang Dikumpulkan
            </Text>
          </View>
          {DIMENSI_STATIC.map((d, idx) => (
            <View
              key={d.key}
              style={[
                styles.tableRow,
                idx === DIMENSI_STATIC.length - 1 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <Text style={[styles.tableDataCell, { width: '22%', fontWeight: 'bold' }]}>
                {d.label}
              </Text>
              <Text style={[styles.tableDataCell, { width: '38%' }]}>{d.fokus}</Text>
              <Text style={[styles.tableDataCell, { width: '40%', borderRightWidth: 0 }]}>
                {fmtVal(data.dimensiEvidence?.[d.key])}
              </Text>
            </View>
          ))}
        </View>

        {/* Section E */}
        <Text style={styles.sectionTitle}>
          E. Metrik dan Kriteria Kesuksesan Customer Validation
        </Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Validasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '27%' }]}>Metrik</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Kriteria Sukses</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>
              Catatan / Referensi
            </Text>
          </View>
          {METRIK_STATIC.map((m, idx) => (
            <View
              key={m.metrik}
              style={[
                styles.tableRow,
                idx === METRIK_STATIC.length - 1 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <Text style={[styles.tableDataCell, { width: '18%' }]}>{m.validasi}</Text>
              <Text style={[styles.tableDataCell, { width: '27%', fontWeight: 'bold' }]}>
                {m.metrik}
              </Text>
              <Text style={[styles.tableDataCell, { width: '15%' }]}>{m.unit}</Text>
              <Text style={[styles.tableDataCell, { width: '20%' }]}>{m.kriteria}</Text>
              <Text style={[styles.tableDataCell, { width: '20%', borderRightWidth: 0 }]}>
                {fmtVal(data.metrikCatatan?.[m.metrik])}
              </Text>
            </View>
          ))}
        </View>

        {/* Signature Block */}
        <Text style={styles.sectionTitle}>Persetujuan &amp; Tanda Tangan Formal</Text>
        <View style={styles.signaturesContainer}>
          {/* Disusun Oleh Inisiator */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Disusun Oleh</Text>
            {data.ttdDisusun?.nama ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: '#0f5132', fontWeight: 'bold', marginBottom: 12 }}>
                  [Telah Ditandatangani Digital]
                </Text>
                <Text style={styles.signatureName}>{data.ttdDisusun.nama}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisusun.jabatan || 'Inisiator Inovasi'}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisusun.unit || 'PT Pegadaian'}</Text>
                <Text style={[styles.signatureSubtext, { fontSize: 6.5, marginTop: 2 }]}>
                  {formatDateIndo(data.ttdDisusun.tanggal)}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.signatureLine, { width: '80%' }]} />
                <Text style={styles.signatureName}>( Inisiator Inovasi )</Text>
                <Text style={styles.signatureSubtext}>PT Pegadaian</Text>
                <Text style={[styles.signatureSubtext, { fontStyle: 'italic', marginTop: 2 }]}>
                  Belum Ditandatangani
                </Text>
              </View>
            )}
          </View>

          {/* Diperiksa Oleh Coach */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Diperiksa Oleh</Text>
            {data.ttdDiperiksa?.nama ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: '#0f5132', fontWeight: 'bold', marginBottom: 12 }}>
                  [Telah Ditandatangani Digital]
                </Text>
                <Text style={styles.signatureName}>{data.ttdDiperiksa.nama}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDiperiksa.jabatan || 'Innovation Coach'}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDiperiksa.unit || 'PT Pegadaian'}</Text>
                <Text style={[styles.signatureSubtext, { fontSize: 6.5, marginTop: 2 }]}>
                  {formatDateIndo(data.ttdDiperiksa.tanggal)}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.signatureLine, { width: '80%' }]} />
                <Text style={styles.signatureName}>( Innovation Coach )</Text>
                <Text style={styles.signatureSubtext}>PT Pegadaian</Text>
                <Text style={[styles.signatureSubtext, { fontStyle: 'italic', marginTop: 2 }]}>
                  Belum Ditandatangani
                </Text>
              </View>
            )}
          </View>

          {/* Disetujui Oleh Project Owner */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Disetujui Oleh</Text>
            {data.ttdDisetujui?.nama ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: '#0f5132', fontWeight: 'bold', marginBottom: 12 }}>
                  [Telah Ditandatangani Digital]
                </Text>
                <Text style={styles.signatureName}>{data.ttdDisetujui.nama}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisetujui.jabatan || 'Project Owner'}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisetujui.unit || 'PT Pegadaian'}</Text>
                <Text style={[styles.signatureSubtext, { fontSize: 6.5, marginTop: 2 }]}>
                  {formatDateIndo(data.ttdDisetujui.tanggal)}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.signatureLine, { width: '80%' }]} />
                <Text style={styles.signatureName}>( Project Owner )</Text>
                <Text style={styles.signatureSubtext}>PT Pegadaian</Text>
                <Text style={[styles.signatureSubtext, { fontStyle: 'italic', marginTop: 2 }]}>
                  Belum Ditandatangani
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          Dokumen ini digenerate secara otomatis melalui PIA Incubator Platform · Halaman 2 dari 2
        </Text>
      </Page>
    </Document>
  );
}
