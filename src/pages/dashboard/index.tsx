import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  BadgeAlert,
} from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import { useKiracilar, useKiralamalar } from '@/hooks/useKiracilar'
import { useMulkler } from '@/hooks/useMulkler'
import { useIslemler } from '@/hooks/useIslemler'
import { formatPara, formatTarih, paraBirimiSembol } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ISLEM_TURU_LABEL } from '@/types'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const { data: kiracilar = [], isLoading: kiracilarYukleniyor } = useKiracilar({})
  const { data: kiralar = [] } = useKiralamalar({ sadecaAktif: true })
  const { data: mulkler = [], isLoading: mulklerYukleniyor } = useMulkler(true)
  const buAyBaslangic = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const buAyBitis = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: sonIslemler = [], isLoading: islemlerYukleniyor } = useIslemler({ limit: 10 })
  const { data: buAyIslemler = [] } = useIslemler({ baslangic: buAyBaslangic, bitis: buAyBitis })
  const { data: tumIslemler = [], isLoading: tumIslemlerYukleniyor } = useIslemler()

  const aktifKiracilar = useMemo(() => {
    const bugun = format(new Date(), 'yyyy-MM-dd')
    return kiracilar.filter(k => !k.kontrat_sonu || k.kontrat_sonu >= bugun)
  }, [kiracilar])

  const buAyTahsilat = useMemo(() => {
    const toplam: Record<string, number> = {}
    buAyIslemler
      .filter(i => i.tur === 'kira_odeme_nakit' || i.tur === 'kira_odeme_banka' || i.tur === 'kira_odeme_depozitodan')
      .forEach(i => {
        toplam[i.para_birimi] = (toplam[i.para_birimi] ?? 0) + i.tutar
      })
    return toplam
  }, [buAyIslemler])

  const buAyBeklenen = useMemo(() => {
    const toplam: Record<string, number> = {}
    kiralar.forEach(k => {
      toplam[k.kira_para_birimi] = (toplam[k.kira_para_birimi] ?? 0) + k.kira_tutari
    })
    return toplam
  }, [kiralar])

  const gecikmisToplam = useMemo(() => {
    const tahakkuk: Record<string, number> = {}
    const odeme: Record<string, number> = {}
    const gecmis = format(new Date(), 'yyyy-MM-dd')
    buAyIslemler
      .filter(i => i.tarih <= gecmis && i.tur === 'kira_tahakkuku')
      .forEach(i => { tahakkuk[i.para_birimi] = (tahakkuk[i.para_birimi] ?? 0) + i.tutar })
    buAyIslemler
      .filter(i => i.tur === 'kira_odeme_nakit' || i.tur === 'kira_odeme_banka' || i.tur === 'kira_odeme_depozitodan')
      .forEach(i => { odeme[i.para_birimi] = (odeme[i.para_birimi] ?? 0) + i.tutar })

    const sonuc: Record<string, number> = {}
    Object.keys(tahakkuk).forEach(pb => {
      const fark = (tahakkuk[pb] ?? 0) - (odeme[pb] ?? 0)
      if (fark > 0) sonuc[pb] = fark
    })
    return sonuc
  }, [buAyIslemler])

  const formatCokluPara = (toplam: Record<string, number>) => {
    const entries = Object.entries(toplam)
    if (entries.length === 0) return '0'
    return entries.map(([pb, t]) => formatPara(t, pb)).join(' | ')
  }

  const toplamKiraciBorcu = useMemo(() => {
    const kiraciParaBakiye: Record<string, Record<string, number>> = {}
    for (const i of tumIslemler) {
      if (!i.kiraci_id) continue
      if (!kiraciParaBakiye[i.kiraci_id]) kiraciParaBakiye[i.kiraci_id] = {}
      if (!kiraciParaBakiye[i.kiraci_id][i.para_birimi]) kiraciParaBakiye[i.kiraci_id][i.para_birimi] = 0

      if (i.tur === 'kira_tahakkuku') kiraciParaBakiye[i.kiraci_id][i.para_birimi] += i.tutar
      if (i.tur.startsWith('kira_odeme') || i.tur === 'masraf_kiradan_dusulen') kiraciParaBakiye[i.kiraci_id][i.para_birimi] += i.tutar
    }

    const borcToplam: Record<string, number> = {}
    for (const paraBakiye of Object.values(kiraciParaBakiye)) {
      for (const [pb, bakiye] of Object.entries(paraBakiye)) {
        if (bakiye < 0) borcToplam[pb] = (borcToplam[pb] ?? 0) + Math.abs(bakiye)
      }
    }
    return borcToplam
  }, [tumIslemler])

  return (
    <div className="space-y-6">
      <PageHeader title="Ana Sayfa" description="Genel bakış ve son işlemler" />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Aktif Kiracı / Mülk"
          value={`${aktifKiracilar.length}/${mulkler.length}`}
          icon={Users}
          loading={kiracilarYukleniyor || mulklerYukleniyor}
        />
        <StatCard
          title="Toplam Kiracı Borcu"
          value={<span className="text-negative">{formatCokluPara(toplamKiraciBorcu)}</span>}
          icon={BadgeAlert}
          loading={tumIslemlerYukleniyor}
        />
        <StatCard
          title="Bu Ay Beklenen"
          value={<span className="text-warning">{formatCokluPara(buAyBeklenen)}</span>}
          icon={TrendingUp}
          loading={kiracilarYukleniyor}
        />
        <StatCard
          title="Bu Ay Tahsilat"
          value={<span className="text-positive">{formatCokluPara(buAyTahsilat)}</span>}
          icon={TrendingUp}
          loading={islemlerYukleniyor}
        />
      </div>

      {/* Gecikmiş kira uyarısı */}
      {Object.keys(gecikmisToplam).length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3">
          <BadgeAlert className="h-5 w-5 shrink-0 text-negative" />
          <p className="text-sm">
            <span className="font-semibold text-negative">Gecikmiş kira: </span>
            {formatCokluPara(gecikmisToplam)}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Son işlemler */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Son İşlemler</CardTitle>
            <Link
              to="/islemler"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Tümü <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {islemlerYukleniyor ? (
              <p className="p-6 text-sm text-muted-foreground">Yükleniyor...</p>
            ) : sonIslemler.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Henüz işlem yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Kiracı / Mülk</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sonIslemler.map((islem) => (
                    <TableRow key={islem.id}>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatTarih(islem.tarih)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={islem.tur.startsWith('kira_odeme') ? 'positive' : islem.tur === 'masraf_kiradan_dusulen' ? 'negative' : 'secondary'}
                          className="text-xs"
                        >
                          {ISLEM_TURU_LABEL[islem.tur]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {islem.kiraci?.ad ?? islem.mulk?.ad ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {formatPara(islem.tutar, islem.para_birimi)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Aktif kiracılar özeti */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Aktif Kiracılar</CardTitle>
            <Link
              to="/kiracilar"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Tümü <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {kiracilarYukleniyor ? (
              <p className="p-6 text-sm text-muted-foreground">Yükleniyor...</p>
            ) : aktifKiracilar.length === 0 ? (
              <div className="p-6 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aktif kiracı yok</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {kiralar.filter(k => aktifKiracilar.some(ak => ak.id === k.kiraci_id)).slice(0, 8).map((k) => {
                  const kiraci = aktifKiracilar.find(kc => kc.id === k.kiraci_id)
                  return (
                    <li key={k.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                      <div>
                        <Link to={`/kiracilar/${k.kiraci_id}`} className="text-sm font-medium hover:text-primary transition-colors">
                          {kiraci?.ad || '—'}
                        </Link>
                        <p className="text-xs text-muted-foreground">{k.mulk?.ad}</p>
                      </div>
                      <span className="tabular-nums text-sm font-medium">
                        {formatPara(k.kira_tutari, k.kira_para_birimi, paraBirimiSembol(k.kira_para_birimi))}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
