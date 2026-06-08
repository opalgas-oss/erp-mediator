'use client'
// ARSIP — pra-sesi-17-ui-standar — MembershipDetailClient.tsx
// app/dashboard/superadmin/memberships/[uid]/MembershipDetailClient.tsx
// Sebelum fix: h1 text-xl/text-slate-900, CardTitle text-sm/text-slate-500 uppercase,
// dt/dd text-xs/text-sm/text-slate-*, TableHead tanpa override, TableCell text-sm/text-xs/text-slate-*

import { useState, useEffect }                  from 'react'
import { useRouter }                            from 'next/navigation'
import { toast }                                from 'sonner'
import { Button }                               from '@/components/ui/button'
import { Badge }                                from '@/components/ui/badge'
import {
  Card, CardContent, CardHeader, CardTitle,
}                                               from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
}                                               from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogDescription,
}                                               from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
}                                               from '@/components/ui/select'
import { Label }                                from '@/components/ui/label'
import { Alert, AlertDescription }             from '@/components/ui/alert'
import { ICON_ACTION, ICON_STATUS, ICON_NAV }   from '@/lib/constants/icons.constant'
import type {
  UserWithMemberships,
  MembershipRow,
}                                               from '@/lib/types/user-membership.types'

// [ARSIP — isi lengkap tidak disertakan, simpan snapshot minimal untuk referensi]
// Perubahan yang dilakukan di sesi-17:
// 1. h1: text-xl font-semibold text-slate-900 → text-[20px] font-semibold text-[#1a1a1a]
// 2. CardTitle (Informasi User): text-sm font-medium text-slate-500 uppercase tracking-wide → text-[14px] font-semibold text-[#1a1a1a]
// 3. CardTitle (Daftar Membership): idem
// 4. dt: text-xs text-slate-400 → text-[12px] text-[#6b7280]
// 5. dd: text-sm font-medium text-slate-800 → text-[13px] font-medium text-[#1a1a1a]
// 6. dd: text-sm text-slate-700 → text-[13px] text-[#1a1a1a]
// 7. TableHead: (tanpa override) → text-[12px] font-medium text-[#6b7280] py-2.5 px-3.5
// 8. TableRow data: (tanpa override) → border-b border-[rgba(0,0,0,0.08)] hover:bg-[#f9f9f8]
// 9. TableCell tenant: text-sm text-slate-700 → py-3 px-3.5 text-[13px] text-[#1a1a1a]
// 10. code role: text-xs → text-[12px]
// 11. TableCell status: (tanpa override) → py-3 px-3.5 text-center
// 12. TableCell dibuat: text-xs text-slate-400 → py-3 px-3.5 text-[11px] text-[#6b7280]
// 13. TableCell aksi: text-right → py-3 px-3.5 text-right
// 14. Empty state: text-sm text-slate-400 → text-[13px] text-[#6b7280]
// 15. Badge StatusBadge: text-xs → text-[11px]
export {}
