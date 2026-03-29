// lib/getTenantConfig.ts
// WAJIB dipakai oleh semua modul — jangan pernah hardcode nilai konfigurasi
 
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
 
// Tipe data konfigurasi tenant (membantu autocomplete kode)
export interface TenantConfig {
  tenant_id: string;
  brand: {
    name: string;
    tagline: string;
    primary_color: string;
    logo_url: string;
  };
  commission: {
    percentage: number;
    minimum_amount: number;
    charged_to: 'vendor' | 'customer';
  };
  timers: {
    t1_minutes: number;
    t2_minutes: number;
    t3_minutes: number;
  };
  wa_templates: Record<string, string>;
  is_active: boolean;
}
 
// Fungsi utama — ambil config tenant dari Firestore
export async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  // Validasi — tenant_id tidak boleh kosong
  if (!tenantId) {
    throw new Error('tenant_id wajib diisi');
  }
 
  const configRef = doc(db, 'tenants', tenantId, 'config', 'main');
  const configSnap = await getDoc(configRef);
 
  if (!configSnap.exists()) {
    throw new Error(`Tenant '${tenantId}' tidak ditemukan`);
  }
 
  return configSnap.data() as TenantConfig;
}
 
// CONTOH PENGGUNAAN di modul lain:
// const config = await getTenantConfig(tenantId);
// const komisiMin = config.commission.minimum_amount; // dari DB
// const timerT1  = config.timers.t1_minutes;         // dari DB
// SEMUA nilai dari DB — tidak ada yang hardcode!