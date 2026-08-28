import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

// Disable hyphenation to prevent broken Indonesian words and package resolution issues
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 24,
    paddingBottom: 28,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f5132',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  headerDocCode: {
    fontSize: 6.5,
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
    fontSize: 7,
    color: '#475569',
    lineHeight: 1.2,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f5132',
    backgroundColor: '#f0fdf4',
    padding: '2.5 4',
    borderRadius: 2,
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
    backgroundColor: '#0f5132',
  },
  tableHeaderCell: {
    padding: '3 3.5',
    fontSize: 6.8,
    fontWeight: 'bold',
    color: '#ffffff',
    borderRightWidth: 0.5,
    borderRightColor: '#166534',
    borderRightStyle: 'solid',
  },
  tableCellLabel: {
    width: '25%',
    padding: '2.5 4',
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
  },
  tableCellValue: {
    width: '75%',
    padding: '2.5 4',
    fontSize: 7,
    color: '#0f172a',
    lineHeight: 1.2,
  },
  tableDataCell: {
    padding: '2.5 3.5',
    fontSize: 6.5,
    color: '#0f172a',
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
    borderRightStyle: 'solid',
    lineHeight: 1.2,
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
    borderRadius: 3,
    padding: '5 7',
    backgroundColor: '#fafafa',
  },
  signatureRoleTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#0f5132',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  signatureRoleSubtitle: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  signatureLine: {
    marginTop: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#94a3b8',
    borderBottomStyle: 'solid',
    marginBottom: 3,
  },
  signatureName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  signatureSubtext: {
    fontSize: 6,
    color: '#475569',
    textAlign: 'left',
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6,
    color: '#94a3b8',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 3,
  },
});

export interface RolePerson {
  nama: string;
  jabatan?: string | null;
  unitKerja?: string | null;
  komitmenDukungan?: string | null;
}

export interface BacklogItemPdf {
  judul: string;
  deskripsi?: string | null;
  sprintNumber?: number | string | null;
  acceptanceCriteria?: string | null;
  ownerName?: string | null;
  dependencyRisiko?: string | null;
  timeline?: string | null;
}

export interface SprintMilestonePdf {
  nomorSprint: number;
  tujuan?: string | null;
  tanggalMulaiRencana?: string | null;
  tanggalSelesaiRencana?: string | null;
}

export interface SignatureDataPdf {
  nama?: string | null;
  jabatan?: string | null;
  unit?: string | null;
  tanggal?: string | null;
  signatureImage?: string | null;
  status?: string | null;
}

export interface CharterPdfData {
  namaProyekInovasi: string;
  kategoriPia?: string | null;
  klasifikasiInovasi?: string | null;
  projectMission?: string | null;
  customerEarlyAdopters?: string | null;
  contextAreaBantuan?: string | null;
  problemWorthSolving?: string | null;
  hmw?: string | null;
  opportunityStatement?: string | null;
  businessOpportunity?: string | null;
  solusiAwal?: string | null;
  desirabilityHypothesis?: string | null;
  feasibilityHypothesis?: string | null;
  viabilityHypothesis?: string | null;
  linkProposal?: string | null;

  // Section 1 Roles
  roles: {
    sponsor?: RolePerson[];
    promotor?: RolePerson[];
    projectOwner?: RolePerson[];
    inisiator?: RolePerson[];
    coCreators?: RolePerson[];
    coach?: RolePerson[];
    sme?: RolePerson[];
  };

  // Section 2 Team Agreement & Milestones
  ritmeKerja?: string | null;
  sprintMilestones?: SprintMilestonePdf[];
  pacingMonitoring?: string | null;
  kebutuhanDukungan?: string | null;
  risikoAwal?: string | null;

  // Section 3 Backlog
  backlogList?: BacklogItemPdf[];

