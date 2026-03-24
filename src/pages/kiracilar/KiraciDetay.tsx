import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageHeader from '@/components/shared/PageHeader'
import FileUpload from '@/components/shared/FileUpload'
import KiraciForm from '@/components/forms/KiraciForm'
import { useKiraci, useKiralamalar, useKiralamaEkle, useKiralamaGuncelle } from '@/hooks/useKiracilar'
import { useMulkler } from '@/hooks/useMulkler'
import { useIslemler } from '@/hooks/useIslemler'
import { useAuth } from '@/hooks/useAuth'
import { formatPara, formatTarih } from '@/lib/utils'
import { ISLEM_TURU_LABEL, Kiralama } from '@/types'
import { useMemo } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export default function KiraciDetay() {
  const { id } = useParams<{ id: string }>()
  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [kiraArtisiAcik, setKiraArtisiAcik] = useState(false)
  const [kiralamaDuzenleAcik, setKiralamaDuzenleAcik] = useState(false)
  const [selectedKiralama, setSelectedKiralama] = useState<Kiralama | null>(null)
  const [yeniBaslangic, setYeniBaslangic] = useState('')
  const [yeniKira, setYeniKira] = useState('')
  const [yeniParaBirimi, setYeniParaBirimi] = useState('')
  const [yeniMulkId, setYeniMulkId] = useState('')
  const [savingArtis, setSavingArtis] = useState(false)
  const { toast } = useToast()
  const { isAdmin } = useAuth()

  const { data: kiraci, isLoading } = useKiraci(id)
  const { data: kiralar = [] } = useKiralamalar({ kiraciId: id })
  const { data: mulkler = [] } = useMulkler(false)
  const { data: islemler = [] } = useIslemler({ kiraciId: id })
  const kiralamaEkle = useKiralamaEkle()
  const kiralamaGuncelle = useKiralamaGuncelle()

  // Aktif kiralama (en güncel)
  const aktifKiralama = kiralar[0]

  const bakiye = useMemo(() => {
    const sonuc: Record<string, number> = {}
    islemler.forEach(i => {
      // Tahakkuk: negatif (borç), Ödeme: pozitif (alacak)
      // Bakiye = tahakkuk + odeme
      if (i.tur === 'kira_tahakkuku') {
        sonuc[i.para_birimi] = (sonuc[i.para_birimi] ?? 0) + i.tutar
      }
      if (i.tur.startsWith('kira_odeme') || i.tur === 'masraf_kiradan_dusulen') {
        sonuc[i.para_birimi] = (sonuc[i.para_birimi] ?? 0) + i.tutar
      }
    })
    return sonuc
  }, [islemler])

  const depozito = useMemo(() => {
    let toplam = 0
    for (const i of islemler) {
      if (i.tur === 'depozito_nakit' || i.tur === 'depozito_banka') toplam += i.tutar
      if (i.tur === 'depozito_iade' || i.tur === 'kira_odeme_depozitodan') toplam -= Math.abs(i.tutar)
    }
    return toplam
  }, [islemler])

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Yükleniyor...</p>
  if (!kiraci) return <p className="p-6 text-destructive">Kiracı bulunamadı.</p>

  const handleKiraArtisi = async () => {
    if (!yeniBaslangic || !yeniKira || !yeniMulkId || !id) return

    setSavingArtis(true)
    try {
      // Eski kaydın bitiş tarihini yeni başlangıçtan 1 gün önce ayarla
      if (aktifKiralama) {
        const eskiBitis = new Date(yeniBaslangic)
        eskiBitis.setDate(eskiBitis.getDate() - 1)
        const eskiBitisStr = eskiBitis.toISOString().split('T')[0]

        await kiralamaGuncelle.mutateAsync({
          id: aktifKiralama.id,
          bitis_tarihi: eskiBitisStr,
        })
      }

      // Yeni kiralama kaydı oluştur
      await kiralamaEkle.mutateAsync({
        kiraci_id: id,
        mulk_id: yeniMulkId,
        kira_tutari: parseFloat(yeniKira),
        kira_para_birimi: yeniParaBirimi || aktifKiralama?.kira_para_birimi || 'TRY',
        baslangic_tarihi: yeniBaslangic,
        stopaj_takibi: aktifKiralama?.stopaj_takibi || false,
      })

      toast({ title: 'Kira artışı kaydedildi' })
      setKiraArtisiAcik(false)
      setYeniBaslangic('')
      setYeniKira('')
      setYeniMulkId('')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: err instanceof Error ? err.message : 'Bir hata oluştu' })
    }
    setSavingArtis(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/kiracilar">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={kiraci.ad}
          description={kiraci.uzun_ad}
          actions={
            isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setYeniKira(String(aktifKiralama?.kira_tutari || ''))
                  setYeniParaBirimi(aktifKiralama?.kira_para_birimi || 'TRY')
                  setYeniMulkId(aktifKiralama?.mulk_id || '')
                  setKiraArtisiAcik(true)
                }}>
                  <TrendingUp className="mr-1 h-3.5 w-3.5" />
                  Yeni Kira
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDuzenlemeAcik(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Düzenle
                </Button>
              </div>
            )
          }
        />
      </div>

      {/* Özet */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Kira</p>
            <p className="text-lg font-semibold tabular-nums">
              {aktifKiralama ? formatPara(aktifKiralama.kira_tutari, aktifKiralama.kira_para_birimi) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Mülk</p>
            <p className="text-sm font-medium">{aktifKiralama?.mulk?.ad ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Kira Başlangıcı</p>
            <p className="text-sm font-medium">{aktifKiralama ? formatTarih(aktifKiralama.baslangic_tarihi) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Bakiye</p>
            {Object.entries(bakiye).length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              Object.entries(bakiye).map(([pb, tutar]) => {
                const borclu = tutar < -0.000001
                return (
                  <p key={pb} className={`text-sm font-semibold tabular-nums ${borclu ? 'text-negative' : 'text-positive'}`}>
                    {formatPara(tutar, pb)}
                  </p>
                )
              })
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Depozito</p>
            <p className="text-sm font-semibold tabular-nums">
              {depozito ? formatPara(depozito, 'TRY') : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={!kiraci.kontrat_sonu || new Date(kiraci.kontrat_sonu) >= new Date() ? 'positive' : 'muted'}>
          {!kiraci.kontrat_sonu || new Date(kiraci.kontrat_sonu) >= new Date() ? 'Aktif' : 'Pasif'}
        </Badge>
        {aktifKiralama?.stopaj_takibi && <Badge variant="warning">Stopaj Takibi</Badge>}
        {kiraci.vergi_no && <Badge variant="secondary">VN: {kiraci.vergi_no}</Badge>}
      </div>

      <Tabs defaultValue="islemler">
        <TabsList>
          <TabsTrigger value="islemler">Ödeme Geçmişi</TabsTrigger>
          <TabsTrigger value="kiralar">Kiralama Geçmişi</TabsTrigger>
          <TabsTrigger value="belgeler">Belgeler</TabsTrigger>
        </TabsList>

        <TabsContent value="islemler" className="mt-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead className="text-right">USD Karşılığı</TableHead>
                  <TableHead>Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {islemler.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      İşlem yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  islemler.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{formatTarih(i.tarih)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={i.tur.startsWith('kira_odeme') ? 'positive' : i.tur === 'kira_tahakkuku' ? 'warning' : 'secondary'}
                          className="text-xs"
                        >
                          {ISLEM_TURU_LABEL[i.tur]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatPara(i.tutar, i.para_birimi)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {i.usd_tutari ? formatPara(i.usd_tutari, 'USD') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.aciklama ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="kiralar" className="mt-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mülk</TableHead>
                  <TableHead>Kira Tutarı</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kiralar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Kiralama yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  kiralar.map(k => (
                    <TableRow key={k.id}>
                      <TableCell>{k.mulk?.ad ?? '—'}</TableCell>
                      <TableCell className="tabular-nums font-medium">{formatPara(k.kira_tutari, k.kira_para_birimi)}</TableCell>
                      <TableCell>{formatTarih(k.baslangic_tarihi)}</TableCell>
                      <TableCell>{k.bitis_tarihi ? formatTarih(k.bitis_tarihi) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={!k.bitis_tarihi || new Date(k.bitis_tarihi) > new Date() ? 'positive' : 'muted'}>
                          {!k.bitis_tarihi || new Date(k.bitis_tarihi) > new Date() ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setSelectedKiralama(k)
                          setKiralamaDuzenleAcik(true)
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="belgeler" className="mt-4">
          <FileUpload iliskiTuru="kiraci" iliskiId={id!} />
        </TabsContent>
      </Tabs>

      <Dialog open={duzenlemeAcik} onOpenChange={setDuzenlemeAcik}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Kiracı Düzenle</DialogTitle></DialogHeader>
          <KiraciForm kiraci={kiraci} onSuccess={() => setDuzenlemeAcik(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={kiraArtisiAcik} onOpenChange={setKiraArtisiAcik}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yeni Kira</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Mevcut Kira:</p>
              <p className="text-xl font-semibold">
                {aktifKiralama ? formatPara(aktifKiralama.kira_tutari, aktifKiralama.kira_para_birimi) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Başlangıç: {aktifKiralama ? formatTarih(aktifKiralama.baslangic_tarihi) : '—'}</p>
            </div>

            <div className="space-y-2">
              <Label>Mülk</Label>
              <Select value={yeniMulkId} onValueChange={setYeniMulkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mülk seçin" />
                </SelectTrigger>
                <SelectContent>
                  {mulkler.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yeniKira">Yeni Kira Tutarı</Label>
              <div className="flex gap-2">
                <Input
                  id="yeniKira"
                  type="number"
                  step="0.01"
                  className="flex-1"
                  value={yeniKira}
                  onChange={(e) => setYeniKira(e.target.value)}
                  placeholder={String(aktifKiralama?.kira_tutari || '')}
                />
                <Select value={yeniParaBirimi} onValueChange={setYeniParaBirimi}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder={aktifKiralama?.kira_para_birimi || 'TRY'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yeniBaslangic">Yeni Başlangıç Tarihi</Label>
              <Input
                id="yeniBaslangic"
                type="date"
                value={yeniBaslangic}
                onChange={(e) => setYeniBaslangic(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Eski kaydın bitiş tarihi otomatik olarak bu tarihten 1 gün önce olacak
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setKiraArtisiAcik(false)}>İptal</Button>
              <Button onClick={handleKiraArtisi} disabled={savingArtis || !yeniBaslangic || !yeniKira || !yeniMulkId}>
                {savingArtis && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={kiralamaDuzenleAcik} onOpenChange={setKiralamaDuzenleAcik}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Kiralama Düzenle</DialogTitle></DialogHeader>
          {selectedKiralama && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Mülk</Label>
                  <Select
                    value={selectedKiralama.mulk_id}
                    onValueChange={(v) => setSelectedKiralama({ ...selectedKiralama, mulk_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Mülk seçin" /></SelectTrigger>
                    <SelectContent>
                      {mulkler.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="duzenleTutar">Kira Tutarı</Label>
                  <Input 
                    id="duzenleTutar" 
                    type="number" 
                    step="0.01"
                    defaultValue={selectedKiralama.kira_tutari}
                    onChange={(e) => setSelectedKiralama({...selectedKiralama, kira_tutari: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Para Birimi</Label>
                  <Select 
                    value={selectedKiralama.kira_para_birimi}
                    onValueChange={(v) => setSelectedKiralama({...selectedKiralama, kira_para_birimi: v})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="duzenleBaslangic">Kira Başlangıcı</Label>
                  <Input 
                    id="duzenleBaslangic" 
                    type="date" 
                    defaultValue={selectedKiralama.baslangic_tarihi}
                    onChange={(e) => setSelectedKiralama({...selectedKiralama, baslangic_tarihi: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="duzenleBitis">Kira Bitişi</Label>
                  <Input 
                    id="duzenleBitis" 
                    type="date" 
                    defaultValue={selectedKiralama.bitis_tarihi || ''}
                    onChange={(e) => setSelectedKiralama({...selectedKiralama, bitis_tarihi: e.target.value || undefined})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setKiralamaDuzenleAcik(false)}>İptal</Button>
                <Button onClick={async () => {
                  try {
                    await kiralamaGuncelle.mutateAsync({
                      id: selectedKiralama.id,
                      mulk_id: selectedKiralama.mulk_id,
                      kira_tutari: selectedKiralama.kira_tutari,
                      kira_para_birimi: selectedKiralama.kira_para_birimi,
                      baslangic_tarihi: selectedKiralama.baslangic_tarihi,
                      bitis_tarihi: selectedKiralama.bitis_tarihi || undefined,
                    })
                    toast({ title: 'Kiralama güncellendi' })
                    setKiralamaDuzenleAcik(false)
                  } catch (err) {
                    toast({ variant: 'destructive', title: 'Hata', description: err instanceof Error ? err.message : 'Bir hata oluştu' })
                  }
                }}>
                  Kaydet
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
