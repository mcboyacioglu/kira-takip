import { useEffect, useMemo, useState } from 'react'
import { useMulkler } from '@/hooks/useMulkler'
import { useIslemler } from '@/hooks/useIslemler'
import { supabase } from '@/lib/supabase'

type PB = 'TRY' | 'USD'

interface Row {
  kisi_id: string
  ortak_adi: string
  mulk_id: string
  mulk_adi: string
  hisse_yuzde: number
  alinan: number
  alinmasiGereken: number
  fark: number
  pb: PB
}

export function PartnerBalanceReport() {
  const [selectedMulk, setSelectedMulk] = useState<string>('')
  const { data: mulklerData = [], isLoading: mulklerYukleniyor } = useMulkler(false)
  const hisselerQuery = useMulklerDataHisseleri(mulklerData)
  const hisseler = hisselerQuery.hisseler
  const hisselerYukleniyor = hisselerQuery.loading
  const { data: islemler = [], isLoading: islemlerYukleniyor } = useIslemler()

  const rows = useMemo<Row[]>(() => {
    const byMulkPb: Record<string, number> = {}
    for (const i of islemler) {
      if (!i.mulk_id) continue
      if (i.tur !== 'kira_odeme_nakit' && i.tur !== 'kira_odeme_banka' && i.tur !== 'kira_odeme_depozitodan') continue
      const pb = (i.para_birimi === 'USD' ? 'USD' : 'TRY') as PB
      const key = `${i.mulk_id}__${pb}`
      byMulkPb[key] = (byMulkPb[key] ?? 0) + Number(i.tutar || 0)
    }

    const byOrtakMulkPb: Record<string, Row> = {}
    for (const h of hisseler) {
      const mulkId = h.mulk_id
      const mulkAd = h.mulk?.ad ?? '—'
      const ortakAd = h.kisi?.tam_ad ?? '—'
      const hisse = Number(h.hisse_orani || 0)
      const kisiId = h.kisi_id

      ;(['TRY', 'USD'] as PB[]).forEach((pb) => {
        const gelir = byMulkPb[`${mulkId}__${pb}`] ?? 0
        const alinmasiGereken = (gelir * hisse) / 100
        const odemeyiAlan = islemler
          .filter((i) => i.mulk_id === mulkId && i.odemeyi_alan === kisiId)
          .filter((i) => (pb === 'USD' ? i.para_birimi === 'USD' : i.para_birimi !== 'USD'))
          .filter((i) => i.tur === 'kira_odeme_nakit' || i.tur === 'kira_odeme_banka' || i.tur === 'kira_odeme_depozitodan')
          .reduce((s, i) => s + Number(i.tutar || 0), 0)

        const key = `${kisiId}__${mulkId}__${pb}`
        byOrtakMulkPb[key] = {
          kisi_id: kisiId,
          ortak_adi: ortakAd,
          mulk_id: mulkId,
          mulk_adi: mulkAd,
          hisse_yuzde: hisse,
          alinan: odemeyiAlan,
          alinmasiGereken,
          fark: odemeyiAlan - alinmasiGereken,
          pb,
        }
      })
    }

    return Object.values(byOrtakMulkPb)
  }, [hisseler, islemler])

  const filtered = useMemo(() => {
    return selectedMulk ? rows.filter((r) => r.mulk_id === selectedMulk) : rows
  }, [rows, selectedMulk])

  const mulkler = useMemo(
    () =>
      Array.from(new Map(rows.map((r) => [r.mulk_id, { id: r.mulk_id, ad: r.mulk_adi }])).values()).sort((a, b) =>
        a.ad.localeCompare(b.ad)
      ),
    [rows]
  )

  const byPb = useMemo(() => {
    const out: Record<PB, Row[]> = { TRY: [], USD: [] }
    filtered.forEach((r) => out[r.pb].push(r))
    return out
  }, [filtered])

  const fmt = (n: number, pb: PB) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: pb, maximumFractionDigits: 0 }).format(n)

  const loading = hisselerYukleniyor || islemlerYukleniyor || mulklerYukleniyor

  const renderPBSection = (pb: PB) => {
    const list = byPb[pb]
    const totalAlinan = list.reduce((s, r) => s + r.alinan, 0)
    const totalGereken = list.reduce((s, r) => s + r.alinmasiGereken, 0)

    const byOrtak = Array.from(new Set(list.map((r) => r.ortak_adi))).map((ortak) => {
      const rows = list.filter((r) => r.ortak_adi === ortak)
      const alinan = rows.reduce((s, r) => s + r.alinan, 0)
      const gereken = rows.reduce((s, r) => s + r.alinmasiGereken, 0)
      return { ortak, alinan, gereken, fark: alinan - gereken }
    })

    const borclular = byOrtak.filter((o) => o.fark > 0.01).sort((a, b) => b.fark - a.fark)
    const alacaklilar = byOrtak.filter((o) => o.fark < -0.01).sort((a, b) => a.fark - b.fark)

    const transferler: Array<{ from: string; to: string; amount: number }> = []
    let i = 0
    let j = 0
    const b = borclular.map((x) => ({ ...x }))
    const a = alacaklilar.map((x) => ({ ...x }))
    while (i < b.length && j < a.length) {
      const pay = Math.min(b[i].fark, Math.abs(a[j].fark))
      if (pay > 0.01) {
        transferler.push({ from: b[i].ortak, to: a[j].ortak, amount: pay })
        b[i].fark -= pay
        a[j].fark += pay
      }
      if (b[i].fark <= 0.01) i++
      if (Math.abs(a[j].fark) <= 0.01) j++
    }

    return (
      <div className="rounded-xl border border-border p-4 space-y-4">
        <h3 className="text-lg font-semibold">{pb} Ortak Raporu</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Toplam Alınan</div>
            <div className="font-semibold">{fmt(totalAlinan, pb)}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Toplam Alınması Gereken</div>
            <div className="font-semibold">{fmt(totalGereken, pb)}</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left py-2 px-3">Ortak</th>
                <th className="text-right py-2 px-3">Alınan</th>
                <th className="text-right py-2 px-3">Alınması Gereken</th>
                <th className="text-right py-2 px-3">Fark</th>
              </tr>
            </thead>
            <tbody>
              {byOrtak.map((o) => (
                <tr key={`${pb}-${o.ortak}`} className="border-b border-border">
                  <td className="py-2 px-3 font-medium">{o.ortak}</td>
                  <td className="text-right py-2 px-3">{fmt(o.alinan, pb)}</td>
                  <td className="text-right py-2 px-3">{fmt(o.gereken, pb)}</td>
                  <td className={`text-right py-2 px-3 font-semibold ${o.fark > 0 ? 'text-negative' : o.fark < 0 ? 'text-positive' : 'text-muted-foreground'}`}>
                    {o.fark > 0 ? '+' : ''}{fmt(o.fark, pb)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border p-3">
          <div className="font-medium mb-2">Borç Kapama Önerisi</div>
          {transferler.length === 0 ? (
            <div className="text-sm text-muted-foreground">Dengeleme gerekmiyor.</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {transferler.map((t, idx) => (
                <li key={`${pb}-t-${idx}`} className="flex justify-between">
                  <span><b>{t.from}</b> ➜ <b>{t.to}</b></span>
                  <span className="font-semibold">{fmt(t.amount, pb)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <h2 className="text-2xl font-bold">Ortaklar Arası Borç / Alacak</h2>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Mülk Filtresi</label>
        <select
          value={selectedMulk}
          onChange={(e) => setSelectedMulk(e.target.value)}
          className="w-full max-w-xs border border-border rounded-lg px-4 py-2 bg-background"
        >
          <option value="">Tüm Mülkler</option>
          {mulkler.map((m) => (
            <option key={m.id} value={m.id}>{m.ad}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {renderPBSection('TRY')}
          {renderPBSection('USD')}
        </div>
      )}
    </div>
  )
}

export default PartnerBalanceReport

function useMulklerDataHisseleri(mulkler: Array<{ id: string }>) {
  const [hisseler, setHisseler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        const results = await Promise.all(
          mulkler.map(async (m) => {
            const { data } = await supabase
              .from('mulk_hisseleri')
              .select('id, mulk_id, kisi_id, hisse_orani, kisi:kisiler(tam_ad), mulk:mulkler(ad)')
              .eq('mulk_id', m.id)
            return data || []
          })
        )
        if (alive) setHisseler(results.flat())
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [mulkler])

  return { hisseler, loading }
}