  // Signatures
  ttdDisusun?: SignatureDataPdf | null;
  ttdDiperiksa?: SignatureDataPdf | null;
  ttdDisetujui?: SignatureDataPdf | null;
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

function formatPersonsList(persons?: RolePerson[]): string {
  if (!persons || persons.length === 0) return '-';
  return persons
    .map((p) => {
      const parts = [p.nama];
      if (p.jabatan) parts.push(p.jabatan);
      if (p.unitKerja) parts.push(p.unitKerja);
      return parts.join(' - ');
    })
    .join('\n');
}

function formatPersonsCommitment(persons?: RolePerson[], defaultText = '<Bentuk dukungan yang disepakati>'): string {
  if (!persons || persons.length === 0) return defaultText;
  const commitments = persons
    .map((p) => p.komitmenDukungan)
    .filter(Boolean);
  if (commitments.length === 0) return defaultText;
  return commitments.join('\n');
}

export function CharterPdfDocument({ data }: { data: CharterPdfData }) {
  // Format milestone sprints for Section 2
  const milestoneSummary =
    data.sprintMilestones && data.sprintMilestones.length > 0
      ? data.sprintMilestones
          .map((s) => {
            const dateRange =
              s.tanggalMulaiRencana || s.tanggalSelesaiRencana
                ? ` (${s.tanggalMulaiRencana || '?'} s/d ${s.tanggalSelesaiRencana || '?'})`
                : '';
            return `Sprint ${s.nomorSprint}: ${s.tujuan || 'Aktivitas Inkubasi'}${dateRange}`;
          })
          .join('\n')
      : '<Sprint 1: MVP dasar; Sprint 2: release MVP 1.0; Sprint 3: traction; Sprint 4: MVP lanjutan/Product-Market Fit Validation. Sesuaikan dengan program final.>';

  return (
    <Document title={`Innovation Charter - ${data.namaProyekInovasi || 'PIA'}`}>
      <Page size="A4" style={styles.page}>
        {/* Header Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerDocCode}>PT PEGADAIAN (Persero) · INCUBATOR PROGRAM · TEMPLATE JUKLAK 1</Text>
          <Text style={styles.headerTitle}>INNOVATION SETUP DAN STAKEHOLDER ALIGNMENT</Text>
          <Text style={styles.headerSubtitle}>
            Tujuan: memastikan tim inovator memiliki role, mandat, milestone, backlog, serta dukungan stakeholder yang jelas sebelum Customer Validation dan Market Validation.
          </Text>
        </View>

        {/* 15 Header Key-Value Table */}
        <View style={styles.table}>
          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Nama Proyek Inovasi</Text>
            <Text style={[styles.tableCellValue, { fontWeight: 'bold' }]}>
              {fmtVal(data.namaProyekInovasi, '<Nama Proyek Inovasi yang diajukan>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Kategori PIA</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.kategoriPia, '<Kategori PIA Season 12>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Klasifikasi Inovasi</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.klasifikasiInovasi, '<BREAKTHROUGH / IMPROVEMENT / BEST PRACTICE>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Project Mission</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.projectMission, '<Rumusan aspiratif, kuantitatif, dan time-bound. Contoh: Meningkatkan X sebesar Y dalam Z bulan melalui ...>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Customer / Early Adopters Utama</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.customerEarlyAdopters, '<Segmen customer/pengguna prioritas yang akan dibantu dan diuji.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Context / Area Bantuan</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.contextAreaBantuan, '<Dalam hal apa customer ingin dibantu; gunakan sudut pandang customer dan tidak mengarah pada solusi.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Problem Worth Solving</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.problemWorthSolving, '<Masalah utama/serumpun masalah yang paling berat dan layak diselesaikan, beserta bukti awal.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>How Might We (HMW)</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.hmw, '<Rumusan pertanyaan peluang: Bagaimana kita dapat membantu [customer] untuk [outcome] dalam konteks [area bantuan], tanpa langsung mengunci solusi?>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Opportunity Statement</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.opportunityStatement, '<Peluang nilai/manfaat yang dapat diciptakan bila masalah terselesaikan.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Business Opportunity</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.businessOpportunity, '<Peluang bisnis/operasional yang dapat ditangkap: revenue, cost saving, productivity, risk mitigation, customer experience, atau manfaat strategis lainnya.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Solusi Awal</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.solusiAwal, '<Nama dan deskripsi singkat solusi.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Desirability Hypothesis</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.desirabilityHypothesis, '<Asumsi mengapa customer akan membutuhkan, menggunakan, merekomendasikan, atau bersedia membayar/mengadopsi solusi.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Feasibility Hypothesis</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.feasibilityHypothesis, '<Asumsi awal tentang kesiapan proses, sistem, teknologi, data, SDM, dan operasional untuk menjalankan solusi.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Viability Hypothesis</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.viabilityHypothesis, '<Asumsi awal tentang manfaat bisnis, cost-benefit, potensi skala, dan keberlanjutan solusi.>')}
            </Text>
          </View>

          <View style={[styles.tableRow, { borderBottomWidth: 0 }]} wrap={false}>
            <Text style={styles.tableCellLabel}>Link Proposal / Pitch Deck / Prototype Awal</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.linkProposal, '<Tautan dokumen pendukung.>')}
            </Text>
          </View>
        </View>

        {/* Section 1: Role dan Akuntabilitas */}
        <Text style={styles.sectionTitle}>1. Role dan Akuntabilitas</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableRowHeader]} wrap={false}>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Role</Text>
            <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Nama/Jabatan/Unit</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Akuntabilitas</Text>
            <Text style={[styles.tableHeaderCell, { width: '26%', borderRightWidth: 0 }]}>Komitmen/Dukungan</Text>
          </View>

