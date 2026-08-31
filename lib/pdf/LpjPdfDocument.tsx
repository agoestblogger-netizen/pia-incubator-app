import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
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
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f5132',
    backgroundColor: '#f0fdf4',
    padding: '3 6',
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
    fontSize: 7.5,
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
    fontSize: 7.5,
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
  tableFooterCell: {
    padding: '4 6',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f5132',
    backgroundColor: '#f0fdf4',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  statementContainer: {
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  statementText: {
    fontSize: 8,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 1.35,
  },
  signatureWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  signatureBox: {
    width: '48%',
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
    marginBottom: 4,
    textAlign: 'center',
  },
  signatureBadge: {
    fontSize: 6.5,
    color: '#0f5132',
    backgroundColor: '#dcfce7',
    padding: '1 4',
    borderRadius: 2,
    alignSelf: 'center',
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
  signatureImageContainer: {
    height: 44,
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureImage: {
    height: 40,
    width: 'auto',
    objectFit: 'contain',
  },
  signatureLine: {
    marginTop: 30,
    borderBottomWidth: 0.5,
    borderBottomColor: '#94a3b8',
    borderBottomStyle: 'solid',
    marginBottom: 4,
  },
  linkEvidence: {
    color: '#0f5132',
    fontSize: 7,
    textDecoration: 'underline',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 18,
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

export interface LpjPdfEvidenceItem {
  id: string;
  tipe: 'file' | 'link';
  url: string;
  nama: string;
  ukuran?: number;
}

export interface LpjPdfItemRow {
  id?: string;
  uraian: string;
  nominal: number;
  keterangan?: string;
  evidence?: LpjPdfEvidenceItem[];
}

export interface LpjPdfData {
  namaProyekInovasi: string;
  kategoriProyek: string;
  fase: string;
  tanggalKegiatanSelesai?: string | Date | null;
  tanggalKirim?: string | Date | null;
  status: string;
  // Bagian A: Identitas Pengajuan Inovator
  namaPic: string;
  unitKerjaPic: string;
  noHpPic: string;
  // Bagian B: Informasi Inovasi
  judulProyek: string;
  // Bagian C: Ringkasan Penggunaan Anggaran Pelaksanaan MVP
  items: LpjPdfItemRow[];
  totalNominal: number;
  // Bagian D: Pernyataan & Pengesahan PIC
  pernyataanPic?: {
    teks?: string;
    nama: string;
    nik?: string;
    unitKerja: string;
    tanggal: string;
    signatureImage?: string;
  } | null;
}

function formatRupiah(val?: number | null): string {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

function formatDateIndo(dateVal?: string | Date | null): string {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function LpjPdfDocument({ data }: { data: LpjPdfData }) {
  const faseLabel =
    data.fase === 'customer_validation'
      ? 'Customer Validation'
      : data.fase === 'market_validation'
      ? 'Market Validation'
      : data.fase || '-';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Dokumen Resmi */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerDocCode}>
            Lampiran III: Petunjuk Pelaksanaan Inkubasi Inovasi • Formulir B
          </Text>
          <Text style={styles.headerTitle}>
            LAPORAN PERTANGGUNGJAWABAN (LPJ) PENGGUNAAN ANGGARAN
          </Text>
          <Text style={styles.headerSubtitle}>
            Proyek: {data.judulProyek || data.namaProyekInovasi || '-'} | Fase: {faseLabel} | Tanggal Kirim: {formatDateIndo(data.tanggalKirim)}
          </Text>
        </View>

        {/* Bagian A: Identitas Pengajuan Inovator */}
        <Text style={styles.sectionTitle}>A. Identitas Pengajuan Inovator</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Nama Penanggung Jawab (PIC)</Text>
            <Text style={styles.tableCellValue}>{data.namaPic || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Unit Kerja</Text>
            <Text style={styles.tableCellValue}>{data.unitKerjaPic || '-'}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Nomor Telepon (WhatsApp)</Text>
            <Text style={styles.tableCellValue}>{data.noHpPic || '-'}</Text>
          </View>
        </View>

        {/* Bagian B: Informasi Inovasi */}
        <Text style={styles.sectionTitle}>B. Informasi Inovasi</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Judul Proyek Inovasi</Text>
            <Text style={styles.tableCellValue}>{data.judulProyek || data.namaProyekInovasi || '-'}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Kategori Proyek Inovasi</Text>
            <Text style={styles.tableCellValue}>{data.kategoriProyek || '-'}</Text>
          </View>
        </View>

        {/* Bagian C: Ringkasan Penggunaan Anggaran Pelaksanaan MVP */}
        <Text style={styles.sectionTitle}>C. Ringkasan Penggunaan Anggaran Pelaksanaan MVP</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '6%', textAlign: 'center' }]}>No</Text>
            <Text style={[styles.tableHeaderCell, { width: '38%' }]}>Uraian Penggunaan</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Nominal (Rp)</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Keterangan</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', borderRightWidth: 0 }]}>
              Bukti (Evidence)
            </Text>
          </View>

          {data.items && data.items.length > 0 ? (
            data.items.map((item, idx) => (
              <View key={idx} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableDataCell, { width: '6%', textAlign: 'center', color: '#64748b' }]}>
                  {idx + 1}
                </Text>
                <Text style={[styles.tableDataCell, { width: '38%', fontWeight: 'medium' }]}>
                  {item.uraian || '-'}
                </Text>
                <Text style={[styles.tableDataCell, { width: '20%', textAlign: 'right', fontWeight: 'bold' }]}>
                  {formatRupiah(item.nominal)}
                </Text>
                <Text style={[styles.tableDataCell, { width: '16%' }]}>
                  {item.keterangan || '-'}
                </Text>
                <View style={[styles.tableDataCell, { width: '20%', borderRightWidth: 0 }]}>
                  {item.evidence && item.evidence.length > 0 ? (
                    item.evidence.map((ev, eIdx) => (
                      <Link key={eIdx} src={ev.url} style={styles.linkEvidence}>
                        {`[Bukti: ${ev.nama || 'Tautan'}]`}
                      </Link>
                    ))
                  ) : (
                    <Text style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 7 }}>-</Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableDataCell, { width: '100%', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', borderRightWidth: 0 }]}>
                Belum ada rincian penggunaan anggaran.
              </Text>
            </View>
          )}

          {/* Baris Total */}
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]} wrap={false}>
            <Text style={[styles.tableFooterCell, { width: '44%', textAlign: 'right' }]}>
              Total Pengeluaran LPJ:
            </Text>
            <Text style={[styles.tableFooterCell, { width: '20%', textAlign: 'right' }]}>
              {formatRupiah(data.totalNominal)}
            </Text>
            <Text style={[styles.tableFooterCell, { width: '36%', borderRightWidth: 0 }]} />
          </View>
        </View>

        {/* Bagian D: Pernyataan & Pengesahan PIC */}
        <Text style={styles.sectionTitle}>D. Pernyataan & Pengesahan PIC</Text>
        <View style={styles.statementContainer} wrap={false}>
          <Text style={styles.statementText}>
            &ldquo;{data.pernyataanPic?.teks || 'Dengan ini saya selaku PIC Tim Inovator menyatakan bahwa seluruh penggunaan anggaran telah dilaksanakan sesuai dengan kebutuhan pelaksanaan MVP Proyek Inovasi dan dapat dipertanggungjawabkan.'}&rdquo;
          </Text>
        </View>

        <View style={styles.signatureWrapper} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Dibuat Oleh:</Text>
            <Text style={styles.signatureBadge}>PIC Tim Inovator</Text>

            {data.pernyataanPic?.signatureImage ? (
              <View style={styles.signatureImageContainer}>
                <Image src={data.pernyataanPic.signatureImage} style={styles.signatureImage} />
              </View>
            ) : (
              <View style={styles.signatureLine} />
            )}

            <Text style={styles.signatureName}>
              {data.pernyataanPic?.nama || data.namaPic || 'Nama PIC'}
            </Text>
            {data.pernyataanPic?.nik ? (
              <Text style={styles.signatureSubtext}>NIK: {data.pernyataanPic.nik}</Text>
            ) : null}
            <Text style={styles.signatureSubtext}>
              {data.pernyataanPic?.unitKerja || data.unitKerjaPic || 'Unit Kerja PIC'}
            </Text>
            <Text style={[styles.signatureSubtext, { color: '#0f5132', fontWeight: 'bold', marginTop: 2 }]}>
              {data.pernyataanPic?.tanggal
                ? `Ditandatangani: ${formatDateIndo(data.pernyataanPic.tanggal)}`
                : `Dikirim: ${formatDateIndo(data.tanggalKirim)}`}
            </Text>
          </View>
        </View>

        {/* Footer Halaman */}
        <Text style={styles.footer} fixed>
          Dokumen Laporan Pertanggungjawaban Anggaran (Formulir B) • Aplikasi PIA Incubator • PT Pegadaian
        </Text>
      </Page>
    </Document>
  );
}
