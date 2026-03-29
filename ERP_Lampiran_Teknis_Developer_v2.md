# LAMPIRAN TEKNIS DEVELOPER v2.0
## Platform Marketplace Jasa Reverse Auction
## Dibuat: 27 Maret 2026

> **Cara Pakai:** Salin bagian yang relevan dan berikan ke AI coding sebagai konteks teknis saat meminta pembuatan modul tertentu.

---

## BAB T1 — STRUKTUR FIRESTORE LENGKAP

### T1.1 Semua Path Koleksi

```javascript
// ROOT — Platform Level
/platform_owners/{ownerId}

// ROOT — Tenant Level (semua data ada di bawah tenant)
/tenants/{tenantId}/config/{key}
/tenants/{tenantId}/categories/{categoryId}
/tenants/{tenantId}/cities/{cityId}
/tenants/{tenantId}/wa_numbers/{numberId}
/tenants/{tenantId}/payment_methods/{methodId}
/tenants/{tenantId}/users/{userId}
/tenants/{tenantId}/vendors/{vendorId}
/tenants/{tenantId}/vendors/{vendorId}/products/{productId}
/tenants/{tenantId}/vendors/{vendorId}/portfolio/{mediaId}
/tenants/{tenantId}/orders/{orderId}
/tenants/{tenantId}/orders/{orderId}/bids/{bidId}
/tenants/{tenantId}/orders/{orderId}/chat_messages/{msgId}
/tenants/{tenantId}/orders/{orderId}/media/{mediaId}
/tenants/{tenantId}/escrow_transactions/{txId}
/tenants/{tenantId}/chat_rooms/{roomId}
/tenants/{tenantId}/chat_rooms/{roomId}/messages/{msgId}
/tenants/{tenantId}/notifications/{notifId}
/tenants/{tenantId}/audit_logs/{logId}
/tenants/{tenantId}/vendor_scores/{vendorId}
/tenants/{tenantId}/dispute_cases/{caseId}
```

### T1.2 Cara Baca Config Tenant (WAJIB dipakai semua modul)

```javascript
// lib/getTenantConfig.ts
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function getTenantConfig(tenantId: string) {
  // Ambil config dari Firestore — JANGAN hardcode nilai apapun
  const configRef = doc(db, 'tenants', tenantId, 'config', 'main');
  const configSnap = await getDoc(configRef);
  
  if (!configSnap.exists()) {
    throw new Error(`Tenant ${tenantId} tidak ditemukan`);
  }
  
  return configSnap.data();
}

// PENGGUNAAN di setiap modul:
const config = await getTenantConfig(tenantId);
const komisiMinimum = config.commission.minimum_amount;  // dari DB
const persentaseKomisi = config.commission.percentage;   // dari DB
const timerT1 = config.timers.t1_minutes;                // dari DB
// dst — semua nilai dari DB, tidak ada yang hardcode
```

---

