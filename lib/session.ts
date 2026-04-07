/**
 * lib/session.ts
 * Helper fungsi session untuk platform ERP Mediator Hyperlocal.
 * Mencakup: GPS, device info, OTP (via Fonnte WA), biometric (WebAuthn), dan session log.
 * Dapat diimport di browser (client component) maupun server.
 * TIDAK ada API khusus Node.js di file ini.
 */

import { db } from '@/lib/firebase';
import { getEffectivePolicy } from '@/lib/policy';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Interface internal — tidak di-export, hanya untuk type-safety di file ini
// ---------------------------------------------------------------------------

/** Struktur respons Nominatim untuk reverse geocoding */
interface NominatimResponse {
  address: {
    city?: string;
    town?: string;
    county?: string;
    state?: string;
  };
}

/** Struktur dokumen /tenants/{tenantId}/otp_codes/{uid} di Firestore */
interface OTPDoc {
  code: string;
  created_at: Timestamp;
  expires_at: Timestamp;
  is_used: boolean;
}

// ---------------------------------------------------------------------------
// 1. getDeviceInfo
// ---------------------------------------------------------------------------

/**
 * Membaca informasi browser dan OS dari navigator.userAgent.
 * @returns String format "Browser / OS", atau "Server" jika dijalankan di server.
 */
export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Server';

  const ua = navigator.userAgent;

  // Deteksi browser — urutan cek penting (Edge dan Opera muncul sebelum Chrome)
  let browser = 'Browser Tidak Dikenal';
  if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('OPR/') || ua.includes('Opera')) {
    browser = 'Opera';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browser = 'Safari';
  }

  // Deteksi OS — urutan: mobile lebih spesifik, desktop belakangan
  let os = 'OS Tidak Dikenal';
  if (ua.includes('iPhone')) {
    const match = ua.match(/CPU iPhone OS (\d+)/);
    os = match ? `iPhone iOS ${match[1]}` : 'iPhone';
  } else if (ua.includes('iPad')) {
    const match = ua.match(/CPU OS (\d+)/);
    os = match ? `iPad iOS ${match[1]}` : 'iPad';
  } else if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (ua.includes('Windows NT 10.0')) {
    os = 'Windows 10';
  } else if (ua.includes('Windows NT 6.3')) {
    os = 'Windows 8.1';
  } else if (ua.includes('Windows NT 6.1')) {
    os = 'Windows 7';
  } else if (ua.includes('Macintosh')) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    os = match ? `Mac OS X ${match[1].replace(/_/g, '.')}` : 'Mac';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  return `${browser} / ${os}`;
}

// ---------------------------------------------------------------------------
// 2. getGPSLocation
// ---------------------------------------------------------------------------

/**
 * Mendapatkan koordinat GPS dan nama kota pengguna via browser Geolocation API.
 * Nama kota di-resolve menggunakan Nominatim (OpenStreetMap reverse geocoding).
 * @throws Error("GPS_DITOLAK") jika user menolak izin atau GPS tidak tersedia
 * @throws Error("GPS_SERVER") jika dijalankan di server
 */
export async function getGPSLocation(): Promise<{
  lat: number;
  lng: number;
  kota: string;
}> {
  if (typeof window === 'undefined') {
    throw new Error('GPS_SERVER');
  }

  if (!navigator.geolocation) {
    throw new Error('GPS_DITOLAK');
  }

  // Wrap callback-based Geolocation API ke dalam Promise
  const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => reject(new Error('GPS_DITOLAK')),
      { timeout: 10000 }
    );
  });

  const lat = coords.latitude;
  const lng = coords.longitude;

  // Reverse geocoding via Nominatim
  let kota = 'Tidak Diketahui';
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    if (response.ok) {
      const data = (await response.json()) as NominatimResponse;
      kota =
        data.address.city ??
        data.address.town ??
        data.address.county ??
        data.address.state ??
        'Tidak Diketahui';
    }
  } catch {
    // Fetch Nominatim gagal — kota tetap "Tidak Diketahui", tidak throw
  }

  return { lat, lng, kota };
}

