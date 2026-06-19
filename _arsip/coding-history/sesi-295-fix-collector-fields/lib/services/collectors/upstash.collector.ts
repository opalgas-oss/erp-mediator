// ARSIP pra-fix Sesi #295 — upstash.collector.ts
// Bug: return used_memory_human/connected_clients/dll (raw Redis INFO string)
//      tapi UI expect commands_per_second/memory_used_bytes/cache_hit_rate_pct/latency_p99_ms
