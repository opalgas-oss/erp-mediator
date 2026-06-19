// lib/services/metrics-collector.service.ts
// ARSIP SEBELUM EDIT S#299 — Langkah 2: vercel plan-aware
// Snapshot diambil: 19 Juni 2026

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCredentialsByProvider }   from '@/lib/services/credential.service'
import { insertMetric }               from '@/lib/repositories/provider-metrics.repository'
import { upsertDefaultRules }         from '@/lib/repositories/alert-rules.repository'
import { checkAndSendAlerts }         from '@/lib/services/alert.service'
import { deleteOldMetrics }           from '@/lib/repositories/provider-metrics.repository'
import { fetchWithTimeout }           from '@/lib/utils/fetch.server'
import { collectSupabaseMetrics }     from '@/lib/services/collectors/supabase.collector'
import { collectVercelMetrics }       from '@/lib/services/collectors/vercel.collector'
import { collectUpstashMetrics }      from '@/lib/services/collectors/upstash.collector'
import { collectCloudinaryMetrics }   from '@/lib/services/collectors/cloudinary.collector'
import { collectGithubMetrics }       from '@/lib/services/collectors/github.collector'
