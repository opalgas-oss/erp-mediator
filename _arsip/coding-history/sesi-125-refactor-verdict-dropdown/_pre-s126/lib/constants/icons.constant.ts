// lib/constants/icons.constant.ts
// SNAPSHOT PRE-S#127 (pre-L3.3) — sebelum tambah MoreVertical ke ICON_ACTION
// Kondisi: post-S#125, belum ada `more: MoreVertical`

import {
  SlidersHorizontal, Layers, MapPin, ChevronDown, ChevronRight, ChevronLeft, X, Menu,
  LogOut, Edit, Trash2, Plus, Search, Filter, RefreshCw, Copy, Download, Upload,
  Eye, EyeOff, Check, Save, RotateCcw,
  AlertCircle, AlertTriangle, Info, CheckCircle2, XCircle, Loader2,
  FileText, Database, Key, Lock, Unlock, Shield, Settings, Settings2, BarChart2, List, LayoutGrid,
  User, Users, Building2, Store, UserCheck, UserX,
  MessageSquare, Bell, Mail, Phone, Send,
  Clock, Calendar, Timer,
  Globe, Navigation,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'
export type { LucideIcon }

export const ICON_NAV = {
  konfigurasi: SlidersHorizontal, konten: Layers, integrasi: Globe, gps: MapPin,
  chevronDown: ChevronDown, chevronLeft: ChevronLeft, chevronRight: ChevronRight,
  close: X, hamburger: Menu,
} as const

export const ICON_ACTION = {
  logout: LogOut, edit: Edit, delete: Trash2, add: Plus, search: Search,
  filter: Filter, refresh: RefreshCw, copy: Copy, download: Download, upload: Upload,
  show: Eye, hide: EyeOff, confirm: Check, save: Save, reset: RotateCcw, send: Send,
} as const

export const ICON_STATUS = {
  error: AlertCircle, warning: AlertTriangle, info: Info,
  success: CheckCircle2, failed: XCircle, loading: Loader2,
} as const

export const ICON_DATA = {
  document: FileText, database: Database, key: Key, locked: Lock, unlocked: Unlock,
  security: Shield, settings: Settings, settings2: Settings2, chart: BarChart2,
  list: List, grid: LayoutGrid, message: MessageSquare,
} as const

export const ICON_ENTITY = {
  user: User, users: Users, company: Building2, vendor: Store,
  userApproved: UserCheck, userBlocked: UserX,
} as const

export const ICON_COMM = {
  notification: Bell, email: Mail, phone: Phone, whatsapp: MessageSquare,
} as const

export const ICON_TIME = {
  clock: Clock, calendar: Calendar, timer: Timer,
} as const

export const ICON_LOCATION = {
  global: Globe, navigation: Navigation, pin: MapPin,
} as const