          {/* Sponsor */}
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableDataCell, { width: '16%', fontWeight: 'bold' }]}>Sponsor</Text>
            <Text style={[styles.tableDataCell, { width: '28%' }]}>
              {formatPersonsList(data.roles?.sponsor)}
            </Text>
            <Text style={[styles.tableDataCell, { width: '30%' }]}>
              Menetapkan arah, legitimasi, dan dukungan sumber daya.
            </Text>
            <Text style={[styles.tableDataCell, { width: '26%', borderRightWidth: 0 }]}>
              {formatPersonsCommitment(data.roles?.sponsor, '<Bentuk dukungan yang disepakati>')}
            </Text>
          </View>

          {/* Promotor */}
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableDataCell, { width: '16%', fontWeight: 'bold' }]}>Promotor</Text>
            <Text style={[styles.tableDataCell, { width: '28%' }]}>
              {formatPersonsList(data.roles?.promotor)}
            </Text>
            <Text style={[styles.tableDataCell, { width: '30%' }]}>
              Menjadi calon rumah Inovasi, memberi perspektif bisnis, akses, dan dukungan operasional.
            </Text>
            <Text style={[styles.tableDataCell, { width: '26%', borderRightWidth: 0 }]}>
              {formatPersonsCommitment(data.roles?.promotor, '<Bentuk dukungan yang disepakati>')}
            </Text>
          </View>

          {/* Project Owner */}
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableDataCell, { width: '16%', fontWeight: 'bold' }]}>Project Owner</Text>
            <Text style={[styles.tableDataCell, { width: '28%' }]}>
              {formatPersonsList(data.roles?.projectOwner)}
            </Text>
            <Text style={[styles.tableDataCell, { width: '30%' }]}>
              Mengelola visi produk, prioritas backlog, scope MVP, dan keputusan produk.
            </Text>
            <Text style={[styles.tableDataCell, { width: '26%', borderRightWidth: 0 }]}>
              {formatPersonsCommitment(data.roles?.projectOwner, '<Keputusan yang menjadi mandat PO>')}
            </Text>
          </View>

          {/* Inisiator */}
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableDataCell, { width: '16%', fontWeight: 'bold' }]}>Inisiator</Text>
            <Text style={[styles.tableDataCell, { width: '28%' }]}>
              {formatPersonsList(data.roles?.inisiator)}
            </Text>
            <Text style={[styles.tableDataCell, { width: '30%' }]}>
              Mendefinisikan customer, context, problem, opportunity, dan solusi tervalidasi.
            </Text>
            <Text style={[styles.tableDataCell, { width: '26%', borderRightWidth: 0 }]}>
              {formatPersonsCommitment(data.roles?.inisiator, '<Tanggung jawab utama>')}
            </Text>
          </View>

          {/* Co-creators */}
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableDataCell, { width: '16%', fontWeight: 'bold' }]}>Co-creators</Text>
            <Text style={[styles.tableDataCell, { width: '28%' }]}>
              {formatPersonsList(data.roles?.coCreators)}
            </Text>
            <Text style={[styles.tableDataCell, { width: '30%' }]}>
              Mengembangkan prototype/MVP, menjalankan task list, testing, dan dokumentasi.
            </Text>
            <Text style={[styles.tableDataCell, { width: '26%', borderRightWidth: 0 }]}>
              {formatPersonsCommitment(data.roles?.coCreators, '<Tanggung jawab utama>')}
            </Text>
          </View>

          {/* Innovation Coach */}
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableDataCell, { width: '16%', fontWeight: 'bold' }]}>Innovation Coach</Text>
            <Text style={[styles.tableDataCell, { width: '28%' }]}>
              {formatPersonsList(data.roles?.coach)}
            </Text>
            <Text style={[styles.tableDataCell, { width: '30%' }]}>
              Memfasilitasi metodologi, koordinasi, monitoring, dan capability building.
            </Text>
            <Text style={[styles.tableDataCell, { width: '26%', borderRightWidth: 0 }]}>
              {formatPersonsCommitment(data.roles?.coach, '<Ritme coaching/pacing>')}
            </Text>
          </View>

          {/* Collaborator / SME */}
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]} wrap={false}>
            <Text style={[styles.tableDataCell, { width: '16%', fontWeight: 'bold' }]}>Collaborator / SME / Unit Terkait</Text>
            <Text style={[styles.tableDataCell, { width: '28%' }]}>
              {formatPersonsList(data.roles?.sme)}
            </Text>
            <Text style={[styles.tableDataCell, { width: '30%' }]}>
              Memberikan expertise, akses data/sistem, review, atau dukungan lintas fungsi sesuai kebutuhan.
            </Text>
            <Text style={[styles.tableDataCell, { width: '26%', borderRightWidth: 0 }]}>
              {formatPersonsCommitment(data.roles?.sme, '<Bentuk kolaborasi dan deliverable yang disepakati>')}
            </Text>
          </View>
        </View>

        {/* Section 2: Team Agreement dan Milestone 12 Minggu */}
        <Text style={styles.sectionTitle}>2. Team Agreement dan Milestone 12 Minggu</Text>
        <View style={styles.table}>
          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Ritme Kerja</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.ritmeKerja, '<Cycle meeting, sprint planning, sprint review, retrospective, dan kanal komunikasi.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Milestone Sprint</Text>
            <Text style={styles.tableCellValue}>
              {milestoneSummary}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Pacing dan Monitoring</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.pacingMonitoring, '<Pacer/Innovation Coach, frekuensi update, format progress, dan eskalasi hambatan.>')}
            </Text>
          </View>

          <View style={styles.tableRow} wrap={false}>
            <Text style={styles.tableCellLabel}>Kebutuhan Dukungan</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.kebutuhanDukungan, '<Akses data, approval, sistem, budget, early adopters, promosi terbatas, vendor, SME.>')}
            </Text>
          </View>

          <View style={[styles.tableRow, { borderBottomWidth: 0 }]} wrap={false}>
            <Text style={styles.tableCellLabel}>Risiko Awal</Text>
            <Text style={styles.tableCellValue}>
              {fmtVal(data.risikoAwal, '<Risiko regulasi, operasional, IT, data privacy, adopsi pengguna, budget, timeline.>')}
            </Text>
          </View>
        </View>

        {/* Section 3: Backlog Awal dan Timeline Sprint */}
        <Text style={styles.sectionTitle}>3. Backlog Awal dan Timeline Sprint</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableRowHeader]} wrap={false}>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Backlog / Prioritas</Text>
            <Text style={[styles.tableHeaderCell, { width: '11%' }]}>Sprint</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Output / Acceptance Criteria</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Owner</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Collaboration / Dependency</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%', borderRightWidth: 0 }]}>Timeline</Text>
          </View>

          {/* Data Rows */}
          {data.backlogList && data.backlogList.length > 0 ? (
            data.backlogList.map((item, idx) => (
              <View
                key={idx}
                wrap={false}
                style={[
                  styles.tableRow,
                  idx === (data.backlogList?.length ?? 0) - 1 ? { borderBottomWidth: 0 } : {},
                ]}
              >
                <View style={[styles.tableDataCell, { width: '22%' }]}>
                  <Text style={{ fontWeight: 'bold' }}>{item.judul}</Text>
                  {item.deskripsi ? <Text style={{ fontSize: 6, color: '#64748b', marginTop: 1 }}>{item.deskripsi}</Text> : null}
                </View>
                <Text style={[styles.tableDataCell, { width: '11%' }]}>
                  {item.sprintNumber ? `Sprint ${item.sprintNumber}` : '-'}
                </Text>
                <Text style={[styles.tableDataCell, { width: '25%' }]}>
                  {fmtVal(item.acceptanceCriteria, '<Output yang dapat didemonstrasikan dan kriteria selesai>')}
                </Text>
                <Text style={[styles.tableDataCell, { width: '14%' }]}>
                  {fmtVal(item.ownerName, '<Owner>')}
                </Text>
                <Text style={[styles.tableDataCell, { width: '16%' }]}>
                  {fmtVal(item.dependencyRisiko, '<Dependency>')}
                </Text>
                <Text style={[styles.tableDataCell, { width: '12%', borderRightWidth: 0 }]}>
                  {fmtVal(item.timeline, '<Tanggal>')}
                </Text>
              </View>
            ))
          ) : (
            // Placeholder rows if no backlog exists yet
            [1, 2, 3, 4].map((sprNum, idx) => (
              <View
                key={sprNum}
                wrap={false}
                style={[
                  styles.tableRow,
                  idx === 3 ? { borderBottomWidth: 0 } : {},
                ]}
              >
                <Text style={[styles.tableDataCell, { width: '22%' }]}>{`<Backlog prioritas ${sprNum}>`}</Text>
                <Text style={[styles.tableDataCell, { width: '11%' }]}>{`Sprint ${sprNum}`}</Text>
                <Text style={[styles.tableDataCell, { width: '25%' }]}>
                  {'<Output yang dapat didemonstrasikan dan kriteria selesai>'}
                </Text>
                <Text style={[styles.tableDataCell, { width: '14%' }]}>{'<Owner>'}</Text>
                <Text style={[styles.tableDataCell, { width: '16%' }]}>{'<Dependency>'}</Text>
                <Text style={[styles.tableDataCell, { width: '12%', borderRightWidth: 0 }]}>{'<Tanggal>'}</Text>
              </View>
            ))
          )}
        </View>

        {/* Blok Tanda Tangan Formal (3 Kolom: PO, Coach, Promotor) */}
        <View wrap={false} style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>Persetujuan &amp; Otorisasi Innovation Charter</Text>
          <View style={styles.signaturesContainer}>
            {/* Disusun Oleh (Project Owner) */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureRoleTitle}>Disusun Oleh</Text>
              <Text style={styles.signatureRoleSubtitle}>Project Owner</Text>

              {data.ttdDisusun?.signatureImage ? (
                <View style={{ alignItems: 'center', marginVertical: 2 }}>
                  <Image
                    src={data.ttdDisusun.signatureImage}
                    style={{ width: 60, height: 24, objectFit: 'contain' }}
                  />
                </View>
              ) : data.ttdDisusun?.status === 'approved' ? (
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Text style={{ fontSize: 6, color: '#0f5132', fontWeight: 'bold' }}>
                    [Telah Ditandatangani Digital]
                  </Text>
                </View>
              ) : (
                <View style={[styles.signatureLine, { width: '80%', alignSelf: 'center' }]} />
              )}

              <Text style={styles.signatureName}>
                ({data.ttdDisusun?.nama || '................................'})
              </Text>
              <Text style={styles.signatureSubtext}>
                Jabatan: {data.ttdDisusun?.jabatan || '__________________'}
              </Text>
              <Text style={styles.signatureSubtext}>
                Unit Kerja: {data.ttdDisusun?.unit || '________________'}
              </Text>
              <Text style={styles.signatureSubtext}>
                Tanggal: {data.ttdDisusun?.tanggal ? formatDateIndo(data.ttdDisusun.tanggal) : '__________________'}
              </Text>
            </View>

            {/* Diperiksa Oleh (Innovation Coach) */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureRoleTitle}>Diperiksa Oleh</Text>
              <Text style={styles.signatureRoleSubtitle}>Innovation Coach</Text>

              {data.ttdDiperiksa?.signatureImage ? (
                <View style={{ alignItems: 'center', marginVertical: 2 }}>
                  <Image
                    src={data.ttdDiperiksa.signatureImage}
                    style={{ width: 60, height: 24, objectFit: 'contain' }}
                  />
                </View>
              ) : data.ttdDiperiksa?.status === 'approved' ? (
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Text style={{ fontSize: 6, color: '#0f5132', fontWeight: 'bold' }}>
                    [Telah Ditandatangani Digital]
                  </Text>
                </View>
              ) : (
                <View style={[styles.signatureLine, { width: '80%', alignSelf: 'center' }]} />
              )}

              <Text style={styles.signatureName}>
                ({data.ttdDiperiksa?.nama || '................................'})
              </Text>
              <Text style={styles.signatureSubtext}>
                Jabatan: {data.ttdDiperiksa?.jabatan || '__________________'}
              </Text>
              <Text style={styles.signatureSubtext}>
                Unit Kerja: {data.ttdDiperiksa?.unit || '________________'}
              </Text>
              <Text style={styles.signatureSubtext}>
                Tanggal: {data.ttdDiperiksa?.tanggal ? formatDateIndo(data.ttdDiperiksa.tanggal) : '__________________'}
              </Text>
            </View>

            {/* Disetujui Oleh (Promotor) */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureRoleTitle}>Disetujui Oleh</Text>
              <Text style={styles.signatureRoleSubtitle}>Promotor</Text>

              {data.ttdDisetujui?.signatureImage ? (
                <View style={{ alignItems: 'center', marginVertical: 2 }}>
                  <Image
                    src={data.ttdDisetujui.signatureImage}
                    style={{ width: 60, height: 24, objectFit: 'contain' }}
                  />
                </View>
              ) : data.ttdDisetujui?.status === 'approved' ? (
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Text style={{ fontSize: 6, color: '#0f5132', fontWeight: 'bold' }}>
                    [Telah Ditandatangani Digital]
                  </Text>
                </View>
              ) : (
                <View style={[styles.signatureLine, { width: '80%', alignSelf: 'center' }]} />
              )}

              <Text style={styles.signatureName}>
                ({data.ttdDisetujui?.nama || '................................'})
              </Text>
              <Text style={styles.signatureSubtext}>
                Jabatan: {data.ttdDisetujui?.jabatan || '__________________'}
              </Text>
              <Text style={styles.signatureSubtext}>
                Unit Kerja: {data.ttdDisetujui?.unit || '________________'}
              </Text>
              <Text style={styles.signatureSubtext}>
                Tanggal: {data.ttdDisetujui?.tanggal ? formatDateIndo(data.ttdDisetujui.tanggal) : '__________________'}
              </Text>
            </View>
          </View>
        </View>

        {/* Dynamic Footer with native React-PDF fixed prop */}
        <View style={styles.footer} fixed>
          <Text>PIA Season 12 &bull; Dokumen FR-PIA-01.0 (Innovation Charter)</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
