CREATE TABLE "anggaran_pengajuan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"fase" text NOT NULL,
	"nominal_diajukan" double precision NOT NULL,
	"file_dokumen_url" text,
	"tanggal_pengajuan" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'diajukan' NOT NULL,
	"catatan_penilaian" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anggota_tim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"jabatan" text NOT NULL,
	"unit_kerja" text NOT NULL,
	"komitmen_dukungan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_name" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"project_mission" text,
	"customer_early_adopters" text,
	"context_area_bantuan" text,
	"problem_worth_solving" text,
	"hmw" text,
	"opportunity_statement" text,
	"business_opportunity" text,
	"solusi_awal" text,
	"desirability_hypothesis" text,
	"feasibility_hypothesis" text,
	"viability_hypothesis" text,
	"link_proposal" text,
	"ritme_kerja" text,
	"pacing_monitoring" text,
	"kebutuhan_dukungan" text,
	"risiko_awal" text,
	"ttd_disusun" jsonb,
	"ttd_diperiksa" jsonb,
	"ttd_disetujui" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charter_tim_inovator_id_unique" UNIQUE("tim_inovator_id")
);
--> statement-breakpoint
CREATE TABLE "customer_testing_feedback_responden" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"responden_profil" text NOT NULL,
	"usability_skor_feedback" text,
	"functionality_skor_feedback" text,
	"solvability_skor_feedback" text,
	"payability_skor_feedback" text,
	"others" text,
	"priority_insight_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_validation_dimensi_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"dimensi" text NOT NULL,
	"evidence_yang_dikumpulkan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_validation_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"project_mission" text,
	"customer_dan_context" text,
	"problem_hypothesis" text,
	"hmw" text,
	"solution_hypothesis" text,
	"prototype_type" text,
	"fitur_alur_diuji" text,
	"skenario_user_testing" text,
	"instrumen_validasi" text,
	"data_dukung" jsonb DEFAULT '[]' NOT NULL,
	"target_early_adopters" text,
	"kriteria_seleksi" text,
	"jumlah_target_responden" integer DEFAULT 10,
	"lokasi_channel_testing" text,
	"metode_rekrutmen" text,
	"etika_persetujuan_data" text,
	"ttd_disusun" jsonb,
	"ttd_diperiksa" jsonb,
	"ttd_disetujui" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_validation_plan_tim_inovator_id_unique" UNIQUE("tim_inovator_id")
);
--> statement-breakpoint
CREATE TABLE "customer_validation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"validated_solution" text,
	"value_proposition" text,
	"fitur_kunci_1" text,
	"fitur_kunci_2" text,
	"fitur_kunci_3" text,
	"flow_solusi" text,
	"prototype_solusi_link" text,
	"mekanisme_user_testing" text,
	"jumlah_responden_aktual" integer,
	"profil_responden_aktual" text,
	"tanggal_lokasi_testing" text,
	"kesimpulan" text,
	"ketercapaian_psf" text,
	"keputusan" text,
	"catatan_mvp_planning" text,
	"bukti_pendukung" jsonb DEFAULT '[]' NOT NULL,
	"ttd_disusun" jsonb,
	"ttd_diperiksa" jsonb,
	"ttd_disetujui" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_validation_report_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "customer_validation_temuan_kualitatif" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"kategori" text NOT NULL,
	"pertanyaan_kunci" text NOT NULL,
	"temuan_utama" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dfv_rekapitulasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"kategori_dfv" text NOT NULL,
	"rata_rata_ketercapaian" double precision NOT NULL,
	"threshold" double precision DEFAULT 70 NOT NULL,
	"status" text DEFAULT 'lolos' NOT NULL,
	"catatan_keputusan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dossier_pia_archive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"proposal_id_asli" text,
	"season_asli" text,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dossier_pia_archive_tim_inovator_id_unique" UNIQUE("tim_inovator_id")
);
--> statement-breakpoint
CREATE TABLE "durasi_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"durasi_lama" integer NOT NULL,
	"durasi_baru" integer NOT NULL,
	"alasan" text NOT NULL,
	"diubah_oleh" text,
	"tanggal_perubahan" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_manajemen_inovasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL,
	"keputusan_akhir" text NOT NULL,
	"catatan_notulensi" text,
	"diinput_oleh" text,
	"tanggal_input" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hasil_validasi_metrik" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"fase" text DEFAULT 'customer_validation' NOT NULL,
	"validasi" text NOT NULL,
	"metrik" text NOT NULL,
	"target" text,
	"hasil_aktual" text,
	"interpretasi" text,
	"learning" text,
	"enhancement" text,
	"persen_tercapai" double precision,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text,
	"sprint_number" integer,
	"tahap" text DEFAULT 'umum' NOT NULL,
	"status_kolom" text DEFAULT 'To Do' NOT NULL,
	"owner_anggota_id" uuid,
	"tanggal_mulai" timestamp with time zone,
	"tanggal_selesai" timestamp with time zone,
	"acceptance_criteria" text,
	"dependency_risiko" text,
	"urutan" integer DEFAULT 0 NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_column" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"nama_kolom" text NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lpj" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anggaran_pengajuan_id" uuid NOT NULL,
	"file_dokumen_url" text,
	"bukti_elektronik_url" text,
	"tanggal_kegiatan_selesai" timestamp with time zone,
	"tanggal_kirim" timestamp with time zone DEFAULT now() NOT NULL,
	"batas_kirim" timestamp with time zone,
	"status" text DEFAULT 'dikirim' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lpj_anggaran_pengajuan_id_unique" UNIQUE("anggaran_pengajuan_id")
);
--> statement-breakpoint
CREATE TABLE "market_validation_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"hasil_customer_validation_ringkasan" text,
	"deskripsi_mvp" text,
	"mvp_version" text DEFAULT 'v1.0',
	"fitur_mvp_dirilis" text,
	"channel_release" text,
	"periode_release_mulai" timestamp with time zone,
	"periode_release_selesai" timestamp with time zone,
	"deskripsi_proses_mvp" text,
	"data_dukung_mvp" jsonb DEFAULT '[]' NOT NULL,
	"target_early_adopters" text,
	"lokasi_pilot" text,
	"daftar_early_adopters" text,
	"jumlah_target_pengguna" integer,
	"batasan_scope_mvp" text,
	"ttd_disusun" jsonb,
	"ttd_diperiksa" jsonb,
	"ttd_disetujui" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_validation_plan_tim_inovator_id_unique" UNIQUE("tim_inovator_id")
);
--> statement-breakpoint
CREATE TABLE "market_validation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"mvp_version_dilaporkan" text,
	"periode_rilis_mulai" timestamp with time zone,
	"periode_rilis_selesai" timestamp with time zone,
	"lokasi_channel_rilis" text,
	"jumlah_early_adopters_aktual" integer,
	"ringkasan_aktivitas_rilis" text,
	"kendala_utama" text,
	"perubahan_dari_plan" text,
	"kesimpulan_pmf" text,
	"keputusan_go_nogo" text,
	"rekomendasi_iterasi" text,
	"rencana_mvp_berikutnya" text,
	"rekomendasi_promotor_sponsor" text,
	"bukti_pendukung" jsonb DEFAULT '[]' NOT NULL,
	"ttd_disusun" jsonb,
	"ttd_diperiksa" jsonb,
	"ttd_disetujui" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_validation_report_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "mv_release_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL,
	"aktivitas" text NOT NULL,
	"output" text,
	"data_evidence" text,
	"pic" text,
	"catatan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mv_sprint_retrospective" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"sprint_number" integer NOT NULL,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL,
	"continue" text,
	"stop" text,
	"start" text,
	"owner_target_sprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mv_sprint_review_backlog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"sprint_number" integer NOT NULL,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL,
	"backlog_diverifikasi" text NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"backlog_dimodifikasi" text,
	"modification" text,
	"backlog_baru" text,
	"owner_next_sprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mv_sprint_review_outcome" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"sprint_number" integer NOT NULL,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL,
	"demo" text,
	"feedback" text,
	"value" text,
	"learning" text,
	"questions" text,
	"evidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mvp_mapping_fitur" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"solusi_tervalidasi" text,
	"fitur_solusi" text NOT NULL,
	"benefit" text,
	"fitur_mvp_status" text DEFAULT 'dirilis' NOT NULL,
	"acceptance_criteria_evidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mvp_resources_needed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"jenis_resource" text NOT NULL,
	"kebutuhan_spesifik" text NOT NULL,
	"owner_sumber" text,
	"status_ketersediaan" text,
	"gap_tindak_lanjut" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penghargaan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tim_inovator_id" uuid NOT NULL,
	"kategori" text NOT NULL,
	"jenis_hadiah" text,
	"komposisi_anggota_final" jsonb DEFAULT '[]' NOT NULL,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode_permission" text NOT NULL,
	"modul" text NOT NULL,
	"deskripsi" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_kode_permission_unique" UNIQUE("kode_permission")
);
--> statement-breakpoint
CREATE TABLE "rencana_validasi_metrik" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"fase" text DEFAULT 'customer_validation' NOT NULL,
	"validasi" text NOT NULL,
	"metrik" text NOT NULL,
	"unit_ukuran" text,
	"kriteria_kesuksesan" text,
	"cara_pengukuran" text,
	"catatan" text,
	"baseline" text,
	"target" text,
	"threshold" text,
	"pic" text,
	"evidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"diizinkan" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode_role" text NOT NULL,
	"nama_role" text NOT NULL,
	"deskripsi" text,
	"scope" text DEFAULT 'per_tim' NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_kode_role_unique" UNIQUE("kode_role")
);
--> statement-breakpoint
CREATE TABLE "tim_inovator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_proyek_inovasi" text NOT NULL,
	"kategori_pia" text NOT NULL,
	"klasifikasi_inovasi" text,
	"status" text DEFAULT 'aktif' NOT NULL,
	"tanggal_mulai" timestamp with time zone,
	"durasi_bulan" integer DEFAULT 3 NOT NULL,
	"tanggal_berakhir" timestamp with time zone,
	"proposal_id_asli" text,
	"season_asli" text DEFAULT 'Season 12 - 2026',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role_tim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"tim_inovator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"status_aktif" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "anggaran_pengajuan" ADD CONSTRAINT "anggaran_pengajuan_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anggota_tim" ADD CONSTRAINT "anggota_tim_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charter" ADD CONSTRAINT "charter_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_testing_feedback_responden" ADD CONSTRAINT "customer_testing_feedback_responden_report_id_customer_validation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."customer_validation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_validation_dimensi_feedback" ADD CONSTRAINT "customer_validation_dimensi_feedback_plan_id_customer_validation_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."customer_validation_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_validation_plan" ADD CONSTRAINT "customer_validation_plan_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_validation_report" ADD CONSTRAINT "customer_validation_report_plan_id_customer_validation_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."customer_validation_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_validation_temuan_kualitatif" ADD CONSTRAINT "customer_validation_temuan_kualitatif_report_id_customer_validation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."customer_validation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dfv_rekapitulasi" ADD CONSTRAINT "dfv_rekapitulasi_report_id_market_validation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."market_validation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_pia_archive" ADD CONSTRAINT "dossier_pia_archive_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "durasi_log" ADD CONSTRAINT "durasi_log_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_manajemen_inovasi" ADD CONSTRAINT "forum_manajemen_inovasi_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_card" ADD CONSTRAINT "kanban_card_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_card" ADD CONSTRAINT "kanban_card_owner_anggota_id_anggota_tim_id_fk" FOREIGN KEY ("owner_anggota_id") REFERENCES "public"."anggota_tim"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_column" ADD CONSTRAINT "kanban_column_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lpj" ADD CONSTRAINT "lpj_anggaran_pengajuan_id_anggaran_pengajuan_id_fk" FOREIGN KEY ("anggaran_pengajuan_id") REFERENCES "public"."anggaran_pengajuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_validation_plan" ADD CONSTRAINT "market_validation_plan_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_validation_report" ADD CONSTRAINT "market_validation_report_plan_id_market_validation_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."market_validation_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mv_release_log" ADD CONSTRAINT "mv_release_log_report_id_market_validation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."market_validation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mv_sprint_retrospective" ADD CONSTRAINT "mv_sprint_retrospective_report_id_market_validation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."market_validation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mv_sprint_review_backlog" ADD CONSTRAINT "mv_sprint_review_backlog_report_id_market_validation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."market_validation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mv_sprint_review_outcome" ADD CONSTRAINT "mv_sprint_review_outcome_report_id_market_validation_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."market_validation_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mvp_mapping_fitur" ADD CONSTRAINT "mvp_mapping_fitur_plan_id_market_validation_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."market_validation_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mvp_resources_needed" ADD CONSTRAINT "mvp_resources_needed_plan_id_market_validation_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."market_validation_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penghargaan" ADD CONSTRAINT "penghargaan_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_tim" ADD CONSTRAINT "user_role_tim_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_tim" ADD CONSTRAINT "user_role_tim_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_tim" ADD CONSTRAINT "user_role_tim_tim_inovator_id_tim_inovator_id_fk" FOREIGN KEY ("tim_inovator_id") REFERENCES "public"."tim_inovator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anggaran_tim_idx" ON "anggaran_pengajuan" USING btree ("tim_inovator_id");--> statement-breakpoint
CREATE INDEX "anggota_tim_inovator_idx" ON "anggota_tim" USING btree ("tim_inovator_id");--> statement-breakpoint
CREATE INDEX "kanban_card_tim_idx" ON "kanban_card" USING btree ("tim_inovator_id");--> statement-breakpoint
CREATE INDEX "kanban_card_tahap_idx" ON "kanban_card" USING btree ("tahap");--> statement-breakpoint
CREATE INDEX "kanban_column_tim_idx" ON "kanban_column" USING btree ("tim_inovator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permission_unique" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_tim_unique" ON "user_role_tim" USING btree ("user_id","role_id","tim_inovator_id");--> statement-breakpoint
CREATE INDEX "user_role_tim_user_idx" ON "user_role_tim" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_tim_tim_idx" ON "user_role_tim" USING btree ("tim_inovator_id");