## BAB T2 — FIRESTORE SECURITY RULES v2.0

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // === HELPER FUNCTIONS ===
    function isSignedIn() {
      return request.auth != null;
    }

    function getRole() {
      return request.auth.token.role;
    }

    function getTenantId() {
      return request.auth.token.tenant_id;
    }

    function isPlatformOwner() {
      return request.auth.token.is_platform_owner == true;
    }

    function isTenantAdmin() {
      return getRole() in ['SUPER_ADMIN', 'DISPATCHER', 'FINANCE', 'SUPPORT']
        && getTenantId() == resource.data.tenant_id;
    }

    function isSuperAdmin() {
      return getRole() == 'SUPER_ADMIN'
        && getTenantId() == resource.data.tenant_id;
    }

    function belongsToTenant(tenantId) {
      // WAJIB: setiap query harus filter by tenant_id yang sama dengan user
      return getTenantId() == tenantId;
    }

    // === PLATFORM OWNERS ===
    match /platform_owners/{ownerId} {
      allow read, write: if isPlatformOwner();
    }

    // === TENANTS — ROOT ===
    match /tenants/{tenantId} {
      allow read: if isPlatformOwner() || belongsToTenant(tenantId);
      allow write: if isPlatformOwner();

      // Config tenant
      match /config/{key} {
        allow read: if isPlatformOwner() || belongsToTenant(tenantId);
        allow write: if isPlatformOwner() || isSuperAdmin();
      }

      // Kategori & Kota — dinamis, dikelola admin
      match /categories/{categoryId} {
        allow read: if isSignedIn() && belongsToTenant(tenantId);
        allow write: if isTenantAdmin();
      }

      match /cities/{cityId} {
        allow read: if isSignedIn() && belongsToTenant(tenantId);
        allow write: if isTenantAdmin();
      }

      // Nomor WA Blast
      match /wa_numbers/{numberId} {
        allow read, write: if isSuperAdmin() || isPlatformOwner();
      }

      // === ORDERS ===
      match /orders/{orderId} {
        allow read: if isTenantAdmin()
          || (isSignedIn() && resource.data.customer_info.uid == request.auth.uid
              && belongsToTenant(tenantId))
          || (isSignedIn() && resource.data.assigned_vendor == request.auth.uid
              && belongsToTenant(tenantId));

        allow create: if isSignedIn()
          && getRole() == 'CUSTOMER'
          && belongsToTenant(tenantId);

        allow update: if isTenantAdmin();

        // Chat Messages — tersimpan permanen
        match /chat_messages/{msgId} {
          allow read: if isTenantAdmin()
            || (isSignedIn() && belongsToTenant(tenantId)
                && (resource.data.sender_uid == request.auth.uid
                    || get(/databases/$(database)/documents/tenants/$(tenantId)/orders/$(orderId)).data.customer_info.uid == request.auth.uid
                    || get(/databases/$(database)/documents/tenants/$(tenantId)/orders/$(orderId)).data.assigned_vendor == request.auth.uid));

          allow create: if isSignedIn() && belongsToTenant(tenantId);
          allow update, delete: if false; // Chat tidak bisa diedit/dihapus
        }

        // Bids
        match /bids/{bidId} {
          allow read: if isTenantAdmin()
            || (isSignedIn() && resource.data.vendor_id == request.auth.uid);
          allow create: if isSignedIn() && getRole() == 'VENDOR'
            && belongsToTenant(tenantId);
          allow update: if isTenantAdmin();
        }
      }

      // === ESCROW — HANYA FINANCE & SUPER_ADMIN ===
      match /escrow_transactions/{txId} {
        allow read, write: if getRole() in ['SUPER_ADMIN', 'FINANCE']
          && belongsToTenant(tenantId);
      }

      // === AUDIT LOGS — APPEND ONLY ===
      match /audit_logs/{logId} {
        allow read: if isTenantAdmin() || isPlatformOwner();
        allow create: if isSignedIn() && belongsToTenant(tenantId);
        allow update, delete: if false; // Tidak ada yang bisa ubah/hapus log
      }

      // === VENDORS ===
      match /vendors/{vendorId} {
        allow read: if isTenantAdmin()
          || (isSignedIn() && vendorId == request.auth.uid
              && belongsToTenant(tenantId));
        allow create: if isSignedIn() && belongsToTenant(tenantId);
        allow update: if isSuperAdmin()
          || (isSignedIn() && vendorId == request.auth.uid
              && belongsToTenant(tenantId)
              && !request.resource.data.diff(resource.data).affectedKeys()
                  .hasAny(['verification', 'performance', 'is_active']));

        // Produk vendor
        match /products/{productId} {
          allow read: if isSignedIn() && belongsToTenant(tenantId);
          allow write: if isSignedIn() && vendorId == request.auth.uid
            && belongsToTenant(tenantId);
        }
      }
    }
  }
}
```

---

## BAB T3 — TEMPLATE CLOUD FUNCTIONS v2.0

### T3.1 Trigger: Order Baru → Blast WA ke Vendor

```javascript
// functions/src/onNewOrder.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendWhatsAppBlast } from './utils/whatsapp';
import { generateJWTLink } from './utils/jwt';
import { getTenantConfig } from './utils/tenant';

