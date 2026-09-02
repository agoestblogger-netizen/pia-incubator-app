import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import React from 'react';

const styles = StyleSheet.create({
  page: {
    padding: 26,
    fontSize: 7.8,
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
    fontSize: 7,
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
    fontSize: 7.2,
    color: '#64748b',
    lineHeight: 1.2,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f5132',
    backgroundColor: '#f0fdf4',
    padding: '3 5',
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#0f5132',
    borderLeftStyle: 'solid',
  },
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
    marginBottom: 5,
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
    width: '28%',
    padding: '2.5 4',
    fontSize: 7.2,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f8fafc',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableCellValue: {
    width: '72%',
    padding: '2.5 4',
    fontSize: 7.2,
    color: '#0f172a',
    lineHeight: 1.25,
  },
  tableHeaderCell: {
    padding: '3 4',
    fontSize: 6.8,
    fontWeight: 'bold',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableDataCell: {
    padding: '2.5 3.5',
    fontSize: 6.8,
    color: '#0f172a',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
    lineHeight: 1.2,
  },
  thresholdBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 0.5,
    borderColor: '#fde68a',
    borderStyle: 'solid',
    borderRadius: 2,
    padding: '3 5',
    marginBottom: 4,
  },
  thresholdTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 1,
  },
  thresholdText: {
    fontSize: 6.5,
    color: '#78350f',
    lineHeight: 1.2,
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  signatureBox: {
    width: '31%',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
    borderRadius: 3,
    padding: 5,
    backgroundColor: '#ffffff',
  },
  signatureRoleTitle: {
    fontSize: 7.2,
    fontWeight: 'bold',
    color: '#0f5132',
    textAlign: 'center',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
  },
  signatureName: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  signatureSubtext: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.2,
  },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 26,
    right: 26,
    textAlign: 'center',
    fontSize: 6.5,
    color: '#94a3b8',
  },
});

export interface MvPlanningPdfData {
  namaProyekInovasi?: string | null;
  klasifikasiInovasi?: string | null;
  hasilCustomerValidation?: string | null;
  deskripsiMvp?: string | null;
  mvpVersion?: string | null;
  fiturMvpDirilis?: string | null;
  channelRelease?: string | null;
  periodeRelease?: string | null;
  deskripsiProsesMvp?: string | null;
  dataDukungMvp?: string[] | null;

  mappingFiturList?: Array<{
    solusiTervalidasi?: string | null;
    fiturSolusi?: string | null;
    benefit?: string | null;
    fiturMvpStatus?: string | null;
    acceptanceCriteriaEvidence?: string | null;
  }>;

  targetEarlyAdopters?: string | null;
  lokasiPilot?: string | null;
  daftarEarlyAdopters?: string | null;
  jumlahTargetPengguna?: number | string | null;
  batasanScopeMvp?: string | null;

  resourcesList?: Array<{
    jenisResource: string;
    label?: string;
    kebutuhanSpesifik?: string | null;
    ownerSumber?: string | null;
    statusKetersediaan?: string | null;
    gapTindakLanjut?: string | null;
  }>;

  sprintBacklogList?: Array<{
    sprintNumber: number;
    periode?: string | null;
    backlogTask?: string | null;
    outputCriteria?: string | null;
    owner?: string | null;
    dependencyRisiko?: string | null;
  }>;

  metrikList?: Array<{
    validasi: string;
    metrik: string;
    unitUkuran?: string | null;
    baseline?: string | null;
    target?: string | null;
    threshold?: string | null;
    caraPengukuran?: string | null;
    pic?: string | null;
    evidence?: string | null;
  }>;

  ttdDisusun?: {
    nama?: string;
    jabatan?: string;
    unit?: string;
    tanggal?: string;
    signatureImage?: string;
  } | null;
  ttdDiperiksa?: {
    nama?: string;
    jabatan?: string;
    unit?: string;
    tanggal?: string;
    signatureImage?: string;
  } | null;
  ttdDisetujui?: {
    nama?: string;
    jabatan?: string;
    unit?: string;
    tanggal?: string;
    signatureImage?: string;
  } | null;
}

