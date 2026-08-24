import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP A — INTI PROGRAM
// ═══════════════════════════════════════════════════════════════════════════════

export const timInovator = pgTable('tim_inovator', {
  id: uuid('id').primaryKey().defaultRandom(),
  namaProyekInovasi: text('nama_proyek_inovasi').notNull(),
  kategoriPia: text('kategori_pia').notNull(), // 'BI' | 'BC' | 'WILAYAH' | 'PUSAT'
  klasifikasiInovasi: text('klasifikasi_inovasi'), // 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze'
  status: text('status').notNull().default('aktif'), // 'calon_peserta' | 'aktif' | 'selesai' | 'dihentikan'
  tanggalMulai: timestamp('tanggal_mulai', { withTimezone: true }),
  durasiBulan: integer('durasi_bulan').notNull().default(3),
  tanggalBerakhir: timestamp('tanggal_berakhir', { withTimezone: true }),
  proposalIdAsli: text('proposal_id_asli'),
  seasonAsli: text('season_asli').default('Season 12 - 2026'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const anggotaTim = pgTable('anggota_tim', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  nama: text('nama').notNull(),
  jabatan: text('jabatan').notNull(),
  unitKerja: text('unit_kerja').notNull(),
  komitmenDukungan: text('komitmen_dukungan'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('anggota_tim_inovator_idx').on(t.timInovatorId),
  index('anggota_tim_user_idx').on(t.userId),
]);

export const durasiLog = pgTable('durasi_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  durasiLama: integer('durasi_lama').notNull(),
  durasiBaru: integer('durasi_baru').notNull(),
  alasan: text('alasan').notNull(),
  diubahOleh: text('diubah_oleh'),
  tanggalPerubahan: timestamp('tanggal_perubahan', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dossierPiaArchive = pgTable('dossier_pia_archive', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }).unique(),
  proposalIdAsli: text('proposal_id_asli'),
  seasonAsli: text('season_asli'),
  snapshotData: jsonb('snapshot_data').notNull().default(sql`'{}'`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP B — INNOVATION SETUP
// ═══════════════════════════════════════════════════════════════════════════════

export const charter = pgTable('charter', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }).unique(),
  projectMission: text('project_mission'),
  customerEarlyAdopters: text('customer_early_adopters'),
  contextAreaBantuan: text('context_area_bantuan'),
  problemWorthSolving: text('problem_worth_solving'),
  hmw: text('hmw'),
  opportunityStatement: text('opportunity_statement'),
  businessOpportunity: text('business_opportunity'),
  solusiAwal: text('solusi_awal'),
  desirabilityHypothesis: text('desirability_hypothesis'),
  feasibilityHypothesis: text('feasibility_hypothesis'),
  viabilityHypothesis: text('viability_hypothesis'),
  linkProposal: text('link_proposal'),
  ritmeKerja: text('ritme_kerja'),
  pacingMonitoring: text('pacing_monitoring'),
  kebutuhanDukungan: text('kebutuhan_dukungan'),
  risikoAwal: text('risiko_awal'),
  ttdDisusun: jsonb('ttd_disusun'), // { nama, jabatan, unit, tanggal }
  ttdDiperiksa: jsonb('ttd_diperiksa'),
  ttdDisetujui: jsonb('ttd_disetujui'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP C — KANBAN & TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

export const sprint = pgTable('sprint', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  nomorSprint: integer('nomor_sprint').notNull(),
  tanggalMulaiRencana: timestamp('tanggal_mulai_rencana', { withTimezone: true }),
  tanggalSelesaiRencana: timestamp('tanggal_selesai_rencana', { withTimezone: true }),
  tanggalMulaiAktual: timestamp('tanggal_mulai_aktual', { withTimezone: true }),
  tanggalSelesaiAktual: timestamp('tanggal_selesai_aktual', { withTimezone: true }),
  status: text('status').notNull().default('belum_dimulai'), // 'belum_dimulai' | 'aktif' | 'selesai'
  tujuan: text('tujuan'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('sprint_tim_nomor_unique').on(t.timInovatorId, t.nomorSprint),
  index('sprint_tim_idx').on(t.timInovatorId),
]);

export const sprintLog = pgTable('sprint_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  jumlahLama: integer('jumlah_lama').notNull(),
  jumlahBaru: integer('jumlah_baru').notNull(),
  alasan: text('alasan').notNull(),
  diubahOleh: text('diubah_oleh'),
  tanggalPerubahan: timestamp('tanggal_perubahan', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sprint_log_tim_idx').on(t.timInovatorId),
]);

export const kanbanColumn = pgTable('kanban_column', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  namaKolom: text('nama_kolom').notNull(),
  urutan: integer('urutan').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('kanban_column_tim_idx').on(t.timInovatorId),
]);

export const kanbanCard = pgTable('kanban_card', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  judul: text('judul').notNull(),
  deskripsi: text('deskripsi'),
  sprintNumber: integer('sprint_number'),
  tahap: text('tahap').notNull().default('umum'), // 'innovation_setup' | 'customer_validation' | 'market_validation' | 'umum'
  statusKolom: text('status_kolom').notNull().default('To Do'),
  ownerAnggotaId: uuid('owner_anggota_id').references(() => anggotaTim.id, { onDelete: 'set null' }),
  tanggalMulai: timestamp('tanggal_mulai', { withTimezone: true }),
  tanggalSelesai: timestamp('tanggal_selesai', { withTimezone: true }),
  acceptanceCriteria: text('acceptance_criteria'),
  dependencyRisiko: text('dependency_risiko'),
  urutan: integer('urutan').notNull().default(0),
  label: text('label'), // e.g. 'Backlog Charter', 'SME Review', 'MVP Task', etc.
  reviewStatus: text('review_status').notNull().default('adopted'), // 'ai_reference' | 'adopted'
  estimasiJam: integer('estimasi_jam'), // estimasi jam kerja untuk kartu ini (nullable)
  suggestedSprintNumber: integer('suggested_sprint_number'), // sprint yang disarankan dari analisa proposal / heuristik
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('kanban_card_tim_idx').on(t.timInovatorId),
  index('kanban_card_tahap_idx').on(t.tahap),
]);

export const taskAttachment = pgTable('task_attachment', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => kanbanCard.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  source: text('source').notNull().default('upload'), // 'upload' | 'proposal_dossier'
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('task_attachment_task_idx').on(t.taskId),
  index('task_attachment_source_idx').on(t.source),
]);

export const taskLink = pgTable('task_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => kanbanCard.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  label: text('label'),
  addedBy: uuid('added_by').references(() => users.id, { onDelete: 'set null' }),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('task_link_task_idx').on(t.taskId),
]);

export const teamMemberCapacity = pgTable('team_member_capacity', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  anggotaTimId: uuid('anggota_tim_id').notNull().references(() => anggotaTim.id, { onDelete: 'cascade' }),
  sprintNumber: integer('sprint_number').notNull(),
  kapasitasJam: integer('kapasitas_jam').notNull().default(80),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('tmc_anggota_sprint_unique').on(t.anggotaTimId, t.sprintNumber),
  index('tmc_tim_sprint_idx').on(t.timInovatorId, t.sprintNumber),
]);

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP D — CUSTOMER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export const customerValidationPlan = pgTable('customer_validation_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }).unique(),
  projectMission: text('project_mission'),
  customerDanContext: text('customer_dan_context'),
  problemHypothesis: text('problem_hypothesis'),
  hmw: text('hmw'),
  solutionHypothesis: text('solution_hypothesis'),
  prototypeType: text('prototype_type'),
  fiturAlurDiuji: text('fitur_alur_diuji'),
  skenarioUserTesting: text('skenario_user_testing'),
  instrumenValidasi: text('instrumen_validasi'),
  dataDukung: jsonb('data_dukung').notNull().default(sql`'[]'`), // string[] URLs or file names
  targetEarlyAdopters: text('target_early_adopters'),
  kriteriaSeleksi: text('kriteria_seleksi'),
  jumlahTargetResponden: integer('jumlah_target_responden').default(10),
  lokasiChannelTesting: text('lokasi_channel_testing'),
  metodeRekrutmen: text('metode_rekrutmen'),
  etikaPersetujuanData: text('etika_persetujuan_data'),
  ttdDisusun: jsonb('ttd_disusun'),
  ttdDiperiksa: jsonb('ttd_diperiksa'),
  ttdDisetujui: jsonb('ttd_disetujui'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customerValidationDimensiFeedback = pgTable('customer_validation_dimensi_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => customerValidationPlan.id, { onDelete: 'cascade' }),
  dimensi: text('dimensi').notNull(), // 'usability' | 'functionality' | 'solvability' | 'payability' | 'others'
  evidenceYangDikumpulkan: text('evidence_yang_dikumpulkan'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rencanaValidasiMetrik = pgTable('rencana_validasi_metrik', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull(), // can link to customerValidationPlan or marketValidationPlan
  fase: text('fase').notNull().default('customer_validation'), // 'customer_validation' | 'market_validation'
  validasi: text('validasi').notNull(), // 'desirability' | 'feasibility' | 'viability'
  metrik: text('metrik').notNull(),
  unitUkuran: text('unit_ukuran'),
  kriteriaKesuksesan: text('kriteria_kesuksesan'),
  caraPengukuran: text('cara_pengukuran'),
  catatan: text('catatan'),
  baseline: text('baseline'),
  target: text('target'),
  threshold: text('threshold'),
  pic: text('pic'),
  evidence: text('evidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customerValidationReport = pgTable('customer_validation_report', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => customerValidationPlan.id, { onDelete: 'cascade' }).unique(),
  validatedSolution: text('validated_solution'),
  valueProposition: text('value_proposition'),
  fiturKunci1: text('fitur_kunci_1'),
  fiturKunci2: text('fitur_kunci_2'),
  fiturKunci3: text('fitur_kunci_3'),
  flowSolusi: text('flow_solusi'),
  prototypeSolusiLink: text('prototype_solusi_link'),
  mekanismeUserTesting: text('mekanisme_user_testing'),
  jumlahRespondenAktual: integer('jumlah_responden_aktual'),
  profilRespondenAktual: text('profil_responden_aktual'),
  tanggalLokasiTesting: text('tanggal_lokasi_testing'),
  kesimpulan: text('kesimpulan'),
  ketercapaianPsf: text('ketercapaian_psf'), // 'tercapai' | 'tercapai_dengan_catatan' | 'belum_tercapai'
  keputusan: text('keputusan'), // 'lanjut' | 'iterasi' | 'hold' | 'stop'
  catatanMvpPlanning: text('catatan_mvp_planning'),
  buktiPendukung: jsonb('bukti_pendukung').notNull().default(sql`'[]'`),
  ttdDisusun: jsonb('ttd_disusun'),
  ttdDiperiksa: jsonb('ttd_diperiksa'),
  ttdDisetujui: jsonb('ttd_disetujui'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customerTestingFeedbackResponden = pgTable('customer_testing_feedback_responden', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => customerValidationReport.id, { onDelete: 'cascade' }),
  respondenProfil: text('responden_profil').notNull(),
  usabilitySkorFeedback: text('usability_skor_feedback'),
  functionalitySkorFeedback: text('functionality_skor_feedback'),
  solvabilitySkorFeedback: text('solvability_skor_feedback'),
  payabilitySkorFeedback: text('payability_skor_feedback'),
  others: text('others'),
  priorityInsightAction: text('priority_insight_action'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customerValidationTemuanKualitatif = pgTable('customer_validation_temuan_kualitatif', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => customerValidationReport.id, { onDelete: 'cascade' }),
  kategori: text('kategori').notNull(),
  pertanyaanKunci: text('pertanyaan_kunci').notNull(),
  temuanUtama: text('temuan_utama').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const hasilValidasiMetrik = pgTable('hasil_validasi_metrik', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull(), // can link to customerValidationReport or marketValidationReport
  fase: text('fase').notNull().default('customer_validation'), // 'customer_validation' | 'market_validation'
  validasi: text('validasi').notNull(), // 'desirability' | 'feasibility' | 'viability'
  metrik: text('metrik').notNull(),
  target: text('target'),
  hasilAktual: text('hasil_aktual'),
  interpretasi: text('interpretasi'),
  learning: text('learning'),
  enhancement: text('enhancement'),
  persenTercapai: doublePrecision('persen_tercapai'),
  status: text('status'), // 'lolos' | 'belum' | 'iterasi'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP E — MARKET VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export const marketValidationPlan = pgTable('market_validation_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }).unique(),
  hasilCustomerValidationRingkasan: text('hasil_customer_validation_ringkasan'),
  deskripsiMvp: text('deskripsi_mvp'),
  mvpVersion: text('mvp_version').default('v1.0'),
  fiturMvpDirilis: text('fitur_mvp_dirilis'),
  channelRelease: text('channel_release'),
  periodeReleaseMulai: timestamp('periode_release_mulai', { withTimezone: true }),
  periodeReleaseSelesai: timestamp('periode_release_selesai', { withTimezone: true }),
  deskripsiProsesMvp: text('deskripsi_proses_mvp'),
  dataDukungMvp: jsonb('data_dukung_mvp').notNull().default(sql`'[]'`),
  targetEarlyAdopters: text('target_early_adopters'),
  lokasiPilot: text('lokasi_pilot'),
  daftarEarlyAdopters: text('daftar_early_adopters'),
  jumlahTargetPengguna: integer('jumlah_target_pengguna'),
  batasanScopeMvp: text('batasan_scope_mvp'),
  ttdDisusun: jsonb('ttd_disusun'),
  ttdDiperiksa: jsonb('ttd_diperiksa'),
  ttdDisetujui: jsonb('ttd_disetujui'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mvpMappingFitur = pgTable('mvp_mapping_fitur', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => marketValidationPlan.id, { onDelete: 'cascade' }),
  solusiTervalidasi: text('solusi_tervalidasi'),
  fiturSolusi: text('fitur_solusi').notNull(),
  benefit: text('benefit'),
  fiturMvpStatus: text('fitur_mvp_status').notNull().default('dirilis'), // 'dirilis' | 'ditunda'
  acceptanceCriteriaEvidence: text('acceptance_criteria_evidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mvpResourcesNeeded = pgTable('mvp_resources_needed', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => marketValidationPlan.id, { onDelete: 'cascade' }),
  jenisResource: text('jenis_resource').notNull(), // 'people_sme' | 'system_technology' | 'data_access' | 'budget_procurement' | 'operational_support'
  kebutuhanSpesifik: text('kebutuhan_spesifik').notNull(),
  ownerSumber: text('owner_sumber'),
  statusKetersediaan: text('status_ketersediaan'),
  gapTindakLanjut: text('gap_tindak_lanjut'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const marketValidationReport = pgTable('market_validation_report', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => marketValidationPlan.id, { onDelete: 'cascade' }).unique(),
  mvpVersionDilaporkan: text('mvp_version_dilaporkan'),
  periodeRilisMulai: timestamp('periode_rilis_mulai', { withTimezone: true }),
  periodeRilisSelesai: timestamp('periode_rilis_selesai', { withTimezone: true }),
  lokasiChannelRilis: text('lokasi_channel_rilis'),
  jumlahEarlyAdoptersAktual: integer('jumlah_early_adopters_aktual'),
  ringkasanAktivitasRilis: text('ringkasan_aktivitas_rilis'),
  kendalaUtama: text('kendala_utama'),
  perubahanDariPlan: text('perubahan_dari_plan'),
  kesimpulanPmf: text('kesimpulan_pmf'),
  keputusanGoNogo: text('keputusan_go_nogo'), // 'go_ke_fmi' | 'iterasi_mvp' | 'hold' | 'stop'
  rekomendasiIterasi: text('rekomendasi_iterasi'),
  rencanaMvpBerikutnya: text('rencana_mvp_berikutnya'),
  rekomendasiPromotorSponsor: text('rekomendasi_promotor_sponsor'),
  buktiPendukung: jsonb('bukti_pendukung').notNull().default(sql`'[]'`),
  ttdDisusun: jsonb('ttd_disusun'),
  ttdDiperiksa: jsonb('ttd_diperiksa'),
  ttdDisetujui: jsonb('ttd_disetujui'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mvReleaseLog = pgTable('mv_release_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => marketValidationReport.id, { onDelete: 'cascade' }),
  tanggal: timestamp('tanggal', { withTimezone: true }).notNull().defaultNow(),
  aktivitas: text('aktivitas').notNull(),
  output: text('output'),
  dataEvidence: text('data_evidence'),
  pic: text('pic'),
  catatan: text('catatan'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mvSprintReviewOutcome = pgTable('mv_sprint_review_outcome', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => marketValidationReport.id, { onDelete: 'cascade' }),
  sprintNumber: integer('sprint_number').notNull(),
  tanggal: timestamp('tanggal', { withTimezone: true }).notNull().defaultNow(),
  demo: text('demo'),
  feedback: text('feedback'),
  value: text('value'),
  learning: text('learning'),
  questions: text('questions'),
  evidence: text('evidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mvSprintReviewBacklog = pgTable('mv_sprint_review_backlog', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => marketValidationReport.id, { onDelete: 'cascade' }),
  sprintNumber: integer('sprint_number').notNull(),
  tanggal: timestamp('tanggal', { withTimezone: true }).notNull().defaultNow(),
  backlogDiverifikasi: text('backlog_diverifikasi').notNull(),
  status: text('status').notNull().default('done'), // 'done' | 'partial' | 'not_done'
  backlogDimodifikasi: text('backlog_dimodifikasi'),
  modification: text('modification'),
  backlogBaru: text('backlog_baru'),
  ownerNextSprint: text('owner_next_sprint'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mvSprintRetrospective = pgTable('mv_sprint_retrospective', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => marketValidationReport.id, { onDelete: 'cascade' }),
  sprintNumber: integer('sprint_number').notNull(),
  tanggal: timestamp('tanggal', { withTimezone: true }).notNull().defaultNow(),
  continueAction: text('continue'),
  stopAction: text('stop'),
  startAction: text('start'),
  ownerTargetSprint: text('owner_target_sprint'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dfvRekapitulasi = pgTable('dfv_rekapitulasi', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => marketValidationReport.id, { onDelete: 'cascade' }),
  kategoriDfv: text('kategori_dfv').notNull(), // 'desirability' | 'feasibility' | 'viability'
  rataRataKetercapaian: doublePrecision('rata_rata_ketercapaian').notNull(),
  threshold: doublePrecision('threshold').notNull().default(70.0),
  status: text('status').notNull().default('lolos'), // 'lolos' | 'belum'
  catatanKeputusan: text('catatan_keputusan'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP F — KEUANGAN (RAB & LPJ)
// ═══════════════════════════════════════════════════════════════════════════════

export const anggaranPengajuan = pgTable('anggaran_pengajuan', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  fase: text('fase').notNull(), // 'customer_validation' | 'market_validation'
  nominalDiajukan: doublePrecision('nominal_diajukan').notNull(), // max Rp 20.000.000
  fileDokumenUrl: text('file_dokumen_url'),
  tanggalPengajuan: timestamp('tanggal_pengajuan', { withTimezone: true }).notNull().defaultNow(),
  status: text('status').notNull().default('diajukan'), // 'diajukan' | 'dinilai' | 'diotorisasi' | 'ditolak'
  catatanPenilaian: text('catatan_penilaian'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('anggaran_tim_idx').on(t.timInovatorId),
]);

export const lpj = pgTable('lpj', {
  id: uuid('id').primaryKey().defaultRandom(),
  anggaranPengajuanId: uuid('anggaran_pengajuan_id').notNull().references(() => anggaranPengajuan.id, { onDelete: 'cascade' }).unique(),
  fileDokumenUrl: text('file_dokumen_url'),
  buktiElektronikUrl: text('bukti_elektronik_url'),
  tanggalKegiatanSelesai: timestamp('tanggal_kegiatan_selesai', { withTimezone: true }),
  tanggalKirim: timestamp('tanggal_kirim', { withTimezone: true }).notNull().defaultNow(),
  batasKirim: timestamp('batas_kirim', { withTimezone: true }), // computed: tanggal_kegiatan_selesai + 10 hari kerja
  status: text('status').notNull().default('dikirim'), // 'dikirim' | 'disetujui' | 'terlambat'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP G — GOVERNANCE & HASIL AKHIR
// ═══════════════════════════════════════════════════════════════════════════════

export const forumManajemenInovasi = pgTable('forum_manajemen_inovasi', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  tanggal: timestamp('tanggal', { withTimezone: true }).notNull().defaultNow(),
  keputusanAkhir: text('keputusan_akhir').notNull(), // 'lanjut' | 'iterasi' | 'dihentikan' | 'diadopsi'
  catatanNotulensi: text('catatan_notulensi'),
  diinputOleh: text('diinput_oleh'),
  tanggalInput: timestamp('tanggal_input', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const penghargaan = pgTable('penghargaan', {
  id: uuid('id').primaryKey().defaultRandom(),
  timInovatorId: uuid('tim_inovator_id').notNull().references(() => timInovator.id, { onDelete: 'cascade' }),
  kategori: text('kategori').notNull(), // 'inovasi_terimplementasi' | 'inovasi_siap_implementasi'
  jenisHadiah: text('jenis_hadiah'),
  komposisiAnggotaFinal: jsonb('komposisi_anggota_final').notNull().default(sql`'[]'`),
  tanggal: timestamp('tanggal', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUP H — RBAC & USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(), // Linked to Supabase Auth user.id
  nama: text('nama').notNull(),
  email: text('email').notNull().unique(),
  statusAktif: boolean('status_aktif').notNull().default(true),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  kodeRole: text('kode_role').notNull().unique(), // 'admin_ic' | 'sponsor' | 'promotor' | 'project_owner' | 'inisiator' | 'co_creator' | 'coach' | 'sme'
  namaRole: text('nama_role').notNull(),
  deskripsi: text('deskripsi'),
  scope: text('scope').notNull().default('per_tim'), // 'global' | 'per_tim'
  isDefault: boolean('is_default').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  kodePermission: text('kode_permission').notNull().unique(), // e.g. 'charter.edit', 'kanban.create', 'anggaran.approve'
  modul: text('modul').notNull(), // 'kelola_user' | 'tim_inovator' | 'charter' | 'kanban' | 'customer_validation' | 'market_validation' | 'rab_lpj' | 'fmi' | 'dossier'
  deskripsi: text('deskripsi'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  diizinkan: boolean('diizinkan').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('role_permission_unique').on(t.roleId, t.permissionId),
]);

export const userRoleTim = pgTable('user_role_tim', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  timInovatorId: uuid('tim_inovator_id').references(() => timInovator.id, { onDelete: 'cascade' }), // nullable for global roles
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('user_role_tim_unique').on(t.userId, t.roleId, t.timInovatorId),
  index('user_role_tim_user_idx').on(t.userId),
  index('user_role_tim_tim_idx').on(t.timInovatorId),
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const taskDismissal = pgTable('task_dismissal', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskType: text('task_type').notNull(),
  entityId: text('entity_id').notNull(),
  dismissedAt: timestamp('dismissed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('task_dismissal_user_task_entity_unique').on(t.userId, t.taskType, t.entityId),
  index('task_dismissal_user_idx').on(t.userId),
]);

