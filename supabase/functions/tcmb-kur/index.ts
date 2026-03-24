// supabase/functions/tcmb-kur/index.ts
// TCMB günlük döviz kuru proxy + önbellek fonksiyonu
// Kullanım: 
//   Tek tarih: GET /functions/v1/tcmb-kur?tarih=2026-03-18&para_birimi=USD
//   Tarih aralığı: GET /functions/v1/tcmb-kur?baslangic=2026-01-01&bitis=2026-03-22

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const PARA_BIRIMLERI = ['USD', 'EUR']

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const tarihParam = url.searchParams.get('tarih')
    const paraBirimi = url.searchParams.get('para_birimi')
    const baslangicParam = url.searchParams.get('baslangic')
    const bitisParam = url.searchParams.get('bitis')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Tarih aralığı varsa bulk fetch
    if (baslangicParam && bitisParam) {
      return await handleBulkFetch(baslangicParam, bitisParam, supabase, url)
    }

    // Tek tarih işlemi
    if (!tarihParam || !paraBirimi) {
      return jsonError('tarih ve para_birimi parametreleri zorunludur', 400)
    }

    // USD için doğrudan 1 döndür
    if (paraBirimi === 'USD') {
      return jsonOk({ tarih: tarihParam, para_birimi: 'USD', alis: 1, satis: 1 })
    }

    // Önbellekte istenen para birimi var mı?
    const { data: cached } = await supabase
      .from('doviz_kurlari')
      .select('*')
      .eq('tarih', tarihParam)
      .eq('para_birimi', paraBirimi)
      .maybeSingle()

    if (cached) {
      await cacheAllRates(tarihParam, supabase)
      return jsonOk(cached)
    }

    // TCMB'den çek
    const date = new Date(tarihParam)
    const kur = await fetchFromTCMB(date, paraBirimi, supabase)

    if (!kur) {
      return jsonError(`${paraBirimi} için kur bulunamadı`, 404)
    }

    // Diğer para birimlerini de cache'le
    await cacheAllRates(tarihParam, supabase)

    return jsonOk(kur)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
    return jsonError(message, 500)
  }
})

