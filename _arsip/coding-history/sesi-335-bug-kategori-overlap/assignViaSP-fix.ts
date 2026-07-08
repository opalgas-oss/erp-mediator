// ─── FUNGSI: assignViaSP ──────────────────────────────────────────────────────
/**
 * Assign kategori ke tenant via SP sp_assign_category_to_tenant.
 * SP menangani konflik dengan cek overlap area (S#335 BUG-KATEGORI-OVERLAP).
 *
 * S#335: teruskan coverage_area_entries sebagai p_city_entries (JSONB) ke SP.
 * SP akan cek 4 skenario overlap area sebelum insert.
 * Jika coverage_area_entries tidak ada, SP fallback ke guard global (backward compat).
 *
 * FIX S#335b: kirim array JS langsung (bukan JSON.stringify) — Supabase client
 * yang handle serialisasi ke JSONB. JSON.stringify menghasilkan text scalar
 * yang menyebabkan error "cannot get array length of a scalar" di PostgreSQL.
 */
export async function assignViaSP(
  payload: AssignKategoriPayload,
  assignedBy: string
): Promise<{ ok: boolean; assignmentId?: string; error?: string }> {
  const db = createServerSupabaseClient()

  // S#335: bangun p_city_entries dari coverage_area_entries payload
  // Kirim sebagai array JS langsung — JANGAN JSON.stringify
  // Supabase client akan serialisasi ke JSONB secara otomatis
  const cityEntries = payload.coverage_area_entries && payload.coverage_area_entries.length > 0
    ? payload.coverage_area_entries.map(e => ({
        province_id: e.province_id,
        city_id:     e.city_id ?? null,
      }))
    : null

  const { data, error } = await db.rpc('sp_assign_category_to_tenant', {
    p_tenant_id:           payload.tenant_id,
    p_category_id:         payload.category_id,
    p_commission_override: payload.commission_override ?? null,
    p_coverage_areas:      null,        // S#327 F-03: selalu NULL — data real di assignment_coverage_areas
    p_sla_minutes:         payload.sla_minutes ?? null,
    p_assigned_by:         assignedBy,
    p_city_entries:        cityEntries, // S#335: overlap check per area
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, assignmentId: data as string }
}