// components/register/RegisterClient/index.ts
// MASTER folder `RegisterClient/` — ATURAN 50.5: navigasi saja, NOL isi.
// Ia juga yang membuat jalur impor lama tetap sah:
//   `@/components/register/RegisterClient` → berkas ini.
// 🔴 app/register/page.tsx memakai impor DEFAULT, jadi baris default di bawah WAJIB ada.
//
// PETA FOLDER
// | Berkas                           | Isinya                                |
// |----------------------------------|---------------------------------------|
// | RegisterClient.tsx               | induk: layar selesai + formulir utuh  |
// | RegisterClient.kontrak.ts        | bentuk data yang masuk dari server    |
// | RegisterClient.hook.ts           | keadaan formulir + pengiriman         |
// | RegisterClient.subcomponents.tsx | kerangka kartu + isian + centang      |

export { default } from './RegisterClient'
export type { KelompokKolom, RegisterClientProps } from './RegisterClient.kontrak'
