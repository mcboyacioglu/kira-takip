import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type PageKey =
  | '/'
  | '/islemler'
  | '/kiracilar'
  | '/mulkler'
  | '/takvim'
  | '/raporlar'
  | '/raporlar/ortaklar'
  | '/bildirimler'
  | '/veri-girisi'
  | '/ayarlar/kisiler'
  | '/ayarlar/sayfa-erisim'

export type PageStage = 'all' | 'admin_only'

export interface PageVisibility {
  id: string
  page_key: PageKey
  stage: PageStage
  updated_at?: string
}

const DEFAULTS: Record<PageKey, PageStage> = {
  '/': 'all',
  '/islemler': 'all',
  '/kiracilar': 'all',
  '/mulkler': 'all',
  '/takvim': 'admin_only',
  '/raporlar': 'all',
  '/raporlar/ortaklar': 'admin_only',
  '/bildirimler': 'admin_only',
  '/veri-girisi': 'admin_only',
  '/ayarlar/kisiler': 'all',
  '/ayarlar/sayfa-erisim': 'admin_only',
}

export function usePageVisibilitySettings() {
  return useQuery<PageVisibility[]>({
    queryKey: ['page_visibility_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sayfa_gorunurluk')
        .select('id, page_key, stage, updated_at')
        .order('page_key', { ascending: true })
      if (error) {
        // tablo henüz yoksa fail etmeyelim, default ile çalışsın
        return []
      }
      return (data || []) as PageVisibility[]
    },
  })
}

export function useEffectivePageVisibility() {
  const { data = [] } = usePageVisibilitySettings()
  return useMemo(() => {
    const map = { ...DEFAULTS } as Record<PageKey, PageStage>
    for (const r of data) {
      // legacy compatibility: prod/dev -> all/admin_only
      const normalized =
        (r.stage as any) === 'prod'
          ? 'all'
          : (r.stage as any) === 'dev'
            ? 'admin_only'
            : r.stage
      map[r.page_key] = normalized as PageStage
    }
    return map
  }, [data])
}

export function useCanAccessPage(path: PageKey) {
  const { isAdmin } = useAuth()
  const effective = useEffectivePageVisibility()
  if (isAdmin) return true
  return effective[path] === 'all'
}

export function useUpdatePageVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ page_key, stage }: { page_key: PageKey; stage: PageStage }) => {
      // Try modern values first: all/admin_only
      let { error } = await supabase
        .from('sayfa_gorunurluk')
        .upsert({ page_key, stage }, { onConflict: 'page_key' })

      // Backward-compat: if DB still has old prod/dev check constraint, retry with legacy value
      if (error && /check|constraint/i.test(error.message || '')) {
        const legacyStage = stage === 'all' ? 'prod' : 'dev'
        const retry = await supabase
          .from('sayfa_gorunurluk')
          .upsert({ page_key, stage: legacyStage as any }, { onConflict: 'page_key' })
        error = retry.error ?? null
      }

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['page_visibility_settings'] })
    },
  })
}

export const PAGE_VISIBILITY_DEFAULTS = DEFAULTS
