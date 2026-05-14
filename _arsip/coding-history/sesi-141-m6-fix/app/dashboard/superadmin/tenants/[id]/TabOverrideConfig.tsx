'use client'

// app/dashboard/superadmin/tenants/[id]/TabOverrideConfig.tsx
// Tab Override Config — placeholder
// CATATAN: Implementasi penuh terintegrasi dengan config_registry (M1).

interface Props { tenantId: string }

export function TabOverrideConfig({ tenantId: _tenantId }: Props) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-md border p-4">
        <h3 className="font-medium text-sm mb-2">Override Konfigurasi Tenant</h3>
        <p className="text-sm text-muted-foreground">
          Konfigurasi ini memungkinkan SuperAdmin memberi izin tenant untuk meng-override
          nilai konfigurasi platform tertentu (misalnya: OTP settings, payment settings).
        </p>
      </div>

      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium mb-1">Override Config</p>
        <p>Fitur override config per tenant akan tersedia setelah integrasi penuh dengan M1 Config Registry selesai.</p>
        <p className="mt-2 text-xs">Saat ini semua konfigurasi menggunakan nilai platform default (INHERITED).</p>
      </div>
    </div>
  )
}