// ---------------------------------------------------------------------------
// 3. writeSessionLog
// ---------------------------------------------------------------------------

/**
 * Menulis log session baru ke Firestore saat user berhasil login.
 * @returns session_id (UUID v4) dari session yang baru dibuat
 */
export async function writeSessionLog(params: {
  uid: string;
  tenantId: string;
  email: string;
  role: string;
  lat: number;
  lng: number;
  kota: string;
}): Promise<string> {
  const sessionId = crypto.randomUUID();
  const sessionRef = doc(
    db,
    'tenants',
    params.tenantId,
    'session_logs',
    sessionId
  );

  await setDoc(sessionRef, {
    session_id: sessionId,
    uid: params.uid,
    tenant_id: params.tenantId,
    email: params.email,
    role: params.role,
    device: getDeviceInfo(),
    gps_kota: params.kota,
    gps_lat: params.lat,
    gps_lng: params.lng,
    status: 'online',
    login_at: serverTimestamp(),
    logout_at: null,
  });

  return sessionId;
}

// ---------------------------------------------------------------------------
// 4. generateOTP
// ---------------------------------------------------------------------------

/**
 * Membuat kode OTP 6 digit acak dengan zero-padding.
 * Contoh hasil: "042891", "000312"
 */
export function generateOTP(): string {
  const angka = Math.floor(Math.random() * 1_000_000);
  return angka.toString().padStart(6, '0');
}

// ---------------------------------------------------------------------------
// 5. sendOTPviaWA
// ---------------------------------------------------------------------------

/**
 * Mengirim kode OTP ke nomor WhatsApp user via Fonnte API.
 * Customer tidak akan menerima OTP dalam kondisi apapun.
 * @returns true jika berhasil atau di-skip, false jika terjadi error pengiriman
 */
