// ARSIP SESI #206 — sebelum fix logic gap OTP expired (counter tidak increment)
// File asli: lib/services/otp.service.ts
// Bug: verifyAndConsume() saat OTP expired di Redis (storedCode=null), tidak increment
//      attempts counter dan return EXPIRED langsung via fallback SP.
//      Akibat: 3x submit OTP tidak mencapai MAX_ATTEMPTS jika OTP expired di tengah.
//
// Cuplikan section yang akan difix (verifyAndConsume baris ~340):
//
//   const storedCode = await redis.get<string>(redisKey)
//   if (storedCode !== null) {
//     if (String(storedCode) === params.inputCode) {
//       // OK path
//       await redis.del(redisKey); await redis.del(attemptsKey)
//       return 'OK'
//     }
//     // WRONG path: increment + return WRONG (TIDAK CEK apakah sudah max)
//     await redis.incr(attemptsKey)
//     await redis.expire(attemptsKey, otpExpiryDetik)
//     return 'WRONG'
//   }
//   // storedCode null → fall through ke spVerifyAndConsume → return EXPIRED
//   // ← BUG: counter tidak naik di kasus ini
//
// File arsip penuh: lihat sesi-206-revert-spec-bug017-018/lib/services/otp.service.ts
// untuk versi sebelumnya yang juga mengandung struktur ini.
