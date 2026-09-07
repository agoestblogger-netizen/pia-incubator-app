-- =============================================================================
-- PIA INCUBATOR APP — ADD estimated_minutes TO kanban_card
-- -----------------------------------------------------------------------------
-- Dekouples "Estimasi Waktu (menit)" dari story_point sehingga pengguna dapat
-- mengetik nilai menit yang presisi (mis. 45, 90, 480) tanpa dibulatkan ke
-- kelipatan 60 oleh story_point.
-- Diterapkan langsung ke shared Neon DB (single DB source Vercel + Coolify).
-- =============================================================================

ALTER TABLE public.kanban_card ADD COLUMN IF NOT EXISTS estimated_minutes integer;

-- Backfill nilai dari story_point (menit = SP * 60) untuk kartu eksisting
UPDATE public.kanban_card
SET estimated_minutes = GREATEST(1, COALESCE(story_point, 1) * 60)
WHERE estimated_minutes IS NULL AND story_point IS NOT NULL;
