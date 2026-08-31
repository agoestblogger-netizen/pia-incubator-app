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
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
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

export interface RabPdfItemRow {
  id?: string;
  kategori?: string;
  uraian: string;
  kuantitas?: number;
  volume?: number;
  satuan: string;
  hargaSatuan: number;
  jumlah: number;
  keterangan?: string;
}

export interface RabPdfData {
  namaProyekInovasi: string;
  kategoriProyek: string;
  fase: string;
  tanggalPengajuan?: string | Date | null;
  status: string;
  // Bagian 1: Identitas
  namaPic: string;
  unitKerjaPic: string;
  noHpPic: string;
  // Bagian 2: Ringkasan Pengajuan Dana
  tujuanPenggunaan: string;
  nominalDiajukan: number;
  // Bagian 3: Tujuan Aktivitas Inkubasi
  outputYangDiharapkan: string;
  // Bagian 4: Tabel RAB
  rabItems: RabPdfItemRow[];
  totalRab: number;
  // Bagian 5: Pengesahan
  pengesahanPic?: {
    nama: string;
    nik?: string;
    unitKerja: string;
    tanggal: string;
    signatureImage?: string;
  } | null;
  pengesahanApprover?: {
    nama: string;
    nik?: string;
    unitKerja: string;
    tanggal: string;
    signatureImage?: string;
    userId?: string;
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

export function RabPdfDocument({ data }: { data: RabPdfData }) {
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
            Lampiran II: Petunjuk Pelaksanaan Inkubasi Inovasi • Formulir A
          </Text>
          <Text style={styles.headerTitle}>
            FORMULIR PENGAJUAN ANGGARAN INKUBASI (RAB)
          </Text>
          <Text style={styles.headerSubtitle}>
            Proyek: {data.namaProyekInovasi || '-'} | Fase: {faseLabel} | Tanggal Pengajuan: {formatDateIndo(data.tanggalPengajuan)}
          </Text>
        </View>

        {/* Bagian 1: Identitas Pengajuan */}
        <Text style={styles.sectionTitle}>1. Identitas Pengajuan Inovator</Text>
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
            <Text style={styles.tableCellLabel}>No. Handphone (WhatsApp)</Text>
            <Text style={styles.tableCellValue}>{data.noHpPic || '-'}</Text>
          </View>
        </View>

        {/* Bagian 2: Ringkasan Pengajuan Dana */}
        <Text style={styles.sectionTitle}>2. Ringkasan Pengajuan Dana</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Judul Proyek Inovasi</Text>
            <Text style={styles.tableCellValue}>{data.namaProyekInovasi || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Kategori Proyek Inovasi</Text>
            <Text style={styles.tableCellValue}>{data.kategoriProyek || '-'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>Tujuan Penggunaan Dana</Text>
            <Text style={styles.tableCellValue}>{data.tujuanPenggunaan || '-'}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Estimasi Total Dana Diajukan</Text>
            <Text style={[styles.tableCellValue, { fontWeight: 'bold', color: '#0f5132' }]}>
              {formatRupiah(data.nominalDiajukan)}
            </Text>
          </View>
        </View>

        {/* Bagian 3: Tujuan Aktivitas Inkubasi */}
        <Text style={styles.sectionTitle}>3. Tujuan Aktivitas Inkubasi</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tableCellLabel}>Output yang Diharapkan</Text>
            <Text style={styles.tableCellValue}>{data.outputYangDiharapkan || '-'}</Text>
          </View>
        </View>

        {/* Bagian 4: Tabel Rencana Anggaran Biaya (RAB) */}
        <Text style={styles.sectionTitle}>4. Rencana Anggaran Biaya (RAB)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <Text style={[styles.tableHeaderCell, { width: '6%', textAlign: 'center' }]}>No</Text>
            <Text style={[styles.tableHeaderCell, { width: '34%' }]}>Uraian / Detail Kebutuhan</Text>
            <Text style={[styles.tableHeaderCell, { width: '9%', textAlign: 'center' }]}>Vol</Text>
            <Text style={[styles.tableHeaderCell, { width: '11%' }]}>Satuan</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>Biaya Satuan</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%', textAlign: 'right', borderRightWidth: 0 }]}>
              Jumlah
            </Text>
          </View>

          {data.rabItems && data.rabItems.length > 0 ? (
            data.rabItems.map((item, idx) => {
              const qty = item.kuantitas ?? item.volume ?? 1;
              return (
                <View key={idx} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableDataCell, { width: '6%', textAlign: 'center', color: '#64748b' }]}>
                    {idx + 1}
                  </Text>
                  <Text style={[styles.tableDataCell, { width: '34%', fontWeight: 'medium' }]}>
                    {item.uraian || '-'}
                    {item.keterangan ? `\n(${item.keterangan})` : ''}
                  </Text>
                  <Text style={[styles.tableDataCell, { width: '9%', textAlign: 'center' }]}>
                    {qty}
                  </Text>
                  <Text style={[styles.tableDataCell, { width: '11%' }]}>
                    {item.satuan || '-'}
                  </Text>
                  <Text style={[styles.tableDataCell, { width: '18%', textAlign: 'right' }]}>
                    {formatRupiah(item.hargaSatuan)}
                  </Text>
                  <Text style={[styles.tableDataCell, { width: '22%', textAlign: 'right', fontWeight: 'bold', borderRightWidth: 0 }]}>
                    {formatRupiah(item.jumlah)}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableDataCell, { width: '100%', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', borderRightWidth: 0 }]}>
                Belum ada rincian item RAB.
              </Text>
            </View>
          )}

          {/* Baris Total */}
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]} wrap={false}>
            <Text style={[styles.tableFooterCell, { width: '78%', textAlign: 'right' }]}>
              Total Rencana Anggaran Biaya (RAB):
            </Text>
            <Text style={[styles.tableFooterCell, { width: '22%', textAlign: 'right', borderRightWidth: 0 }]}>
              {formatRupiah(data.totalRab || data.nominalDiajukan)}
            </Text>
          </View>
        </View>

        {/* Bagian 5: Pengesahan Dua Pihak */}
        <Text style={styles.sectionTitle}>5. Pengesahan Pengajuan Anggaran</Text>
        <View style={styles.signaturesContainer} wrap={false}>
          {/* Kolom 1: Dibuat Oleh (PIC Tim Inovator) */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Dibuat Oleh:</Text>
            <Text style={styles.signatureBadge}>PIC Tim Inovator</Text>

            {data.pengesahanPic?.signatureImage ? (
              <View style={styles.signatureImageContainer}>
                <Image src={data.pengesahanPic.signatureImage} style={styles.signatureImage} />
              </View>
            ) : (
              <View style={styles.signatureLine} />
            )}

            <Text style={styles.signatureName}>
              {data.pengesahanPic?.nama || data.namaPic || 'Nama PIC'}
            </Text>
            {data.pengesahanPic?.nik ? (
              <Text style={styles.signatureSubtext}>NIK: {data.pengesahanPic.nik}</Text>
            ) : null}
            <Text style={styles.signatureSubtext}>
              {data.pengesahanPic?.unitKerja || data.unitKerjaPic || 'Unit Kerja PIC'}
            </Text>
            <Text style={[styles.signatureSubtext, { color: '#0f5132', fontWeight: 'bold', marginTop: 2 }]}>
              {data.pengesahanPic?.tanggal
                ? `Ditandatangani: ${formatDateIndo(data.pengesahanPic.tanggal)}`
                : 'Ditandatangani secara digital'}
            </Text>
          </View>

          {/* Kolom 2: Disetujui Oleh (Kepala Departemen IC) */}
          <View style={styles.signatureBox}>
            <Text style={styles.signatureRoleTitle}>Disetujui Oleh:</Text>
            <Text style={[styles.signatureBadge, { backgroundColor: data.pengesahanApprover?.signatureImage ? '#dcfce7' : '#fef3c7', color: data.pengesahanApprover?.signatureImage ? '#0f5132' : '#92400e' }]}>
              {data.pengesahanApprover?.signatureImage ? 'Disetujui' : 'Kepala Departemen IC'}
            </Text>

            {data.pengesahanApprover?.signatureImage ? (
              <View style={styles.signatureImageContainer}>
                <Image src={data.pengesahanApprover.signatureImage} style={styles.signatureImage} />
              </View>
            ) : (
              <View style={styles.signatureLine} />
            )}

            <Text style={styles.signatureName}>
              {data.pengesahanApprover?.nama || 'Kepala Departemen Innovation Center'}
            </Text>
            {data.pengesahanApprover?.nik ? (
              <Text style={styles.signatureSubtext}>NIK: {data.pengesahanApprover.nik}</Text>
            ) : null}
            <Text style={styles.signatureSubtext}>
              {data.pengesahanApprover?.unitKerja || 'Innovation Center PT Pegadaian'}
            </Text>
            <Text style={[styles.signatureSubtext, { color: data.pengesahanApprover?.tanggal ? '#0f5132' : '#94a3b8', fontWeight: 'bold', marginTop: 2 }]}>
              {data.pengesahanApprover?.tanggal
                ? `Disetujui: ${formatDateIndo(data.pengesahanApprover.tanggal)}`
                : '(Menunggu Persetujuan)'}
            </Text>
          </View>
        </View>

        {/* Footer Halaman */}
        <Text style={styles.footer} fixed>
          Dokumen Pengajuan Anggaran Inkubasi (Formulir A) • Aplikasi PIA Incubator • PT Pegadaian
        </Text>
      </Page>
    </Document>
  );
}
