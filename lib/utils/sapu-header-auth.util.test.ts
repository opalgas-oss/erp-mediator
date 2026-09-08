// Uji sapuan header auth — S#494, hutang #129.
import { describe, expect, it } from 'vitest'
import { HEADER_AUTH_DISUNTIK, sapuHeaderAuth } from './sapu-header-auth.util'

describe('sapuHeaderAuth', () => {
  it('🔴 SEMUA header auth kiriman luar dibuang, satu per satu', () => {
    const asal = new Headers()
    for (const n of HEADER_AUTH_DISUNTIK) asal.set(n, 'dikarang-pengirim')
    const bersih = sapuHeaderAuth(asal)
    for (const n of HEADER_AUTH_DISUNTIK) expect(bersih.get(n)).toBeNull()
  })

  it('🔴 `x-is-super-admin: true` kiriman luar TIDAK lolos', () => {
    const bersih = sapuHeaderAuth(new Headers({ 'x-is-super-admin': 'true' }))
    expect(bersih.get('x-is-super-admin')).toBeNull()
  })

  it('nama header TIDAK peka huruf besar-kecil', () => {
    const bersih = sapuHeaderAuth(new Headers({ 'X-Is-Super-Admin': 'true', 'X-USER-ID': 'u1' }))
    expect(bersih.get('x-is-super-admin')).toBeNull()
    expect(bersih.get('x-user-id')).toBeNull()
  })

  it('header LAIN dibiarkan utuh — sapuannya tidak melebar', () => {
    const bersih = sapuHeaderAuth(new Headers({
      'content-type': 'application/json', cookie: 'sb-access-token=abc', 'x-forwarded-for': '1.2.3.4',
      'x-is-super-admin': 'true',
    }))
    expect(bersih.get('content-type')).toBe('application/json')
    expect(bersih.get('cookie')).toBe('sb-access-token=abc')
    expect(bersih.get('x-forwarded-for')).toBe('1.2.3.4')
    expect(bersih.get('x-is-super-admin')).toBeNull()
  })

  it('⛔ header ASAL tidak diubah — yang dipulangkan SALINAN', () => {
    const asal = new Headers({ 'x-is-super-admin': 'true' })
    sapuHeaderAuth(asal)
    expect(asal.get('x-is-super-admin')).toBe('true')
  })

  it('permintaan tanpa satu pun header auth ⇒ lolos apa adanya', () => {
    const bersih = sapuHeaderAuth(new Headers({ accept: 'text/html' }))
    expect(bersih.get('accept')).toBe('text/html')
  })

  it('daftar memuat x-vendor-status — celah yang dulu hanya disapu Guard 5', () => {
    expect(HEADER_AUTH_DISUNTIK).toContain('x-vendor-status')
    expect(HEADER_AUTH_DISUNTIK.length).toBe(7)
  })
})