// Tarih aralığı için bulk fetch
async function handleBulkFetch(
  baslangic: string,
  bitis: string,
  supabase: any,
  url: URL
) {
  const baslangicTarih = new Date(baslangic)
  const bitisTarih = new Date(bitis)
  
  const sonuclar: any[] = []
  let bulundu = 0
  let atlandi = 0
  let hata = 0

  // Tarihleri iterate et
  const current = new Date(baslangicTarih)
  while (current <= bitisTarih) {
    const tarihStr = current.toISOString().split('T')[0]
    
    // Her tarih için USD ve EUR'yu kontrol et / çek
    for (const pb of PARA_BIRIMLERI) {
      // Önbellekte var mı?
      const { data: existing } = await supabase
        .from('doviz_kurlari')
        .select('*')
        .eq('tarih', tarihStr)
        .eq('para_birimi', pb)
        .maybeSingle()

      if (existing) {
        atlandi++
        continue
      }

      // TCMB'den çek
      const kur = await fetchSingleRate(current, pb)
      if (kur) {
        await supabase.from('doviz_kurlari').upsert({
          tarih: kur.tarih,
          para_birimi: kur.para_birimi,
          alis: kur.alis,
          satis: kur.satis,
        })
        sonuclar.push(kur)
        bulundu++
      } else {
        hata++
      }
    }

    // Bir sonraki güne geç
    current.setDate(current.getDate() + 1)
    
    // Rate limiting - her 10 tarihte bir bekle
    if (current.getDate() % 10 === 0) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return jsonOk({
    mesaj: 'Tamamlandı',
    bulundu,
    atlandi,
    hata,
    sonuclar: sonuclar.slice(0, 10) // İlk 10 örnek
  })
}

// Tüm para birimlerini cache'le (varsa atla, yoksa çek)
async function cacheAllRates(tarih: string, supabase: any) {
  for (const pb of PARA_BIRIMLERI) {
    const { data: existing } = await supabase
      .from('doviz_kurlari')
      .select('*')
      .eq('tarih', tarih)
      .eq('para_birimi', pb)
      .maybeSingle()

    if (!existing) {
      const date = new Date(tarih)
      const kur = await fetchSingleRate(date, pb)
      if (kur) {
        await supabase.from('doviz_kurlari').upsert({
          tarih: kur.tarih,
          para_birimi: kur.para_birimi,
          alis: kur.alis,
          satis: kur.satis,
        })
      }
    }
  }
}

// Tek bir para birimi için TCMB'den kur çek
async function fetchFromTCMB(
  date: Date,
  paraBirimi: string,
  supabase: any
) {
  const kur = await fetchSingleRate(date, paraBirimi)
  if (!kur) return null

  // Önbelleğe yaz
  await supabase.from('doviz_kurlari').upsert({
    tarih: kur.tarih,
    para_birimi: kur.para_birimi,
    alis: kur.alis,
    satis: kur.satis,
  })

  return kur
}

async function fetchSingleRate(date: Date, paraBirimi: string) {
  // Frankfurter API kullan - ECB verileri, TCMB'ye yakın
  // Hafta sonu/tatil için 7 gün geriye dön
  for (let i = 0; i < 7; i++) {
    const d = new Date(date)
    d.setDate(d.getDate() - i)

    const yy  = String(d.getFullYear())
    const mm  = String(d.getMonth() + 1).padStart(2, '0')
    const dd  = String(d.getDate()).padStart(2, '0')
    const tarihStr = `${yy}-${mm}-${dd}`

    try {
      // Frankfurter API - EUR base
      const url = `https://api.frankfurter.app/${tarihStr}?from=EUR&to=${paraBirimi}`
      const res = await fetch(url)
      if (!res.ok) continue

      const data = await res.json()
      if (!data.rates || !data.rates[paraBirimi]) continue

      const rate = data.rates[paraBirimi]
      // Frankfurter EUR bazlı, biz USD bazlı istiyoruz
      // Önce USD/EUR alalım
      const usdUrl = `https://api.frankfurter.app/${tarihStr}?from=USD&to=EUR`
      const usdRes = await fetch(usdUrl)
      let usdToEur = 1.0
      
      if (usdRes.ok) {
        const usdData = await usdRes.json()
        if (usdData.rates && usdData.rates.EUR) {
          usdToEur = usdData.rates.EUR
        }
      }

      // EUR rate'ini USD'ye çevir: 
      // Örnek: EUR/USD = 1.08 ise (1 EUR = 1.08 USD)
      // EUR/TRY = 50.5 ise (1 EUR = 50.5 TRY)
      // USD/TRY = 50.5 / 1.08 = 46.75
      const eurToUsd = rate
      
      // TCMB formatına çevir: ForexBuying (Döviz Alış)
      // Frankfurter'dan gelen rate zaten direkt kur
      return { 
        tarih: tarihStr, 
        para_birimi: paraBirimi, 
        alis: rate / usdToEur,  // TRY için USD cinsinden
        satis: rate / usdToEur 
      }
    } catch (_) {
      continue
    }
  }
  return null
}

function parseRate(xml: string, kod: string) {
  // TCMB XML: <Currency CurrencyCode="USD"> ... <ForexBuying>...</ForexBuying> ...
  const block = xml.match(
    new RegExp(
      `<Currency[^>]*CurrencyCode="${kod}"[^>]*>([\\s\\S]*?)</Currency>`,
      'i'
    )
  )
  if (!block) return null

  const get = (tag: string) => {
    const m = block[1].match(new RegExp(`<${tag}>([\\d.]+)</${tag}>`, 'i'))
    return m ? parseFloat(m[1]) : null
  }

  const alis  = get('ForexBuying')
  const satis = get('ForexSelling')

  if (!alis || !satis) return null

  return { alis, satis }
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
