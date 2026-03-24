import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, Building2 } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import KiraciForm from '@/components/forms/KiraciForm'
import { useKiracilar, useKiralamalar } from '@/hooks/useKiracilar'
import { useIslemler } from '@/hooks/useIslemler'
import { useMulkler } from '@/hooks/useMulkler'
import { useAuth } from '@/hooks/useAuth'
import { formatPara, formatTarih } from '@/lib/utils'

export default function KiracilarListesi() {
  const [formAcik, setFormAcik] = useState(false)
  const [mulkFiltre, setMulkFiltre] = useState<string>('')
  const [durumFiltre, setDurumFiltre] = useState<string>('aktif')
  const { isAdmin } = useAuth()

  const sadecaAktif = durumFiltre === 'aktif'

  // Tum kiracilar (Tumu icin)
  const { data: tumKiracilar = [], isLoading: kiracilarYukleniyor } = useKiracilar()
  
  // Aktif kiralar (Aktif icin)
  const { data: kiralar = [], isLoading: kiralarYukleniyor } = useKiralamalar({ sadecaAktif: true })
  const { data: islemler = [], isLoading: islemlerYukleniyor } = useIslemler()

  const { data: mulkler = [] } = useMulkler(false)

  // Kiracilari birleştir
  const kiracilarVeKiralar = useMemo(() => {
    if (sadecaAktif) {
      // Aktif: kontrat_sonu boş veya gelecekte olan kiracılar
      const bugunStr = new Date().toISOString().split('T')[0]
      return tumKiracilar
        .filter(k => !k.kontrat_sonu || k.kontrat_sonu >= bugunStr)
        .map(k => {
          const kiraciKiralama = kiralar.find(kr => kr.kiraci_id === k.id)
          return {
            ...k,
            kiralama: kiraciKiralama,
            mulk: kiraciKiralama?.mulk,
          }
        })
    } else {
      // Tumu: tum kiracilar, kiralama bilgisi varsa ekle
      return tumKiracilar.map(k => {
        // Bu kiracinin en son kiralama kaydini bul
        const kiraciKiralama = kiralar.find(kr => kr.kiraci_id === k.id)
        return {
          ...k,
          kiralama: kiraciKiralama,
          mulk: kiraciKiralama?.mulk
        }
      })
    }
  }, [tumKiracilar, kiralar, sadecaAktif])

  // Mulk filtresi uygula
  const filtreliKiracilar = useMemo(() => {
    if (!mulkFiltre) return kiracilarVeKiralar
    return kiracilarVeKiralar.filter(k => k.kiralama?.mulk_id === mulkFiltre)
  }, [kiracilarVeKiralar, mulkFiltre])

  // Sirala
  const siraliKiracilar = useMemo(() => {
    return [...filtreliKiracilar].sort((a, b) =>
      (a.ad ?? '').localeCompare(b.ad ?? '')
    )
  }, [filtreliKiracilar])

  const depozitoMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const i of islemler) {
      if (!i.kiraci_id) continue
      if (!map[i.kiraci_id]) map[i.kiraci_id] = 0

      if (i.tur === 'depozito_nakit' || i.tur === 'depozito_banka') {
        map[i.kiraci_id] += i.tutar
      }
      if (i.tur === 'depozito_iade' || i.tur === 'kira_odeme_depozitodan') {
        map[i.kiraci_id] -= Math.abs(i.tutar)
      }
    }
    return map
  }, [islemler])

  const bakiyeMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const i of islemler) {
      if (!i.kiraci_id) continue
      if (!map[i.kiraci_id]) map[i.kiraci_id] = {}
      if (!map[i.kiraci_id][i.para_birimi]) map[i.kiraci_id][i.para_birimi] = 0

      if (i.tur === 'kira_tahakkuku') {
        map[i.kiraci_id][i.para_birimi] += i.tutar
      }
      if (i.tur.startsWith('kira_odeme') || i.tur === 'masraf_kiradan_dusulen') {
        map[i.kiraci_id][i.para_birimi] += i.tutar
      }
    }
    return map
  }, [islemler])

  const isLoading = kiracilarYukleniyor || kiralarYukleniyor || islemlerYukleniyor
  const bugun = new Date()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiracılar"
        description="Tüm kiracı kayıtları"
        actions={
          isAdmin && (
            <Button onClick={() => setFormAcik(true)} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Yeni Kiracı
            </Button>
          )
        }
      />

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <Select value={durumFiltre} onValueChange={setDurumFiltre}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tumu">Tümü</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
          </SelectContent>
        </Select>
        <Select value={mulkFiltre || 'all'} onValueChange={(v) => setMulkFiltre(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tüm mülkler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Mülkler</SelectItem>
            {mulkler.map(m => <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : siraliKiracilar.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Kiracı bulunamadı.</p>
          {isAdmin && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFormAcik(true)}>
              Kiracı Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kiracı</TableHead>
                <TableHead>Mülk</TableHead>
                <TableHead className="text-right">Kira</TableHead>
                <TableHead className="text-right">Depozito</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siraliKiracilar.map(k => {
                const aktif = !k.kontrat_sonu || new Date(k.kontrat_sonu) >= bugun
                const kiraciBakiyeler = (k.id && bakiyeMap[k.id]) ? bakiyeMap[k.id] : undefined
                const bakiyeKayitlari = kiraciBakiyeler ? Object.entries(kiraciBakiyeler) : []
                const negatifKayitlar = bakiyeKayitlari.filter(([, tutar]) => tutar < 0)
                const secilen = negatifKayitlar.length > 0
                  ? negatifKayitlar.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]
                  : (bakiyeKayitlari.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0] ?? null)
                const bakiyeTutar = secilen ? secilen[1] : undefined
                const bakiyePB = secilen ? secilen[0] : undefined
                return (
                  <TableRow key={k.id}>
                    <TableCell>
                      <Link to={`/kiracilar/${k.id}`} className="font-medium hover:text-primary transition-colors">
                        {k.ad ?? '—'}
                      </Link>
                      {k.kiralama?.stopaj_takibi && (
                        <Badge variant="warning" className="ml-2 text-xs">Stopaj</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {k.mulk?.ad ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {k.kiralama ? formatPara(k.kiralama.kira_tutari, k.kiralama.kira_para_birimi) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {k.id && depozitoMap[k.id] ? formatPara(depozitoMap[k.id], 'TRY') : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {bakiyeTutar !== undefined && bakiyePB ? (
                        <span className={bakiyeTutar < 0 ? 'text-negative font-semibold' : 'text-positive font-semibold'}>
                          {formatPara(bakiyeTutar, bakiyePB)}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {k.kiralama ? formatTarih(k.kiralama.baslangic_tarihi) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={aktif ? 'positive' : 'muted'}>
                        {aktif ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formAcik} onOpenChange={setFormAcik}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Kiracı Ekle</DialogTitle>
          </DialogHeader>
          <KiraciForm onSuccess={() => setFormAcik(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
