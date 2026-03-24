import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts'
import PageHeader from '@/components/shared/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useIslemler } from '@/hooks/useIslemler'
import { useMulkler } from '@/hooks/useMulkler'
import { formatPara } from '@/lib/utils'

const DONEM_SECENEKLERI = [
  { label: 'Bu Ay', key: 'bu_ay' },
  { label: 'Geçen Ay', key: 'gecen_ay' },
  { label: 'Son 3 Ay', key: 'son_3_ay' },
  { label: 'Son 6 Ay', key: 'son_6_ay' },
  { label: 'Bu Yıl', key: 'bu_yil' },
  { label: 'Özel', key: 'ozel' },
]

function donemTarihleri(donem: string): { baslangic: string; bitis: string } {
  const bugun = new Date()
  switch (donem) {
    case 'bu_ay':
      return { baslangic: format(startOfMonth(bugun), 'yyyy-MM-dd'), bitis: format(endOfMonth(bugun), 'yyyy-MM-dd') }
    case 'gecen_ay': {
      const gecen = subMonths(bugun, 1)
      return { baslangic: format(startOfMonth(gecen), 'yyyy-MM-dd'), bitis: format(endOfMonth(gecen), 'yyyy-MM-dd') }
    }
    case 'son_3_ay':
      return { baslangic: format(startOfMonth(subMonths(bugun, 2)), 'yyyy-MM-dd'), bitis: format(endOfMonth(bugun), 'yyyy-MM-dd') }
    case 'son_6_ay':
      return { baslangic: format(startOfMonth(subMonths(bugun, 5)), 'yyyy-MM-dd'), bitis: format(endOfMonth(bugun), 'yyyy-MM-dd') }
    case 'bu_yil':
      return { baslangic: format(startOfYear(bugun), 'yyyy-MM-dd'), bitis: format(endOfYear(bugun), 'yyyy-MM-dd') }
    default:
      return { baslangic: format(startOfMonth(bugun), 'yyyy-MM-dd'), bitis: format(endOfMonth(bugun), 'yyyy-MM-dd') }
  }
}

