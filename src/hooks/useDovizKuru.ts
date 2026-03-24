import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { DovizKuru } from '@/types'

export function useDovizKuru(tarih: string, paraBirimi: string, enabled = true) {
  return useQuery<DovizKuru | null>({
    queryKey: ['doviz_kuru', tarih, paraBirimi],
    queryFn: async () => {
      // TRY için doviz kuru hesapla
      if (paraBirimi === 'TRY') {
        // Önce USD kurunu al
        const { data: usdKur } = await supabase
          .from('doviz_kurlari')
          .select('alis')
          .eq('tarih', tarih)
          .eq('para_birimi', 'USD')
          .maybeSingle()
        
        if (usdKur && usdKur.alis) {
          // doviz_kuru = 1/USD_alis (örn: 1/44.1060 = 0.02267)
          return {
            tarih,
            para_birimi: 'TRY',
            alis: 1 / usdKur.alis,
            satis: 1 / usdKur.alis,
            doviz_kuru: 1 / usdKur.alis
          }
        }
        return null
      }

      // USD için doviz_kuru = 1
      if (paraBirimi === 'USD') {
        return {
          tarih,
          para_birimi: 'USD',
          alis: 1,
          satis: 1,
          doviz_kuru: 1
        }
      }

      // EUR veya diğer para birimleri için
      // Önce önbellekten kontrol et
      const { data: cached } = await supabase
        .from('doviz_kurlari')
        .select('*')
        .eq('tarih', tarih)
        .eq('para_birimi', paraBirimi)
        .maybeSingle()

      // EUR ise USD kurunu da alarak doviz_kuru hesapla
      if (paraBirimi === 'EUR' && cached) {
        const { data: usdKur } = await supabase
          .from('doviz_kurlari')
          .select('alis')
          .eq('tarih', tarih)
          .eq('para_birimi', 'USD')
          .maybeSingle()

        if (usdKur && usdKur.alis && cached.alis) {
          // doviz_kuru = EUR_alis / USD_alis
          const doviz_kuru = cached.alis / usdKur.alis
          return {
            ...cached,
            doviz_kuru
          }
        }
      }

      if (cached) return cached

      // Supabase Edge Function'dan çek (GET query string ile)
      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tcmb-kur`)
      url.searchParams.set('tarih', tarih)
      url.searchParams.set('para_birimi', paraBirimi)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      })

      if (!res.ok) return null

      const kur = await res.json() as DovizKuru
      return kur
    },
    enabled: enabled && !!tarih && !!paraBirimi,
    staleTime: 1000 * 60 * 60, // 1 saat
  })
}

// Helper function: doviz_kuru ve usd_tutari hesapla
export async function hesaplaDovizKuruVeUsdTutari(
  tarih: string,
  paraBirimi: string,
  tutar: number
): Promise<{ doviz_kuru: number | null; usd_tutari: number | null }> {
  if (paraBirimi === 'USD') {
    return { doviz_kuru: 1, usd_tutari: tutar }
  }

  // doviz_kurlari tablosundan kur al
  const { data: kur } = await supabase
    .from('doviz_kurlari')
    .select('alis')
    .eq('tarih', tarih)
    .eq('para_birimi', 'USD')
    .maybeSingle()

  if (!kur || !kur.alis) {
    return { doviz_kuru: null, usd_tutari: null }
  }

  let doviz_kuru: number

  if (paraBirimi === 'TRY') {
    // TRY: doviz_kuru = 1/USD_alis
    doviz_kuru = 1 / kur.alis
  } else {
    // Diğer para birimleri (EUR vb.): önce o para biriminin kurunu al
    const { data: paraBirimiKur } = await supabase
      .from('doviz_kurlari')
      .select('alis')
      .eq('tarih', tarih)
      .eq('para_birimi', paraBirimi)
      .maybeSingle()

    if (!paraBirimiKur || !paraBirimiKur.alis) {
      return { doviz_kuru: null, usd_tutari: null }
    }

    // doviz_kuru = para_birimi_alis / USD_alis
    doviz_kuru = paraBirimiKur.alis / kur.alis
  }

  const usd_tutari = tutar * doviz_kuru
  return { doviz_kuru, usd_tutari }
}