export async function sendOTPviaWA(params: {
  phoneNumber: string;
  otpCode: string;
  role: string;
  tenantId: string;
}): Promise<boolean> {
  // Customer tidak boleh menerima OTP — return langsung
  if (params.role === 'customer') return true;

  // Skip pengiriman jika API key tidak tersedia
  const fonnteKey = process.env.FONNTE_API_KEY;
  if (!fonnteKey) {
    console.log('FONNTE_API_KEY tidak ada, skip OTP');
    return true;
  }

  // Baca durasi OTP dari policy — tidak boleh hardcode
  const policy = await getEffectivePolicy(params.tenantId, 'security_login');
  const expiryMs = policy.otp_expiry_minutes * 60 * 1000;
  const waktuKadaluarsa = new Date(Date.now() + expiryMs);

  const jam = waktuKadaluarsa.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const tanggal = waktuKadaluarsa.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const pesan =
    `OTP Anda ${params.otpCode} untuk akses masuk sebagai Role: ${params.role}. ` +
    `JANGAN BERIKAN OTP KEPADA SIAPAPUN. ` +
    `Gunakan sebelum Jam: ${jam} Tanggal ${tanggal}`;

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: fonnteKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: params.phoneNumber, message: pesan }),
    });
    return response.ok;
  } catch (error) {
    console.error('Gagal mengirim OTP via Fonnte:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 6. saveOTPtoFirestore
// ---------------------------------------------------------------------------

/**
 * Menyimpan kode OTP ke Firestore agar bisa diverifikasi kemudian.
 * Path: /tenants/{tenantId}/otp_codes/{uid}
 */
export async function saveOTPtoFirestore(params: {
  uid: string;
  otpCode: string;
  tenantId: string;
  expiryMinutes: number;
}): Promise<void> {
  const otpRef = doc(db, 'tenants', params.tenantId, 'otp_codes', params.uid);

  await setDoc(otpRef, {
    code: params.otpCode,
    created_at: serverTimestamp(),
    expires_at: Timestamp.fromMillis(
      Date.now() + params.expiryMinutes * 60 * 1000
    ),
    is_used: false,
  });
}

// ---------------------------------------------------------------------------
// 7. verifyOTP
// ---------------------------------------------------------------------------

/**
 * Memverifikasi kode OTP yang diinput oleh user.
 * @returns true jika valid, "EXPIRED" jika kadaluarsa, false jika salah/sudah dipakai
 */
export async function verifyOTP(params: {
  uid: string;
  inputCode: string;
  tenantId: string;
}): Promise<boolean | 'EXPIRED'> {
  const otpRef = doc(db, 'tenants', params.tenantId, 'otp_codes', params.uid);
  const otpSnap = await getDoc(otpRef);

  // Dokumen tidak ditemukan
  if (!otpSnap.exists()) return false;

  const data = otpSnap.data() as OTPDoc;

  // OTP sudah pernah dipakai
  if (data.is_used) return false;

  // OTP sudah kadaluarsa
  if (data.expires_at.toMillis() < Date.now()) return 'EXPIRED';

  // Kode tidak cocok
  if (data.code !== params.inputCode) return false;

  // Semua valid — tandai OTP sudah dipakai
  await updateDoc(otpRef, { is_used: true });
  return true;
}

// ---------------------------------------------------------------------------
// 8. registerBiometric
// ---------------------------------------------------------------------------

/**
 * Mendaftarkan perangkat ke WebAuthn (platform authenticator / biometric)
 * dan menyimpan data trusted device ke Firestore.
 * @returns true jika berhasil, false jika gagal atau user membatalkan
 */
export async function registerBiometric(params: {
  uid: string;
  tenantId: string;
}): Promise<boolean> {
  // Pastikan berjalan di browser dengan WebAuthn tersedia
  if (
    typeof window === 'undefined' ||
    !navigator.credentials ||
    !window.PublicKeyCredential
  ) {
    return false;
  }

  try {
    const policy = await getEffectivePolicy(params.tenantId, 'security_login');

    await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: {
          name: 'ERP Mediator',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(params.uid),
          name: params.uid,
          displayName: params.uid,
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
      },
    });

    // Simpan trusted device ke Firestore setelah biometric berhasil didaftarkan
    const deviceId = crypto.randomUUID();
    const trustedUntilMs =
      Date.now() + policy.trusted_device_days * 24 * 60 * 60 * 1000;

    const deviceRef = doc(
      db,
      'tenants',
      params.tenantId,
      'trusted_devices',
      deviceId
    );

    await setDoc(deviceRef, {
      device_id: deviceId,
      uid: params.uid,
      tenant_id: params.tenantId,
      device_label: getDeviceInfo(),
      trusted_until: Timestamp.fromMillis(trustedUntilMs),
      created_at: serverTimestamp(),
    });

    return true;
  } catch {
    // User membatalkan WebAuthn atau terjadi error — jangan throw ke caller
    return false;
  }
}

// ---------------------------------------------------------------------------
// 9. verifyBiometric
// ---------------------------------------------------------------------------

/**
 * Memverifikasi biometric user via WebAuthn dan memastikan device masih dipercaya.
 * Cek Firestore terlebih dahulu — jika tidak ada trusted device yang valid, langsung return false.
 * @returns true jika biometric berhasil dan device masih dalam periode trusted, false jika gagal
 */
export async function verifyBiometric(params: {
  uid: string;
  tenantId: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.credentials) {
    return false;
  }

  try {
    // Cek apakah ada trusted device yang masih valid untuk uid ini
    const devicesRef = collection(
      db,
      'tenants',
      params.tenantId,
      'trusted_devices'
    );
    const devicesQuery = query(
      devicesRef,
      where('uid', '==', params.uid),
      where('trusted_until', '>', Timestamp.fromMillis(Date.now())),
      limit(1)
    );
    const devicesSnap = await getDocs(devicesQuery);

    // Tidak ada trusted device yang valid — tidak lanjut ke WebAuthn
    if (devicesSnap.empty) return false;

    // Lakukan WebAuthn assertion untuk verifikasi biometric
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        timeout: 60000,
        userVerification: 'required',
      },
    });

    return assertion !== null;
  } catch {
    // User membatalkan atau verifikasi gagal — jangan throw ke caller
    return false;
  }
}
