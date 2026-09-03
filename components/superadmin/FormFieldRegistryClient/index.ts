// components/superadmin/FormFieldRegistryClient/index.ts
// MASTER folder `FormFieldRegistryClient/` - ATURAN 50.5: tiap folder hasil pemecahan
//   WAJIB punya MASTER berisi navigasi saja, NOL isi.
// Ia juga yang membuat jalur impor lama tetap sah:
//   `@/components/superadmin/FormFieldRegistryClient` -> berkas ini.
//
// PETA FOLDER
// | Berkas                                   | Isinya                                  |
// |------------------------------------------|-----------------------------------------|
// | FormFieldRegistryClient.tsx              | induk: kerangka + kartu + tombol Simpan |
// | FormFieldRegistryClient.kontrak.ts       | bentuk data + keempat saklar            |
// | FormFieldRegistryClient.hook.ts          | SELURUH keadaan panel                   |
// | FormFieldRegistryClient.subcomponents.tsx| kotak peringatan + tabel satu kartu     |

export { FormFieldRegistryClient } from './FormFieldRegistryClient'
export type { FormFieldGroupData } from './FormFieldRegistryClient.kontrak'
