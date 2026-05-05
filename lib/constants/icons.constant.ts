// lib/constants/icons.constant.ts
// Registry icon terpusat — SATU sumber kebenaran untuk semua icon di seluruh aplikasi.
// Semua komponen WAJIB import icon dari sini, TIDAK BOLEH import langsung dari lucide-react.
//
// Dibuat: Sesi #100 — Sentralisasi UI
//
// CARA PAKAI:
//   import { ICON_NAV, ICON_ACTION, ICON_STATUS } from '@/lib/constants/icons.constant'
//   const Icon = ICON_NAV.konfigurasi
//   <Icon size={16} className="..." />
//
// GANTI ICON:
//   Cukup ubah 1 baris di file ini → semua komponen yang pakai ikut berubah otomatis.
//   Contoh: ganti SlidersHorizontal → Settings2 untuk Konfigurasi = 1 baris perubahan.
//
// TAMBAH ICON BARU:
//   1. Import dari lucide-react di blok import di bawah
//   2. Tambahkan ke grup yang sesuai (NAV / ACTION / STATUS / DATA / FORM)
//   3. Beri nama semantik yang deskriptif — bukan nama icon-nya

import {
  // ── Navigasi Sidebar ──
  SlidersHorizontal,
  Layers,
  MapPin,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Menu,

  // ── Aksi Umum ──
  LogOut,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Download,
  Upload,
  Eye,
  EyeOff,
  Check,
  Save,
  RotateCcw,

  // ── Status / Feedback ──
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,

  // ── Data / Konten ──
  FileText,
  Database,
  Key,
  Lock,
  Unlock,
  Shield,
  Settings,
  Settings2,
  BarChart2,
  List,
  LayoutGrid,

  // ── User / Entitas ──
  User,
  Users,
  Building2,
  Store,
  UserCheck,
  UserX,

  // ── Komunikasi ──
  MessageSquare,
  Bell,
  Mail,
  Phone,
  Send,

  // ── Waktu ──
  Clock,
  Calendar,
  Timer,

  // ── Lokasi ──
  Globe,
  Navigation,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

// Re-export type agar komponen bisa pakai tanpa import langsung dari lucide-react
export type { LucideIcon }

// ─── Navigasi Sidebar ─────────────────────────────────────────────────────────

export const ICON_NAV = {
  /** Grup menu Konfigurasi */
  konfigurasi:   SlidersHorizontal,
  /** Grup menu Konten */
  konten:        Layers,
  /** Info GPS di footer sidebar */
  gps:           MapPin,
  /** Expand / collapse grup — panah bawah */
  chevronDown:   ChevronDown,
  /** Navigasi kembali — panah kiri */
  chevronLeft:   ChevronLeft,
  /** Navigasi maju — panah kanan */
  chevronRight:  ChevronRight,
  /** Tutup sidebar mobile */
  close:         X,
  /** Buka sidebar mobile (hamburger) */
  hamburger:     Menu,
} as const

// ─── Aksi Umum ────────────────────────────────────────────────────────────────

export const ICON_ACTION = {
  /** Logout / keluar */
  logout:        LogOut,
  /** Edit / ubah data */
  edit:          Edit,
  /** Hapus data */
  delete:        Trash2,
  /** Tambah data baru */
  add:           Plus,
  /** Cari / search */
  search:        Search,
  /** Filter data */
  filter:        Filter,
  /** Refresh / muat ulang */
  refresh:       RefreshCw,
  /** Salin ke clipboard */
  copy:          Copy,
  /** Download */
  download:      Download,
  /** Upload */
  upload:        Upload,
  /** Tampilkan (password, nilai tersembunyi) */
  show:          Eye,
  /** Sembunyikan */
  hide:          EyeOff,
  /** Konfirmasi / centang */
  confirm:       Check,
  /** Simpan */
  save:          Save,
  /** Reset ke default */
  reset:         RotateCcw,
  /** Kirim */
  send:          Send,
} as const

// ─── Status / Feedback ────────────────────────────────────────────────────────

export const ICON_STATUS = {
  /** Error / ada masalah */
  error:         AlertCircle,
  /** Peringatan / perhatian */
  warning:       AlertTriangle,
  /** Informasi */
  info:          Info,
  /** Berhasil */
  success:       CheckCircle2,
  /** Gagal / ditolak */
  failed:        XCircle,
  /** Sedang loading / proses */
  loading:       Loader2,
} as const

// ─── Data / Konten ────────────────────────────────────────────────────────────

export const ICON_DATA = {
  /** Dokumen / halaman */
  document:      FileText,
  /** Database */
  database:      Database,
  /** Key / kunci teknis */
  key:           Key,
  /** Terkunci */
  locked:        Lock,
  /** Terbuka / tidak terkunci */
  unlocked:      Unlock,
  /** Keamanan / shield */
  security:      Shield,
  /** Pengaturan (gear) */
  settings:      Settings,
  /** Pengaturan alternatif */
  settings2:     Settings2,
  /** Statistik / chart */
  chart:         BarChart2,
  /** Tampilan list */
  list:          List,
  /** Tampilan grid */
  grid:          LayoutGrid,
  /** Pesan / teks */
  message:       MessageSquare,
} as const

// ─── User / Entitas ───────────────────────────────────────────────────────────

export const ICON_ENTITY = {
  /** Satu user */
  user:          User,
  /** Banyak user */
  users:         Users,
  /** Perusahaan / tenant */
  company:       Building2,
  /** Toko / vendor */
  vendor:        Store,
  /** User terverifikasi */
  userApproved:  UserCheck,
  /** User diblokir */
  userBlocked:   UserX,
} as const

// ─── Komunikasi ───────────────────────────────────────────────────────────────

export const ICON_COMM = {
  /** Notifikasi */
  notification:  Bell,
  /** Email */
  email:         Mail,
  /** Telepon */
  phone:         Phone,
  /** WhatsApp (pakai MessageSquare — tidak ada WA icon di lucide) */
  whatsapp:      MessageSquare,
} as const

// ─── Waktu ────────────────────────────────────────────────────────────────────

export const ICON_TIME = {
  /** Jam / waktu */
  clock:         Clock,
  /** Kalender / tanggal */
  calendar:      Calendar,
  /** Timer / durasi */
  timer:         Timer,
} as const

// ─── Lokasi ───────────────────────────────────────────────────────────────────

export const ICON_LOCATION = {
  /** Global / seluruh dunia */
  global:        Globe,
  /** Navigasi / arah */
  navigation:    Navigation,
  /** GPS / pin lokasi */
  pin:           MapPin,
} as const