function fmtVal(val?: string | number | null, fallback = '-'): string {
  if (val === undefined || val === null || String(val).trim() === '') {
    return fallback;
  }
  return String(val).trim();
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return '__________________';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function MvPlanningPdfDocument({ data }: { data: MvPlanningPdfData }) {
  const dataDukungFormatted =
    data.dataDukungMvp && data.dataDukungMvp.length > 0
      ? data.dataDukungMvp.map((u, i) => `${i + 1}. ${u.split('/').pop()}`).join('\n')
      : '-';

  return (
    <Document title={`Perencanaan-MarketValidation-${data.namaProyekInovasi || 'PIA'}`}>
      {/* ── HALAMAN 1: IDENTITAS, MAPPING FITUR & EARLY ADOPTERS ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerDocCode}>
            FR-PIA-03.1 · TEMPLATE JUKLAK 3.1 · PROGRAM INKUBASI PIA
          </Text>
          <Text style={styles.headerTitle}>
            TEMPLATE LAPORAN PERENCANAAN MARKET VALIDATION
          </Text>
          <Text style={styles.headerSubtitle}>
            Tujuan: menyusun rencana MVP yang cukup minimum untuk dirilis, cukup aman untuk diuji, dan cukup bermakna untuk mengukur Desirability, Feasibility, dan Viability.
          </Text>
        </View>

        {/* 10 Key-Value Table Identitas */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Nama Proyek Inovasi</Text>
            <Text style={[styles.tableCellValue, { fontWeight: 'bold' }]}>
              {fmtVal(data.namaProyekInovasi)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Klasifikasi Inovasi</Text>
            <Text style={[styles.tableCellValue, { fontWeight: 'bold', color: '#0f5132' }]}>
              {fmtVal(data.klasifikasiInovasi, 'BREAKTHROUGH')}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Hasil Customer Validation</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.hasilCustomerValidation)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Deskripsi MVP</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.deskripsiMvp)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>MVP Version</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.mvpVersion, 'MVP 1.0')}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Fitur MVP yang Dirilis</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.fiturMvpDirilis)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Channel Release</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.channelRelease)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Periode Release</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.periodeRelease)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Deskripsi Proses MVP</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.deskripsiProsesMvp)}
            </Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Data Dukung MVP</Text>
            <Text style={styles.tableCellValue}>
              {dataDukungFormatted}
            </Text>
          </View>
        </View>

        {/* 1. Mapping Solusi, Fitur, Benefit, dan Fitur MVP */}
        <Text style={styles.sectionTitle}>1. Mapping Solusi, Fitur, Benefit, dan Fitur MVP</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Solusi Tervalidasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Fitur Solusi</Text>
            <Text style={[styles.tableHeaderCell, { width: '24%' }]}>Benefit Customer / Bisnis</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Status Rilis</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>
              Acceptance Criteria
            </Text>
          </View>
          {data.mappingFiturList && data.mappingFiturList.length > 0 ? (
            data.mappingFiturList.map((f, i) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  i === (data.mappingFiturList?.length || 0) - 1 ? { borderBottomWidth: 0 } : {},
                ]}
              >
                <Text style={[styles.tableDataCell, { width: '22%' }]}>{fmtVal(f.solusiTervalidasi)}</Text>
                <Text style={[styles.tableDataCell, { width: '20%', fontWeight: 'bold' }]}>{fmtVal(f.fiturSolusi)}</Text>
                <Text style={[styles.tableDataCell, { width: '24%' }]}>{fmtVal(f.benefit)}</Text>
                <Text style={[styles.tableDataCell, { width: '14%', fontWeight: 'bold', color: f.fiturMvpStatus === 'dirilis' ? '#166534' : '#9a3412' }]}>
                  {f.fiturMvpStatus === 'dirilis' ? 'Dirilis' : 'Ditunda'}
                </Text>
                <Text style={[styles.tableDataCell, { width: '20%', borderRightWidth: 0 }]}>
                  {fmtVal(f.acceptanceCriteriaEvidence)}
                </Text>
              </View>
            ))
          ) : (
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.tableDataCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Belum ada mapping fitur solusi yang dimasukkan.
              </Text>
            </View>
          )}
        </View>

        {/* 2. Early Adopters dan Scope Pilot */}
        <Text style={styles.sectionTitle}>2. Early Adopters dan Scope Pilot</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Target Early Adopters</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.targetEarlyAdopters)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Lokasi Pilot</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.lokasiPilot)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Daftar / List Early Adopters</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.daftarEarlyAdopters)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Jumlah Target Pengguna / Transaksi</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.jumlahTargetPengguna)}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Batasan Scope MVP</Text>
            <Text style={styles.tableCellValue}>{fmtVal(data.batasanScopeMvp)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Template Juklak 3.1 · Perencanaan Market Validation · Halaman 1 dari 3
        </Text>
      </Page>

      {/* ── HALAMAN 2: RESOURCES NEEDED, SPRINT PLAN & METRIK DFV (BAGIAN 1) ── */}
      <Page size="A4" style={styles.page}>
        {/* 3. Resources Needed */}
        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>3. Resources Needed</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Jenis Resource</Text>
            <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Kebutuhan Spesifik</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Owner / Sumber</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%', borderRightWidth: 0 }]}>
              Gap & Tindak Lanjut
            </Text>
          </View>
          {data.resourcesList?.map((r, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                i === (data.resourcesList?.length || 0) - 1 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <Text style={[styles.tableDataCell, { width: '22%', fontWeight: 'bold' }]}>
                {r.label || r.jenisResource}
              </Text>
              <Text style={[styles.tableDataCell, { width: '28%' }]}>{fmtVal(r.kebutuhanSpesifik)}</Text>
              <Text style={[styles.tableDataCell, { width: '18%' }]}>{fmtVal(r.ownerSumber)}</Text>
              <Text style={[styles.tableDataCell, { width: '14%' }]}>{fmtVal(r.statusKetersediaan)}</Text>
              <Text style={[styles.tableDataCell, { width: '18%', borderRightWidth: 0 }]}>
                {fmtVal(r.gapTindakLanjut)}
              </Text>
            </View>
          ))}
        </View>

        {/* 4. Sprint Plan dan Backlog MVP */}
        <Text style={styles.sectionTitle}>4. Sprint Plan dan Backlog MVP</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Sprint</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Periode</Text>
            <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Backlog / Task</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Output / Acceptance</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Owner</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%', borderRightWidth: 0 }]}>
              Risiko
            </Text>
          </View>
          {data.sprintBacklogList && data.sprintBacklogList.length > 0 ? (
            data.sprintBacklogList.slice(0, 6).map((s, i) => (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  i === Math.min(data.sprintBacklogList?.length || 0, 6) - 1 ? { borderBottomWidth: 0 } : {},
                ]}
              >
                <Text style={[styles.tableDataCell, { width: '12%', fontWeight: 'bold' }]}>
                  Sprint {s.sprintNumber}
                </Text>
                <Text style={[styles.tableDataCell, { width: '16%' }]}>{fmtVal(s.periode)}</Text>
                <Text style={[styles.tableDataCell, { width: '28%' }]}>{fmtVal(s.backlogTask)}</Text>
                <Text style={[styles.tableDataCell, { width: '22%' }]}>{fmtVal(s.outputCriteria)}</Text>
                <Text style={[styles.tableDataCell, { width: '10%' }]}>{fmtVal(s.owner)}</Text>
                <Text style={[styles.tableDataCell, { width: '12%', borderRightWidth: 0 }]}>
                  {fmtVal(s.dependencyRisiko)}
                </Text>
              </View>
            ))
          ) : (
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.tableDataCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>
                Aktivitas sprint terhubung dengan Board Sprint inkubasi.
              </Text>
            </View>
          )}
        </View>

        {/* 5. Metrik, Threshold, dan Cara Pengukuran DFV (Panduan + Desirability/Feasibility) */}
        <Text style={styles.sectionTitle}>5. Metrik, Threshold, dan Cara Pengukuran DFV</Text>
        <View style={styles.thresholdBox}>
          <Text style={styles.thresholdTitle}>Panduan Threshold:</Text>
          <Text style={styles.thresholdText}>
            • SE menekankan threshold Market Testing disepakati untuk setiap kategori DFV dan tidak harus sama untuk seluruh inovasi.
          </Text>
          <Text style={styles.thresholdText}>
            • Proposal Inkubasi dan Playbook menggunakan 70% sebagai acuan umum. Gunakan 70% sebagai default bila belum ada threshold khusus.
          </Text>
          <Text style={styles.thresholdText}>
            • Setiap metrik harus memiliki sumber data, PIC pengumpulan data, baseline, target, dan cara interpretasi.
          </Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Validasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Metrik</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Baseline</Text>
            <Text style={[styles.tableHeaderCell, { width: '11%' }]}>Target</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Threshold</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>
              Cara Pengukuran
            </Text>
          </View>
          {data.metrikList?.slice(0, 6).map((m, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                i === 5 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <Text style={[styles.tableDataCell, { width: '14%', fontWeight: 'bold', color: m.validasi === 'Desirability' ? '#0f766e' : '#b45309' }]}>
                {m.validasi}
              </Text>
              <Text style={[styles.tableDataCell, { width: '22%', fontWeight: 'bold' }]}>{m.metrik}</Text>
              <Text style={[styles.tableDataCell, { width: '13%' }]}>{fmtVal(m.unitUkuran)}</Text>
              <Text style={[styles.tableDataCell, { width: '10%' }]}>{fmtVal(m.baseline)}</Text>
              <Text style={[styles.tableDataCell, { width: '11%' }]}>{fmtVal(m.target)}</Text>
              <Text style={[styles.tableDataCell, { width: '10%' }]}>{fmtVal(m.threshold)}</Text>
              <Text style={[styles.tableDataCell, { width: '20%', borderRightWidth: 0 }]}>
                {fmtVal(m.caraPengukuran)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Template Juklak 3.1 · Perencanaan Market Validation · Halaman 2 dari 3
        </Text>
      </Page>

      {/* ── HALAMAN 3: METRIK VIABILITY & LEMBAR PENGESAHAN FORMAL ── */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>
          5. Metrik, Threshold, dan Cara Pengukuran DFV (Lanjutan: Viability)
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Validasi</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Metrik</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Baseline</Text>
            <Text style={[styles.tableHeaderCell, { width: '11%' }]}>Target</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Threshold</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>
              Cara Pengukuran
            </Text>
          </View>
          {data.metrikList?.slice(6).map((m, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                i === (data.metrikList?.slice(6).length || 0) - 1 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <Text style={[styles.tableDataCell, { width: '14%', fontWeight: 'bold', color: '#15803d' }]}>
                {m.validasi}
              </Text>
              <Text style={[styles.tableDataCell, { width: '22%', fontWeight: 'bold' }]}>{m.metrik}</Text>
              <Text style={[styles.tableDataCell, { width: '13%' }]}>{fmtVal(m.unitUkuran)}</Text>
              <Text style={[styles.tableDataCell, { width: '10%' }]}>{fmtVal(m.baseline)}</Text>
              <Text style={[styles.tableDataCell, { width: '11%' }]}>{fmtVal(m.target)}</Text>
              <Text style={[styles.tableDataCell, { width: '10%' }]}>{fmtVal(m.threshold)}</Text>
              <Text style={[styles.tableDataCell, { width: '20%', borderRightWidth: 0 }]}>
                {fmtVal(m.caraPengukuran)}
              </Text>
            </View>
          ))}
        </View>

        {/* Lembar Pengesahan Formal Tripartit */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
          Lembar Pengesahan Rencana Rilis MVP
        </Text>
        <View style={styles.signaturesContainer}>
          {/* Disusun Oleh Project Owner */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Disusun Oleh</Text>
            {data.ttdDisusun?.nama ? (
              <View style={{ alignItems: 'center' }}>
                {data.ttdDisusun.signatureImage ? (
                  <Image
                    src={data.ttdDisusun.signatureImage}
                    style={{ width: 65, height: 26, objectFit: 'contain', marginBottom: 4 }}
                  />
                ) : (
                  <Text style={{ fontSize: 7, color: '#0f5132', fontWeight: 'bold', marginBottom: 12 }}>
                    [Telah Ditandatangani Digital]
                  </Text>
                )}
                <Text style={styles.signatureName}>{data.ttdDisusun.nama}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisusun.jabatan || 'Project Owner'}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisusun.unit || 'PT Pegadaian (Persero)'}</Text>
                <Text style={[styles.signatureSubtext, { fontSize: 6.2, marginTop: 2 }]}>
                  {formatDateIndo(data.ttdDisusun.tanggal)}
                </Text>
              </View>
            ) : (
              <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 6.8, color: '#94a3b8', fontStyle: 'italic' }}>
                  Belum ditandatangani
                </Text>
                <Text style={[styles.signatureSubtext, { marginTop: 6 }]}>Project Owner</Text>
              </View>
            )}
          </View>

          {/* Diperiksa Oleh Innovation Coach */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Diperiksa Oleh</Text>
            {data.ttdDiperiksa?.nama ? (
              <View style={{ alignItems: 'center' }}>
                {data.ttdDiperiksa.signatureImage ? (
                  <Image
                    src={data.ttdDiperiksa.signatureImage}
                    style={{ width: 65, height: 26, objectFit: 'contain', marginBottom: 4 }}
                  />
                ) : (
                  <Text style={{ fontSize: 7, color: '#0f5132', fontWeight: 'bold', marginBottom: 12 }}>
                    [Telah Ditandatangani Digital]
                  </Text>
                )}
                <Text style={styles.signatureName}>{data.ttdDiperiksa.nama}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDiperiksa.jabatan || 'Innovation Coach'}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDiperiksa.unit || 'PT Pegadaian (Persero)'}</Text>
                <Text style={[styles.signatureSubtext, { fontSize: 6.2, marginTop: 2 }]}>
                  {formatDateIndo(data.ttdDiperiksa.tanggal)}
                </Text>
              </View>
            ) : (
              <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 6.8, color: '#94a3b8', fontStyle: 'italic' }}>
                  Belum ditandatangani
                </Text>
                <Text style={[styles.signatureSubtext, { marginTop: 6 }]}>Innovation Coach</Text>
              </View>
            )}
          </View>

          {/* Disetujui Oleh Promotor Inovasi */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Disetujui Oleh</Text>
            {data.ttdDisetujui?.nama ? (
              <View style={{ alignItems: 'center' }}>
                {data.ttdDisetujui.signatureImage ? (
                  <Image
                    src={data.ttdDisetujui.signatureImage}
                    style={{ width: 65, height: 26, objectFit: 'contain', marginBottom: 4 }}
                  />
                ) : (
                  <Text style={{ fontSize: 7, color: '#0f5132', fontWeight: 'bold', marginBottom: 12 }}>
                    [Telah Ditandatangani Digital]
                  </Text>
                )}
                <Text style={styles.signatureName}>{data.ttdDisetujui.nama}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisetujui.jabatan || 'Promotor Inovasi'}</Text>
                <Text style={styles.signatureSubtext}>{data.ttdDisetujui.unit || 'PT Pegadaian (Persero)'}</Text>
                <Text style={[styles.signatureSubtext, { fontSize: 6.2, marginTop: 2 }]}>
                  {formatDateIndo(data.ttdDisetujui.tanggal)}
                </Text>
              </View>
            ) : (
              <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 6.8, color: '#94a3b8', fontStyle: 'italic' }}>
                  Belum ditandatangani
                </Text>
                <Text style={[styles.signatureSubtext, { marginTop: 6 }]}>Promotor Inovasi</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.footer}>
          Template Juklak 3.1 · Perencanaan Market Validation · Halaman 3 dari 3
        </Text>
      </Page>
    </Document>
  );
}
