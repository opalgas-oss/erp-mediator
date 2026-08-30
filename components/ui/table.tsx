"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Sesi #476 — P3 (K-474-3): kolom pertama dan baris nama kolom MENEMPEL disediakan DI SINI,
//   bukan diketik ulang di tiap halaman. Wadah di bawah adalah satu-satunya penggulir tabel
//   (P1 S#475 memberinya batas tinggi dari token --tabel-tinggi-maks), jadi `sticky` hanya
//   bekerja kalau dipasang relatif terhadapnya. Halaman DILARANG mendefinisikan overflow
//   sendiri (DashboardShell.tsx:100-101).
//   Latar `bg-slate-50` WAJIB ada pada sel yang menempel — tanpanya isi yang tergulir tembus
//   di belakangnya. Nilainya DIUKUR, bukan dipilih: latar baris tabel = #f8fafc dari
//   DashboardShell.tsx:74, dan `bg-white` (#ffffff) DITOLAK terukur S#472 karena menimbulkan
//   pita terang di kolom pertama bahkan saat tabel belum digeser.
//   ⚠️ Kalau kelak sorotan hover baris dibuat terlihat, sel yang menempel WAJIB ikut diberi
//   warna hover yang sama, kalau tidak sorotan patah di kolom pertama.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-auto overscroll-contain max-h-(--tabel-tinggi-maks) [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-20 [&_thead_th]:bg-slate-50 [&_thead_th:first-child]:left-0 [&_thead_th:first-child]:z-30 [&_tbody_td:first-child]:sticky [&_tbody_td:first-child]:left-0 [&_tbody_td:first-child]:z-10 [&_tbody_td:first-child]:bg-slate-50"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-normal text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-normal [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
