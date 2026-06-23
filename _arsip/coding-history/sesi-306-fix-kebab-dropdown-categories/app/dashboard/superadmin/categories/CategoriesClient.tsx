'use client'

// ARSIP SESI #306 — sebelum fix kebab dropdown terpotong di baris terakhir
// File asli: app/dashboard/superadmin/categories/CategoriesClient.tsx
// Dibuat: Sesi #132 | Diupdate: Sesi #141

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { DialogBuatKategori } from './DialogBuatKategori'
import type { CategoryListItem, CategoryStats } from '@/lib/types/category.types'

interface Props {
  initialData:  CategoryListItem[]
  initialStats: CategoryStats
  initialTotal: number
}

const ICON_COLORS = [
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#FBEAF0', color: '#993556' },
  { bg: '#EAF3DE', color: '#3B6D11' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#F1EFE8', color: '#5F5E5A' },
]

const DEFAULT_ICON_BY_SLUG: Record<string, string> = {
  otomotif: 'ti-car', 'rumah-properti': 'ti-home', rumah: 'ti-home',
  properti: 'ti-home', kecantikan: 'ti-sparkles', 'kecantikan-perawatan': 'ti-sparkles',
  kuliner: 'ti-chef-hat', makanan: 'ti-chef-hat', konstruksi: 'ti-building-factory',
  bangunan: 'ti-building-factory', edukasi: 'ti-school', pendidikan: 'ti-school',
  teknologi: 'ti-device-laptop', digital: 'ti-device-laptop', kesehatan: 'ti-stethoscope',
  fashion: 'ti-shirt', transportasi: 'ti-truck', jasa: 'ti-tools',
}

// Kebab dropdown: position: 'absolute', right: 8, top: '100%' — terpotong di baris terakhir
// karena container tabel overflow: 'hidden'. Fix di sesi-306: deteksi posisi → buka ke atas jika perlu.
