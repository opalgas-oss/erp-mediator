// ARSIP ORIGINAL — sebelum edit S#297 (fix-capacity-row)
// lib/services/collectors/upstash.collector.ts
// Snapshot: used_memory parseInfoInt return 0 karena field name mismatch di Upstash INFO
// memory_max_bytes dari INFO (64MB) bukan dari config registry
