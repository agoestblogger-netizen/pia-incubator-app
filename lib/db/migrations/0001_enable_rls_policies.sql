-- =============================================================================
-- PIA INCUBATOR APP — ROW LEVEL SECURITY (RLS) MIGRATION
-- =============================================================================

-- 1. Enable RLS on all 34 tables
ALTER TABLE "tim_inovator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anggota_tim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "durasi_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dossier_pia_archive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "charter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kanban_column" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kanban_card" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_validation_plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_validation_dimensi_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rencana_validasi_metrik" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_validation_report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_testing_feedback_responden" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_validation_temuan_kualitatif" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hasil_validasi_metrik" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_validation_plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mvp_mapping_fitur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mvp_resources_needed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_validation_report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mv_release_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mv_sprint_review_outcome" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mv_sprint_review_backlog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mv_sprint_retrospective" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dfv_rekapitulasi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anggaran_pengajuan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lpj" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "forum_manajemen_inovasi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "penghargaan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_role_tim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if current auth user is Admin Innovation Center
CREATE OR REPLACE FUNCTION is_admin_ic()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role_tim urt
    JOIN roles r ON urt.role_id = r.id
    WHERE urt.user_id = auth.uid() AND r.kode_role = 'admin_ic'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper function to check if current auth user has access to a specific team
CREATE OR REPLACE FUNCTION user_has_team_access(team_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN is_admin_ic() OR EXISTS (
    SELECT 1 FROM user_role_tim
    WHERE user_id = auth.uid() AND tim_inovator_id = team_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Basic RLS Policies for Authenticated Users

-- Users & Roles (Read for authenticated, manage for admin)
CREATE POLICY "users_read_authenticated" ON "users" FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_read_authenticated" ON "roles" FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_read_authenticated" ON "permissions" FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_read_authenticated" ON "role_permissions" FOR SELECT TO authenticated USING (true);

-- Team Inovator
CREATE POLICY "tim_inovator_select" ON "tim_inovator" FOR SELECT TO authenticated USING (user_has_team_access(id));
CREATE POLICY "tim_inovator_all_admin" ON "tim_inovator" FOR ALL TO authenticated USING (is_admin_ic());

-- Charter & Kanban
CREATE POLICY "charter_select" ON "charter" FOR SELECT TO authenticated USING (user_has_team_access(tim_inovator_id));
CREATE POLICY "kanban_card_select" ON "kanban_card" FOR SELECT TO authenticated USING (user_has_team_access(tim_inovator_id));
CREATE POLICY "kanban_column_select" ON "kanban_column" FOR SELECT TO authenticated USING (user_has_team_access(tim_inovator_id));

-- Customer & Market Validation
CREATE POLICY "cust_val_plan_select" ON "customer_validation_plan" FOR SELECT TO authenticated USING (user_has_team_access(tim_inovator_id));
CREATE POLICY "market_val_plan_select" ON "market_validation_plan" FOR SELECT TO authenticated USING (user_has_team_access(tim_inovator_id));

-- Keuangan & FMI
CREATE POLICY "anggaran_select" ON "anggaran_pengajuan" FOR SELECT TO authenticated USING (user_has_team_access(tim_inovator_id));
CREATE POLICY "fmi_select" ON "forum_manajemen_inovasi" FOR SELECT TO authenticated USING (user_has_team_access(tim_inovator_id));

-- Audit Logs (Admin only)
CREATE POLICY "audit_logs_admin_only" ON "audit_logs" FOR SELECT TO authenticated USING (is_admin_ic());