// Trigger: saat dokumen baru masuk ke koleksi orders milik tenant
exports.onNewOrder = functions.firestore
  .document('tenants/{tenantId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const { tenantId, orderId } = context.params;

    // 1. Ambil konfigurasi tenant dari Firestore
    const config = await getTenantConfig(tenantId);

    // 2. Ambil data kota dan kategori dari order
    const { city_id, category_id } = order.requirement;

    // 3. Cari vendor yang cocok (query dengan tenant_id)
    const vendorsSnap = await admin.firestore()
      .collection(`tenants/${tenantId}/vendors`)
      .where('is_active', '==', true)
      .where('verification.status', '==', 'APPROVED')
      .where('cities', 'array-contains', city_id)
      .where('categories', 'array-contains', category_id)
      .get();

    if (vendorsSnap.empty) {
      // Tidak ada vendor — langsung ke T2
      await snap.ref.update({
        status: 'T2_PAYMENT',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // 4. Urutkan vendor berdasarkan skor (rating + completion rate)
    const vendors = vendorsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.performance.rating - a.performance.rating);

    // 5. Ambil nomor WA aktif dari config tenant
    const activeWaNumberSnap = await admin.firestore()
      .doc(`tenants/${tenantId}/wa_numbers/${config.wa_blast.active_number_id}`)
      .get();
    const activeWaNumber = activeWaNumberSnap.data();

    // 6. Blast WA ke semua vendor relevan
    const blastPromises = vendors.map(vendor =>
      sendWhatsAppBlast({
        from: activeWaNumber.phone_number,
        to: vendor.wa_number,
        // Template pesan dari config tenant — bukan hardcode
        message: config.wa_templates.new_order_blast
          .replace('{vendor_name}', vendor.store.name)
          .replace('{category}', order.requirement.category_name)
          .replace('{city}', order.requirement.city_name)
          .replace('{budget}', formatRupiah(order.requirement.budget)),
        link: generateJWTLink(orderId, vendor.id, tenantId, '2h'),
      })
    );

    await Promise.all(blastPromises);

    // 7. Hitung deadline T1 dari config tenant (bukan hardcode)
    const t1Minutes = config.timers.t1_minutes;
    const t1Deadline = new Date(Date.now() + t1Minutes * 60 * 1000);

    // 8. Update status order
    await snap.ref.update({
      status: 'T1_AUCTION',
      'sla_timers.t1_start': admin.firestore.FieldValue.serverTimestamp(),
      'sla_timers.t1_deadline': t1Deadline,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 9. Catat ke audit log
    await admin.firestore()
      .collection(`tenants/${tenantId}/audit_logs`)
      .add({
        log_id: generateUUID(),
        tenant_id: tenantId,
        order_id: orderId,
        action: 'BLAST_SENT',
        actor: 'SYSTEM',
        metadata: {
          vendors_blasted: vendors.length,
          wa_number_used: config.wa_blast.active_number_id,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
  });
```

### T3.2 Kalkulasi Komisi di Server (Anti-Manipulasi)

```javascript
// app/api/order/calculate-price/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { getTenantConfig } from '@/lib/getTenantConfig';

// Validasi input dengan Zod — WAJIB di semua API Route
const RequestSchema = z.object({
  tenant_id  : z.string().uuid(),
  order_id   : z.string().uuid(),
  bid_id     : z.string().uuid(),
  // PENTING: Tidak menerima harga dari browser!
  // Harga diambil dari database, bukan dari user input
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validasi input
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Input tidak valid' }, { status: 400 });
  }

  const { tenant_id, order_id, bid_id } = parsed.data;

  // Ambil config komisi dari Firestore (bukan dari browser)
  const config = await getTenantConfig(tenant_id);
  const { percentage, minimum_amount, charged_to } = config.commission;

  // Ambil data bid dari Firestore (bukan dari browser)
  const bidSnap = await db
    .doc(`tenants/${tenant_id}/orders/${order_id}/bids/${bid_id}`)
    .get();

  if (!bidSnap.exists) {
    return Response.json({ error: 'Bid tidak ditemukan' }, { status: 404 });
  }

  const bid = bidSnap.data()!;

  // Hitung harga di SERVER — semua dari database, bukan dari user
  const hargaProduk   = bid.bid_details.bid_price;      // dari DB
  const ongkosKirim   = bid.bid_details.shipping_cost;  // dari DB
  const subtotal      = hargaProduk + ongkosKirim;

  // Rumus komisi: MAX(minimum, persentase × subtotal)
  const komisiPersentase = (percentage / 100) * subtotal;
  const komisi = Math.max(minimum_amount, komisiPersentase);

  // Hitung total berdasarkan siapa yang menanggung komisi
  let totalCustomer: number;
  let totalVendor: number;

  if (charged_to === 'customer') {
    totalCustomer = subtotal + komisi;  // customer bayar lebih
    totalVendor   = subtotal;           // vendor terima penuh
  } else {
    totalCustomer = subtotal;           // customer bayar normal
    totalVendor   = subtotal - komisi;  // vendor terima dikurangi komisi
  }

  // Simpan hasil kalkulasi ke order
  await db.doc(`tenants/${tenant_id}/orders/${order_id}`).update({
    'price_details.vendor_quote'  : hargaProduk,
    'price_details.shipping_cost' : ongkosKirim,
    'price_details.subtotal'      : subtotal,
    'price_details.commission'    : komisi,
    'price_details.total_customer': totalCustomer,
    'price_details.total_vendor'  : totalVendor,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return Response.json({
    subtotal,
    komisi,
    total_customer: totalCustomer,
    total_vendor  : totalVendor,
  });
}
```

### T3.3 Validasi Harga Bidding Vendor

```javascript
// app/api/bid/submit/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();

  const BidSchema = z.object({
    tenant_id      : z.string().uuid(),
    order_id       : z.string().uuid(),
    vendor_id      : z.string().uuid(),
    can_handle     : z.boolean(),
    bid_price      : z.number().positive(),
    shipping_cost  : z.number().min(0),
    estimated_days : z.number().positive(),
    can_ontime     : z.boolean(),
    notes          : z.string().optional(),
  });

  const parsed = BidSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Input tidak valid' }, { status: 400 });
  }

  const { tenant_id, order_id, vendor_id, bid_price } = parsed.data;

  // Ambil produk vendor dari Firestore untuk cek harga publish
  // (harga publish adalah harga normal yang tampil di website)
  const productSnap = await db
    .collection(`tenants/${tenant_id}/vendors/${vendor_id}/products`)
    .where('category_matches_order', '==', true)
    .limit(1)
    .get();

  const publishedPrice = productSnap.docs[0]?.data().price ?? 0;

  // VALIDASI: harga bidding TIDAK BOLEH lebih mahal dari harga publish
  if (bid_price > publishedPrice) {
    return Response.json({
      error: 'HARGA_BIDDING_TERLALU_MAHAL',
      message: `Harga bidding (${formatRupiah(bid_price)}) tidak boleh lebih mahal dari harga publish (${formatRupiah(publishedPrice)}). Silakan revisi harga publish di toko Anda terlebih dahulu.`,
      published_price: publishedPrice,
    }, { status: 400 });
  }

  // Simpan bid ke Firestore
  const bidRef = db
    .collection(`tenants/${tenant_id}/orders/${order_id}/bids`)
    .doc();

  await bidRef.set({
    bid_id        : bidRef.id,
    order_id,
    tenant_id,
    vendor_id,
    status        : 'PENDING',
    bid_details   : {
      ...parsed.data,
      published_price: publishedPrice,  // snapshot harga publish saat bid
    },
    submitted_at  : admin.firestore.FieldValue.serverTimestamp(),
  });

  return Response.json({ success: true, bid_id: bidRef.id });
}
```

### T3.4 Sistem Chat Anonim dengan Sensor Info Pribadi

```javascript
// app/api/chat/send/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Pola regex untuk deteksi info pribadi
  const PHONE_PATTERN = /(\+62|0)[0-9]{9,12}/g;
  const ALTERNATIVE_PHONE = /(\d[\s\-\.]?){10,13}/g;

  function sensorInfoPribadi(text: string): {
    censoredText: string;
    isCensored: boolean;
    originalText: string;
  } {
    let censoredText = text;
    let isCensored = false;

    // Sensor nomor HP
    if (PHONE_PATTERN.test(text) || ALTERNATIVE_PHONE.test(text)) {
      censoredText = censoredText
        .replace(PHONE_PATTERN, '[nomor HP disembunyikan]')
        .replace(ALTERNATIVE_PHONE, '[nomor disembunyikan]');
      isCensored = true;
    }

    return {
      censoredText,
      isCensored,
      originalText: text,  // disimpan, hanya admin yang bisa lihat
    };
  }

  const { tenant_id, order_id, sender_uid, message_text } = body;

  // Ambil info sender untuk alias anonim
  const orderSnap = await db
    .doc(`tenants/${tenant_id}/orders/${order_id}`)
    .get();
  const order = orderSnap.data()!;

  // Tentukan alias anonim berdasarkan peran sender
  let senderAlias: string;
  let senderRole: string;

  if (sender_uid === order.customer_info.uid) {
    senderAlias = order.customer_info.alias;  // "Pelanggan #123"
    senderRole  = 'CUSTOMER';
  } else if (sender_uid === order.assigned_vendor) {
    senderAlias = order.vendor_alias;         // "Mitra #456"
    senderRole  = 'VENDOR';
  } else {
    senderAlias = 'Admin';
    senderRole  = 'ADMIN';
  }

  // Sensor info pribadi
  const { censoredText, isCensored, originalText } =
    sensorInfoPribadi(message_text);

  // Simpan pesan — PERMANEN, tidak bisa dihapus
  await db
    .collection(`tenants/${tenant_id}/orders/${order_id}/chat_messages`)
    .add({
      message_id   : generateUUID(),
      order_id,
      tenant_id,
      sender_role  : senderRole,
      sender_alias : senderAlias,
      sender_uid,                    // UID asli tersimpan
      content: {
        type         : 'TEXT',
        text         : censoredText,         // teks yang ditampilkan
        is_censored  : isCensored,
        original_text: isCensored ? originalText : null, // hanya admin lihat
      },
      sent_at      : admin.firestore.FieldValue.serverTimestamp(),
      is_deleted   : false,          // tidak pernah bisa diubah ke true
    });

  // Kirim notifikasi ke pihak lain
  await sendChatNotification(tenant_id, order_id, senderRole, censoredText);

  return Response.json({ success: true });
}
```

### T3.5 Transfer Manual dengan Kode Unik

```javascript
// app/api/payment/transfer-manual/initiate/route.ts
export async function POST(request: NextRequest) {
  const { tenant_id, order_id } = await request.json();

  // Ambil config rekening dari Firestore tenant (bukan hardcode)
  const config = await getTenantConfig(tenant_id);
  const bankAccount = config.payment.bank_accounts[0];

  // Ambil total dari Firestore (bukan dari browser)
  const orderSnap = await db
    .doc(`tenants/${tenant_id}/orders/${order_id}`)
    .get();
  const order = orderSnap.data()!;
  const totalCustomer = order.price_details.total_customer;

  // Generate kode unik 3 digit untuk identifikasi transfer
  const uniqueCode = Math.floor(Math.random() * 900) + 100; // 100-999
  const nominalTransfer = totalCustomer + uniqueCode;

  // Simpan kode unik ke order
  await db.doc(`tenants/${tenant_id}/orders/${order_id}`).update({
    'payment.method'      : 'TRANSFER_MANUAL',
    'payment.unique_code' : uniqueCode,
    'payment.status'      : 'PENDING',
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return Response.json({
    bank_name      : bankAccount.bank_name,
    account_number : bankAccount.account_number,
    account_name   : bankAccount.account_name,
    nominal_transfer: nominalTransfer,
    unique_code    : uniqueCode,
    instructions   : `Transfer tepat ${formatRupiah(nominalTransfer)} (termasuk kode unik ${uniqueCode} untuk identifikasi otomatis)`,
  });
}
```

---

## BAB T4 — TEMPLATE PROMPT UNTUK AI CODING

### T4.1 Prompt untuk Memulai Setiap Sesi Coding

```
Saya sedang membangun Platform Marketplace Jasa Reverse Auction
dengan spesifikasi berikut:

[TEMPEL ISI FILE_A_Context_untuk_AI_v2.md]

Saya pemula yang tidak bisa coding manual.
Jelaskan setiap langkah dengan lengkap.
Format instruksi wajib:
📍 Di mana: [lokasi]
⌨️ Ketik: [perintah]
⏎ Lalu: Tekan Enter

Ikuti Kontrak Integrasi di dokumen tersebut.
Modul yang akan kita bangun sekarang: [nama modul]
```

### T4.2 Prompt untuk Membuat Halaman Baru

```
Berdasarkan spesifikasi di atas, buatkan halaman [nama halaman]
untuk [peran pengguna: customer/vendor/admin].

Halaman ini harus:
- Menggunakan Next.js App Router (bukan Pages Router)
- Menggunakan shadcn/ui untuk komponen UI
- Menggunakan Tailwind CSS untuk styling
- Membaca data dari Firestore dengan filter tenant_id
- Mengikuti Kontrak Integrasi
- Memiliki komentar penjelasan dalam Bahasa Indonesia

Data yang ditampilkan: [deskripsi data]
Aksi yang bisa dilakukan: [deskripsi aksi]
```

### T4.3 Prompt untuk Membuat Cloud Function

```
Buatkan Firebase Cloud Function untuk:
[deskripsi fungsi]

Requirements:
- Trigger: [onDocumentCreate/onDocumentUpdate/scheduled]
- Path Firestore: tenants/{tenantId}/[koleksi]/{docId}
- Semua konfigurasi (timer, komisi, dll) dibaca dari:
  tenants/{tenantId}/config/main
- Tidak ada nilai yang hardcode
- Catat ke audit_logs setelah setiap aksi penting
- Gunakan admin.firestore.FieldValue.serverTimestamp()
- Tambahkan error handling
- Komentar penjelasan dalam Bahasa Indonesia
```

### T4.4 Prompt untuk Debug Error

```
Konteks sistem saya:
Platform Marketplace Jasa Reverse Auction
Stack: Next.js 14, Firestore, Firebase Auth, Xendit, Cloudinary
Multi-tenant: setiap query WAJIB include tenant_id

Saya mendapat error berikut:
[tempel pesan error lengkap]

Ini kode yang error:
[tempel kode]

Ini yang saya coba lakukan:
[jelaskan tujuan]

Tolong:
1. Jelaskan penyebab error dalam Bahasa Indonesia yang mudah dipahami
2. Berikan solusi yang sudah diperbaiki
3. Jelaskan kenapa solusi tersebut benar
```

---

## BAB T5 — CHECKLIST PENGEMBANGAN v2.0

### T5.1 Checklist M1 — Foundation & Config

| # | Item | Status |
|---|------|--------|
| ☐ | Setup multi-tenant di Firestore | Belum |
| ☐ | Firebase Auth dengan Custom Claims (role + tenant_id) | Belum |
| ☐ | Halaman login & register (Customer & Vendor) | Belum |
| ☐ | Super Admin panel — konfigurasi brand, kota, kategori | Belum |
| ☐ | Super Admin panel — konfigurasi komisi & timer | Belum |
| ☐ | Super Admin panel — konfigurasi nomor WA blast | Belum |
| ☐ | Super Admin panel — konfigurasi metode payment | Belum |
| ☐ | Firestore Security Rules dengan validasi tenant_id | Belum |
| ☐ | MFA untuk role Admin | Belum |
| ☐ | shadcn/ui terinstall dan terkonfigurasi | Belum |

### T5.2 Checklist M2 — Vendor Store

| # | Item | Status |
|---|------|--------|
| ☐ | Form registrasi vendor + upload dokumen ke Cloudinary | Belum |
| ☐ | Dashboard toko vendor | Belum |
| ☐ | Form tambah/edit produk dengan harga publish | Belum |
| ☐ | Upload foto/video produk ke Cloudinary | Belum |
| ☐ | Admin approval panel untuk vendor baru | Belum |
| ☐ | Sistem alias anonim vendor ("Mitra #XXX") | Belum |

### T5.3 Checklist M3-M4 — Order & Auction

| # | Item | Status |
|---|------|--------|
| ☐ | Form buat order (Customer) | Belum |
| ☐ | Cloud Function blast WA ke vendor saat order masuk | Belum |
| ☐ | Form bidding vendor dengan validasi harga | Belum |
| ☐ | Validasi harga bidding ≤ harga publish di server | Belum |
| ☐ | Timer T1 dengan auto Hot Potato | Belum |
| ☐ | Timer T2 dengan auto cancel | Belum |
| ☐ | Kalkulasi harga final di server | Belum |

### T5.4 Checklist M5 — Payment & Escrow

| # | Item | Status |
|---|------|--------|
| ☐ | Integrasi Xendit (QRIS + VA Bank) | Belum |
| ☐ | Transfer Manual dengan kode unik | Belum |
| ☐ | Escrow management di Firestore | Belum |
| ☐ | Auto-disbursement ke vendor via Xendit | Belum |
| ☐ | Timer T3 dengan auto-release | Belum |
| ☐ | Kalkulasi komisi di server dengan rumus MAX | Belum |

### T5.5 Checklist M6-M7 — WA, Chatbot & Chat

| # | Item | Status |
|---|------|--------|
| ☐ | Multi nomor WA dengan auto-switch | Belum |
| ☐ | Template pesan WA dinamis dari Firestore | Belum |
| ☐ | AI Chatbot dengan Gemini API | Belum |
| ☐ | Chat room anonim Customer-Vendor | Belum |
| ☐ | Sensor nomor HP & alamat di chat | Belum |
| ☐ | Penyimpanan permanen semua chat (teks, foto, video) | Belum |
| ☐ | Push notification (Web + App + WA) | Belum |

---

*— Akhir Lampiran Teknis Developer v2.0 — 27 Maret 2026 —*
