import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useMulkler, useMulkEkle } from '@/hooks/useMulkler'
import { useKiracilar, useKiraciEkle } from '@/hooks/useKiracilar'
import { useIslemEkle } from '@/hooks/useIslemler'
import { useKisiler } from '@/hooks/useKisiler'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

interface ParseResult {
  success: boolean
  data?: any
  error?: string
  row?: number
}

export default function VeriGirisi() {
  const { isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [veriTipi, setVeriTipi] = useState<string>('islem')
  const [pasteData, setPasteData] = useState('')
  const [parseResults, setParseResults] = useState<ParseResult[]>([])
  const [saving, setSaving] = useState(false)

  const { data: mulkler = [] } = useMulkler(false)
  const { data: kiracilar = [] } = useKiracilar({ sadecaAktif: false })
  const { data: kisiler = [] } = useKisiler()

  const ekleMulk = useMulkEkle()
  const ekleKiraci = useKiraciEkle()
  const ekleIslem = useIslemEkle()

  if (authLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Erişim Reddedildi</h2>
        <p className="text-muted-foreground mt-2">Bu sayfaya sadece adminler erişebilir.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Ana Sayfaya Dön
        </Button>
      </div>
    )
  }

  const parseIslemData = (lines: string[]): ParseResult[] => {
    const results: ParseResult[] = []
    const turMap: Record<string, string> = {
      'kira_tahakkuku': 'kira_tahakkuku',
      'kira_odeme_nakit': 'kira_odeme_nakit',
      'kira_odeme_banka': 'kira_odeme_banka',
      'kira_odeme_stopaj': 'kira_odeme_stopaj',
      'kira_odeme_depozitodan': 'kira_odeme_depozitodan',
      'masraf_kiradan_dusulen': 'masraf_kiradan_dusulen',
      'transfer': 'transfer',
      'depozito_nakit': 'depozito_nakit',
      'depozito_banka': 'depozito_banka',
      'depozito_iade': 'depozito_iade',
    }

    const pbMap: Record<string, string> = {
      'try': 'TRY', 'tl': 'TRY', 'lira': 'TRY', '₺': 'TRY',
      'usd': 'USD', '$': 'USD', 'dollar': 'USD',
      'eur': 'EUR', '€': 'EUR', 'euro': 'EUR',
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue
      
      const separator = line.includes('\t') ? '\t' : '|'
      const cols = line.split(separator).map(c => c.trim())
      
      if (cols.length < 4) {
        results.push({ success: false, error: 'En az 4 alan gerekli', row: results.length + 1 })
        continue
      }

      const [tarih, turStr, tutarStr, paraBirimiStr] = cols
      const mulkAdi = cols[4]?.toLowerCase().trim() || ''
      const kiraciAdi = cols[5]?.toLowerCase().trim() || ''
      const alanAdi = cols[6]?.toLowerCase().trim() || ''
      
      const mulkId = mulkAdi ? mulkler.find(m => m.ad.toLowerCase().trim() === mulkAdi || m.ad.toLowerCase().includes(mulkAdi))?.id : undefined
      const kiraciId = kiraciAdi ? kiracilar.find(k => k.ad.toLowerCase().trim() === kiraciAdi || k.ad.toLowerCase().includes(kiraciAdi))?.id : undefined
      const alanId = alanAdi ? kisiler.find(k => k.tam_ad.toLowerCase().trim() === alanAdi || k.tam_ad.toLowerCase().includes(alanAdi))?.id : undefined
      const aciklama = cols[7] || undefined

      const tur = turMap[turStr.toLowerCase()]
      if (!tur) {
        results.push({ success: false, error: 'Gecersiz tur: ' + turStr, row: results.length + 1 })
        continue
      }

      const tutar = parseFloat(tutarStr.replace(/[,\s]/g, ''))
      if (isNaN(tutar)) {
        results.push({ success: false, error: 'Gecersiz tutar: ' + tutarStr, row: results.length + 1 })
        continue
      }

      const hatalar: string[] = []
      if (mulkAdi && !mulkId) hatalar.push('Mulk bulunamadi: ' + cols[4])
      if (kiraciAdi && !kiraciId) hatalar.push('Kiraci bulunamadi: ' + cols[5])
      if (alanAdi && !alanId) hatalar.push('Odemy alan bulunamadi: ' + cols[6])
      
      const odemeTuru = tur === 'kira_odeme_nakit' || tur === 'kira_odeme_banka' || tur === 'kira_odeme_stopaj' || tur === 'kira_odeme_depozitodan'
      const depozitoTuru = tur === 'depozito_nakit' || tur === 'depozito_banka'
      
      if (tur === 'kira_tahakkuku' && !kiraciId) {
        hatalar.push('Kira tahakkuku icin kiraci zorunludur')
      }
      if ((odemeTuru || depozitoTuru) && !kiraciId) {
        hatalar.push(tur + ' icin kiraci zorunludur')
      }
      if ((odemeTuru || depozitoTuru) && !alanId) {
        hatalar.push(tur + ' icin odemeyi alan kisi zorunludur')
      }
      
      if (hatalar.length > 0) {
        results.push({ success: false, error: hatalar.join(', '), row: results.length + 1 })
        continue
      }

      const paraBirimi = pbMap[paraBirimiStr.toLowerCase()] || 'TRY'

      let parsedDate = tarih
      try {
        const d = new Date(tarih)
        if (!isNaN(d.getTime())) {
          parsedDate = format(d, 'yyyy-MM-dd')
        }
      } catch {}

      // doviz_kuru ve usd_tutari veritabanindaki trigger tarafindan hesaplanacak
      results.push({
        success: true,
        data: {
          tarih: parsedDate,
          tur,
          tutar,
          para_birimi: paraBirimi,
          mulk_id: mulkId || undefined,
          kiraci_id: kiraciId || undefined,
          odemeyi_alan: tur === 'kira_tahakkuku' ? undefined : (alanId || undefined),
          aciklama,
        },
      })
    }
    return results
  }

  const parseMulkData = (lines: string[]): ParseResult[] => {
    const results: ParseResult[] = []
    const pbMap: Record<string, string> = {
      'try': 'TRY', 'tl': 'TRY', 'lira': 'TRY', '₺': 'TRY',
      'usd': 'USD', '$': 'USD', 'dollar': 'USD',
      'eur': 'EUR', '€': 'EUR', 'euro': 'EUR',
    }

    lines.forEach((line) => {
      if (!line.trim()) return
      const separator = line.includes('\t') ? '\t' : '|'
      const cols = line.split(separator).map(c => c.trim())
      
      if (cols.length < 1) {
        results.push({ success: false, error: 'En az 1 alan gerekli', row: results.length + 1 })
        return
      }

      const ad = cols[0]
      const adres = cols[1] || undefined
      const fiyat = cols[2] ? parseFloat(cols[2].replace(/[,\s]/g, '')) : undefined
      const paraBirimi = cols[3] ? (pbMap[cols[3].toLowerCase()] || 'TRY') : 'TRY'

      results.push({
        success: true,
        data: {
          ad,
          adres,
          satin_alma_fiyati: fiyat,
          para_birimi: paraBirimi,
          baslangic_tarihi: format(new Date(), 'yyyy-MM-dd'),
        }
      })
    })
    return results
  }

  const parseKiraciData = (lines: string[]): ParseResult[] => {
    const results: ParseResult[] = []
    const pbMap: Record<string, string> = {
      'try': 'TRY', 'tl': 'TRY', 'lira': 'TRY', '₺': 'TRY',
      'usd': 'USD', '$': 'USD', 'dollar': 'USD',
      'eur': 'EUR', '€': 'EUR', 'euro': 'EUR',
    }

    lines.forEach((line) => {
      if (!line.trim()) return
      const separator = line.includes('\t') ? '\t' : '|'
      const cols = line.split(separator).map(c => c.trim())
      
      if (cols.length < 3) {
        results.push({ success: false, error: 'En az 3 alan gerekli', row: results.length + 1 })
        return
      }

      const mulkAd = cols[0]
      const ad = cols[1]
      const kiraTutar = parseFloat(cols[2].replace(/[,\s]/g, ''))
      const paraBirimi = cols[3] ? (pbMap[cols[3].toLowerCase()] || 'TRY') : 'TRY'
      const baslangic = cols[4] ? cols[4] : format(new Date(), 'yyyy-MM-dd')

      const mulkId = mulkler.find(m => m.ad.toLowerCase() === mulkAd.toLowerCase())?.id

      if (!mulkId) {
        results.push({ success: false, error: `Mülk bulunamadı: ${mulkAd}`, row: results.length + 1 })
        return
      }

      if (isNaN(kiraTutar)) {
        results.push({ success: false, error: `Geçersiz kira tutarı: ${cols[2]}`, row: results.length + 1 })
        return
      }

      results.push({
        success: true,
        data: {
          mulk_id: mulkId,
          ad,
          kira_tutari: kiraTutar,
          kira_para_birimi: paraBirimi,
          baslangic_tarihi: baslangic,
        },
      })
    })
    return results
  }

  const handleParse = () => {
    const lines = pasteData.split('\n')
    let results: ParseResult[] = []

    if (veriTipi === 'islem') {
      results = parseIslemData(lines)
    } else if (veriTipi === 'mulk') {
      results = parseMulkData(lines)
    } else if (veriTipi === 'kiraci') {
      results = parseKiraciData(lines)
    }

    setParseResults(results)
  }

  const handleSave = async () => {
    const validData = parseResults.filter(r => r.success && r.data)
    if (validData.length === 0) return

    setSaving(true)
    let basarili = 0
    let hatali = 0

    for (const result of validData) {
      try {
        if (veriTipi === 'islem') {
          await ekleIslem.mutateAsync(result.data)
        } else if (veriTipi === 'mulk') {
          await ekleMulk.mutateAsync(result.data)
        } else if (veriTipi === 'kiraci') {
          await ekleKiraci.mutateAsync(result.data)
        }
        basarili++
      } catch {
        hatali++
      }
    }

    setSaving(false)
    toast({
      title: `${basarili} kayıt eklendi`,
      description: hatali > 0 ? `${hatali} kayıt hatalı` : undefined,
      variant: hatali > 0 ? 'destructive' : 'default',
    })

    if (basarili > 0) {
      setPasteData('')
      setParseResults([])
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Toplu Veri Girişi"
        description="Excel'den kopyaladığınız verileri yapıştırın"
      />

      <Tabs value={veriTipi} onValueChange={setVeriTipi}>
        <TabsList>
          <TabsTrigger value="islem">İşlem</TabsTrigger>
          <TabsTrigger value="mulk">Mülk</TabsTrigger>
          <TabsTrigger value="kiraci">Kiracı</TabsTrigger>
        </TabsList>

        <TabsContent value="islem" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">İşlem Verisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Format: <code>Tarih | Tür | Tutar | Para Birimi | Mülk | Kiracı | Ödemeyi Alan | Açıklama</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Örnek: <code>2024-01-15	odeme_banka	15000	TRY	Kadıköy Dairesi	Ahmet Yılmaz	Can Barut	Kira</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Türler: kira_tahakkuku, kira_odeme_nakit, kira_odeme_banka, kira_odeme_stopaj, kira_odeme_depozitodan, masraf_kiradan_dusulen, transfer, depozito_nakit, depozito_banka, depozito_iade
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mülk Verisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Format: <code>Ad | Adres | Fiyat | Para Birimi</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Örnek: <code>Kadıköy Dairesi	Kadıköy/İstanbul	2500000	TRY</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kiraci" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Kiracı Verisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Format: <code>Mülk Adı | Kiracı Adı | Kira Tutarı | Para Birimi | Başlangıç Tarihi</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Örnek: <code>Kadıköy Dairesi	Ahmet Yılmaz	15000	TRY	2024-01-01</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Textarea
          placeholder="Excel'den kopyaladığınız verileri buraya yapıştırın..."
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleParse} disabled={!pasteData.trim()}>
            <Upload className="mr-2 h-4 w-4" />
            Verileri Parse Et
          </Button>
          {parseResults.length > 0 && (
            <Button onClick={handleSave} disabled={saving || parseResults.filter(r => r.success).length === 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {parseResults.filter(r => r.success).length} Kaydet
            </Button>
          )}
        </div>
      </div>

      {parseResults.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="max-h-60 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Satır</th>
                  <th className="px-3 py-2 text-left">Durum</th>
                  <th className="px-3 py-2 text-left">Detay</th>
                </tr>
              </thead>
              <tbody>
                {parseResults.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{r.row || i + 1}</td>
                    <td className="px-3 py-2">
                      {r.success ? (
                        <Badge variant="positive">Başarılı</Badge>
                      ) : (
                        <Badge variant="destructive">Hata</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.error || 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