export default function Raporlar() {
  const [donem, setDonem] = useState('bu_yil')
  const [ozelBaslangic, setOzelBaslangic] = useState('')
  const [ozelBitis, setOzelBitis] = useState('')
  const [paraBirimiFiltre, setParaBirimiFiltre] = useState('USD')
  const [mulkFiltre, setMulkFiltre] = useState<string>('hepsi')

  const { baslangic, bitis } = donem === 'ozel'
    ? { baslangic: ozelBaslangic, bitis: ozelBitis }
    : donemTarihleri(donem)

  const { data: mulkler = [] } = useMulkler(false)
  const { data: islemler = [], isLoading } = useIslemler({ baslangic, bitis })

  const filtreliIslemler = useMemo(
    () => islemler.filter(i => 
      mulkFiltre === 'hepsi' || i.mulk_id === mulkFiltre
    ),
    [islemler, mulkFiltre]
  )

  const donusturulmusIslemler = useMemo(() => 
    filtreliIslemler.map(i => ({
      ...i,
      donusturulmusTutar: paraBirimiFiltre === 'TRY' 
        ? (i.try_tutari ?? i.tutar)
        : (i.usd_tutari ?? i.tutar)
    })),
    [filtreliIslemler, paraBirimiFiltre]
  )

  const aylikVeri = useMemo(() => {
    const aylar: Record<string, { ayKey: string; ay: string; tahakkuk: number; tahsilat: number; masraf_kiradan_dusulen: number }> = {}
    const trAylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    donusturulmusIslemler.forEach(i => {
      const ayKey = i.tarih.slice(0, 7)
      if (!aylar[ayKey]) {
        const ay = parseInt(ayKey.split('-')[1])
        const yil = ayKey.split('-')[0]
        aylar[ayKey] = { ayKey, ay: `${trAylar[ay - 1]} ${yil}`, tahakkuk: 0, tahsilat: 0, masraf_kiradan_dusulen: 0 }
      }
      if (i.tur === 'kira_tahakkuku') aylar[ayKey].tahakkuk += i.donusturulmusTutar
      // Kira ödemeleri + masraf_kiradan_dusulen (tahsilata eklenir)
      if (i.tur === 'kira_odeme_nakit' || i.tur === 'kira_odeme_banka' || i.tur === 'kira_odeme_depozitodan') aylar[ayKey].tahsilat += i.donusturulmusTutar
      if (i.tur === 'masraf_kiradan_dusulen') aylar[ayKey].tahsilat += i.donusturulmusTutar
    })
    
    // Sirala ve kümülatif bakiye hesapla
    const siraliAylar = Object.values(aylar).sort((a, b) => a.ayKey.localeCompare(b.ayKey))
    let oncekiBakiye = 0
    siraliAylar.forEach(ay => {
      ay.tahsilat // tip koruma
      const buAyBakiye = ay.tahsilat + ay.tahakkuk - ay.masraf_kiradan_dusulen
      oncekiBakiye += buAyBakiye
      ;(ay as any).kumulatifBakiye = oncekiBakiye
    })
    return siraliAylar
  }, [donusturulmusIslemler])

  const kiraciRaporu = useMemo(() => {
    const rapor: Record<string, { ad: string; mulk: string; tahakkuk: number; odeme: number; bakiye: number }> = {}
    donusturulmusIslemler.forEach(i => {
      if (!i.kiraci_id) return
      // Aynı kiracı farklı mülklerde olabilir, key olarak kiraci_id kullan
      if (!rapor[i.kiraci_id]) {
        rapor[i.kiraci_id] = { 
          ad: i.kiraci?.ad ?? '?', 
          mulk: i.mulk?.ad ?? '-',
          tahakkuk: 0, 
          odeme: 0, 
          bakiye: 0 
        }
      }
      if (i.tur === 'kira_tahakkuku') rapor[i.kiraci_id].tahakkuk += i.donusturulmusTutar
      // Kira ödemeleri + masraf_kiradan_dusulen (kira ödemesi gibi sayılır)
      if (i.tur === 'kira_odeme_nakit' || i.tur === 'kira_odeme_banka' || i.tur === 'kira_odeme_depozitodan' || i.tur === 'masraf_kiradan_dusulen') rapor[i.kiraci_id].odeme += i.donusturulmusTutar
    })
    // Tahakkuk negatif (borç), odeme pozitif (alacak). Bakiye = tahakkuk + odeme
    Object.values(rapor).forEach(r => { r.bakiye = r.tahakkuk + r.odeme })
    return Object.values(rapor).sort((a, b) => b.tahakkuk - a.tahakkuk)
  }, [donusturulmusIslemler])

  const mulkRaporu = useMemo(() => {
    const rapor: Record<string, { ad: string; gelir: number; gider: number; net: number }> = {}
    donusturulmusIslemler.forEach(i => {
      if (!i.mulk_id) return
      if (!rapor[i.mulk_id]) {
        rapor[i.mulk_id] = { ad: i.mulk?.ad ?? '?', gelir: 0, gider: 0, net: 0 }
      }
      if (i.tur === 'kira_odeme_nakit' || i.tur === 'kira_odeme_banka' || i.tur === 'kira_odeme_depozitodan') rapor[i.mulk_id].gelir += i.donusturulmusTutar
      if (i.tur === 'masraf_kiradan_dusulen') rapor[i.mulk_id].gider += i.donusturulmusTutar
    })
    Object.values(rapor).forEach(r => { r.net = r.gelir - r.gider })
    return Object.values(rapor).sort((a, b) => b.net - a.net)
  }, [donusturulmusIslemler])

  const toplamTahakkuk = useMemo(() => donusturulmusIslemler.filter(i => i.tur === 'kira_tahakkuku').reduce((s, i) => s + i.donusturulmusTutar, 0), [donusturulmusIslemler])
  const toplamTahsilat = useMemo(() => donusturulmusIslemler.filter(i => i.tur === 'kira_odeme_nakit' || i.tur === 'kira_odeme_banka' || i.tur === 'kira_odeme_depozitodan' || i.tur === 'masraf_kiradan_dusulen').reduce((s, i) => s + i.donusturulmusTutar, 0), [donusturulmusIslemler])
  const toplamBakiye = toplamTahsilat + toplamTahakkuk

  return (
    <div className="space-y-6">
      <PageHeader title="Raporlar" description="Dönemsel analiz ve gelir-gider özeti" />

      <div className="flex flex-wrap gap-3">
        <Select value={donem} onValueChange={setDonem}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DONEM_SECENEKLERI.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {donem === 'ozel' && (
          <>
            <Input type="date" value={ozelBaslangic} onChange={e => setOzelBaslangic(e.target.value)} className="w-40" />
            <Input type="date" value={ozelBitis} onChange={e => setOzelBitis(e.target.value)} className="w-40" />
          </>
        )}
        <Select value={paraBirimiFiltre} onValueChange={setParaBirimiFiltre}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD $</SelectItem>
            <SelectItem value="TRY">TRY ₺</SelectItem>
          </SelectContent>
        </Select>
        <Select value={mulkFiltre} onValueChange={setMulkFiltre}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Mülk seçin" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm Mülkler</SelectItem>
            {mulkler.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Toplam Tahakkuk</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-warning">{formatPara(toplamTahakkuk, paraBirimiFiltre)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Toplam Tahsilat</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-positive">{formatPara(toplamTahsilat, paraBirimiFiltre)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Bakiye</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${toplamBakiye >= 0 ? 'text-positive' : 'text-negative'}`}>{formatPara(toplamBakiye, paraBirimiFiltre)}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="ozet">
        <TabsList>
          <TabsTrigger value="ozet">Özet</TabsTrigger>
          <TabsTrigger value="grafik">Grafik</TabsTrigger>
          <TabsTrigger value="kiraci">Kiracı Bazlı</TabsTrigger>
          <TabsTrigger value="mulk">Mülk Bazlı</TabsTrigger>
        </TabsList>

        <TabsContent value="ozet" className="mt-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : aylikVeri.length === 0 ? (
            <p className="text-sm text-muted-foreground">Seçilen dönemde veri yok.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Ay</TableHead><TableHead className="text-right">Tahakkuk</TableHead><TableHead className="text-right">Tahsilat</TableHead><TableHead className="text-right">Masraf</TableHead><TableHead className="text-right">Dönem Bakiyesi</TableHead><TableHead className="text-right">Kümülatif</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {aylikVeri.map(ay => {
                    const bakiye = ay.tahsilat + ay.tahakkuk
                    const kumulatif = (ay as any).kumulatifBakiye || 0
                    return (
                      <TableRow key={ay.ay}>
                        <TableCell className="font-medium">{ay.ay}</TableCell>
                        <TableCell className="text-right tabular-nums text-warning">{formatPara(ay.tahakkuk, paraBirimiFiltre)}</TableCell>
                        <TableCell className="text-right tabular-nums text-positive">{formatPara(ay.tahsilat, paraBirimiFiltre)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">-</TableCell>
                        <TableCell className={`text-right tabular-nums ${bakiye >= 0 ? 'text-positive' : 'text-negative'}`}>{formatPara(bakiye, paraBirimiFiltre)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${kumulatif >= 0 ? 'text-positive' : 'text-negative'}`}>{formatPara(kumulatif, paraBirimiFiltre)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grafik" className="mt-4 space-y-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> : aylikVeri.length === 0 ? (
            <p className="text-sm text-muted-foreground">Seçilen dönemde veri yok.</p>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Aylık Tahakkuk vs Tahsilat</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={aylikVeri}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 18%)" />
                      <XAxis dataKey="ay" tick={{ fill: 'hsl(240 5% 55%)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(240 5% 55%)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'hsl(240 10% 11%)', border: '1px solid hsl(240 5% 18%)', borderRadius: '8px' }} formatter={(v: number) => formatPara(v, paraBirimiFiltre)} />
                      <Legend />
                      <Bar dataKey="tahakkuk" name="Tahakkuk" fill="hsl(38 92% 57%)" radius={[4,4,0,0]} />
                      <Bar dataKey="tahsilat" name="Tahsilat" fill="hsl(152 64% 52%)" radius={[4,4,0,0]} />
                      <Bar dataKey="masraf_kiradan_dusulen" name="Masraf" fill="hsl(0 65% 68%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Net Akış</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={aylikVeri.map(d => ({ ...d, net: d.tahsilat - d.masraf_kiradan_dusulen }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 18%)" />
                      <XAxis dataKey="ay" tick={{ fill: 'hsl(240 5% 55%)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(240 5% 55%)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'hsl(240 10% 11%)', border: '1px solid hsl(240 5% 18%)', borderRadius: '8px' }} formatter={(v: number) => formatPara(v, paraBirimiFiltre)} />
                      <Line dataKey="net" name="Net" stroke="hsl(252 89% 70%)" strokeWidth={2} dot={{ fill: 'hsl(252 89% 70%)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="kiraci" className="mt-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Kiracı</TableHead><TableHead>Mülk</TableHead><TableHead className="text-right">Tahakkuk</TableHead><TableHead className="text-right">Tahsilat</TableHead><TableHead className="text-right">Bakiye</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {kiraciRaporu.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Veri yok.</TableCell></TableRow>
                ) : (
                  kiraciRaporu.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.ad}</TableCell>
                      <TableCell className="text-muted-foreground">{r.mulk}</TableCell>
                      <TableCell className="text-right tabular-nums text-warning">{formatPara(r.tahakkuk, paraBirimiFiltre)}</TableCell>
                      <TableCell className="text-right tabular-nums text-positive">{formatPara(r.odeme, paraBirimiFiltre)}</TableCell>
                      <TableCell className="text-right tabular-nums"><Badge variant={r.bakiye > 0 ? 'negative' : 'positive'}>{formatPara(Math.abs(r.bakiye), paraBirimiFiltre)}{r.bakiye > 0 ? ' Borç' : ' Fazla'}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="mulk" className="mt-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Mülk</TableHead><TableHead className="text-right">Gelir</TableHead><TableHead className="text-right">Gider</TableHead><TableHead className="text-right">Net</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {mulkRaporu.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Veri yok.</TableCell></TableRow>
                ) : (
                  mulkRaporu.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.ad}</TableCell>
                      <TableCell className="text-right tabular-nums text-positive">{formatPara(r.gelir, paraBirimiFiltre)}</TableCell>
                      <TableCell className="text-right tabular-nums text-negative">{formatPara(r.gider, paraBirimiFiltre)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold"><span className={r.net >= 0 ? 'text-positive' : 'text-negative'}>{formatPara(r.net, paraBirimiFiltre)}</span></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
