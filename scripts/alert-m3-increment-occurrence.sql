-- =============================================================================
-- Migration: fn_increment_alert_occurrence
-- Dibuat  : Sesi #333 — M3 Deduplication Alert Monitoring
-- Tujuan  : Atomic increment occurrence_count + update last_occurred_at
--           di tabel alert_log saat dedup_key match (provider masih DOWN/SLOW).
--           Dipakai oleh: lib/repositories/alert-log.repository.ts → incrementAlertOccurrence()
--
-- Alasan RPC (bukan JS update):
--   Supabase JS tidak support `kolom = kolom + 1` via .update().
--   RPC PostgreSQL menjamin atomic — tidak ada race condition
--   meski cron collectL1Metrics jalan parallel (Promise.allSettled).
--   Pattern sama dengan sp_increment_lock_count (account-lock.repository).
--
-- Parameter:
--   p_alert_log_id    UUID — ID baris alert_log yang akan di-increment
--   p_last_occurred_at TIMESTAMPTZ — waktu kejadian terakhir (NOW() dari caller)
--
-- Return: void
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_increment_alert_occurrence(
  p_alert_log_id     UUID,
  p_last_occurred_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE alert_log
  SET
    occurrence_count   = occurrence_count + 1,
    last_occurred_at   = p_last_occurred_at,
    updated_at         = NOW()
  WHERE id = p_alert_log_id;

  -- Jika baris tidak ditemukan (sudah AUTO_RESOLVED atau dihapus),
  -- tidak throw error — caller tidak perlu tahu, cron tetap jalan.
  IF NOT FOUND THEN
    RAISE WARNING 'fn_increment_alert_occurrence: alert_log id % tidak ditemukan, skip.', p_alert_log_id;
  END IF;
END;
$$;

-- Grant execute ke service_role (dipakai server-side via createServerSupabaseClient)
GRANT EXECUTE ON FUNCTION public.fn_increment_alert_occurrence(UUID, TIMESTAMPTZ) TO service_role;

-- =============================================================================
-- CARA EKSEKUSI:
-- Jalankan via MCP Supabase (apply_migration) atau Supabase SQL Editor.
-- Verifikasi: \df public.fn_increment_alert_occurrence
-- =============================================================================
