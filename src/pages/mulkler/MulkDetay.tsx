import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PageHeader from '@/components/shared/PageHeader'
import FileUpload from '@/components/shared/FileUpload'
import MulkForm from '@/components/forms/MulkForm'
import KiraciForm from '@/components/forms/KiraciForm'
import { useMulk, useMulkHisseleri, useHisseEkle } from '@/hooks/useMulkler'
import { useKiralamalar } from '@/hooks/useKiracilar'
import { useIslemler } from '@/hooks/useIslemler'
import { useAuth } from '@/hooks/useAuth'
import { useKisiler } from '@/hooks/useKisiler'
import { useToast } from '@/components/ui/use-toast'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPara, formatTarih } from '@/lib/utils'
import { ISLEM_TURU_LABEL } from '@/types'

export default function MulkDetay() {
  const { id } = useParams<{ id: string }>()
  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false)
  const [kiraciFormAcik, setKiraciFormAcik] = useState(false)
  const [hisseFormAcik, setHisseFormAcik] = useState(false)
  const { isAdmin } = useAuth()
  const { data: kisiler = [] } = useKisiler()

  const { data: mulk, isLoading } = useMulk(id)
  const { data: hisseler = [] } = useMulkHisseleri(id)
  const { data: kiralar = [] } = useKiralamalar({ mulkId: id })
  const { data: islemler = [] } = useIslemler({ mulkId: id })

  if (isLoading) return <p className="text-sm text-muted-foreground p-6">Yükleniyor...</p>
  if (!mulk) return <p className="p-6 text-destructive">Mülk bulunamadı.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/mulkler">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={mulk.ad}
          description={mulk.adres ?? undefined}
          actions={
            isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setDuzenlemeAcik(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Düzenle
              </Button>
            )
          }
        />
      </div>

      {/* Özet */}
      <div className="flex flex-wrap gap-3">
        <Badge variant={!mulk.bitis_tarihi || new Date(mulk.bitis_tarihi) > new Date() ? 'positive' : 'muted'}>
          {!mulk.bitis_tarihi || new Date(mulk.bitis_tarihi) > new Date() ? 'Aktif' : 'Pasif'}
        </Badge>
        {mulk.satin_alma_fiyati && (
          <Badge variant="secondary">
            Alış: {formatPara(mulk.satin_alma_fiyati, mulk.para_birimi)}
          </Badge>
        )}
        {mulk.baslangic_tarihi && (
          <Badge variant="secondary">Başlangıç: {formatTarih(mulk.baslangic_tarihi)}</Badge>
        )}
      </div>

      <Tabs defaultValue="hisseler">
        <TabsList>
          <TabsTrigger value="hisseler">Hisse Dağılımı</TabsTrigger>
          <TabsTrigger value="kiracilar">Kiracılar</TabsTrigger>
          <TabsTrigger value="islemler">İşlemler</TabsTrigger>
          <TabsTrigger value="belgeler">Belgeler</TabsTrigger>
        </TabsList>

        {/* Hisseler */}
        <TabsContent value="hisseler" className="mt-4">
          {isAdmin && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setHisseFormAcik(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Hisse Ekle
              </Button>
            </div>
          )}
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kişi</TableHead>
                  <TableHead className="text-right">Hisse (%)</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Bitiş</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hisseler.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Hisse kaydı yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  hisseler.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.kisi?.tam_ad ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        %{h.hisse_orani}
                      </TableCell>
                      <TableCell>{formatTarih(h.baslangic_tarihi)}</TableCell>
                      <TableCell>{h.bitis_tarihi ? formatTarih(h.bitis_tarihi) : <Badge variant="positive" className="text-xs">Aktif</Badge>}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Kiracılar */}
        <TabsContent value="kiracilar" className="mt-4">
          {isAdmin && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setKiraciFormAcik(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Kiracı Ekle
              </Button>
            </div>
          )}
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kiracı</TableHead>
                  <TableHead className="text-right">Kira</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kiralar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Kiracı kaydı yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  kiralar.map(k => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <Link to={`/kiracilar/${k.kiraci_id}`} className="font-medium hover:text-primary transition-colors">
                          {k.kiraci?.ad ?? '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPara(k.kira_tutari, k.kira_para_birimi)}
                      </TableCell>
                      <TableCell>{formatTarih(k.baslangic_tarihi)}</TableCell>
                      <TableCell>
                        <Badge variant={!k.bitis_tarihi || new Date(k.bitis_tarihi) > new Date() ? 'positive' : 'muted'}>
                          {!k.bitis_tarihi || new Date(k.bitis_tarihi) > new Date() ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* İşlemler */}
        <TabsContent value="islemler" className="mt-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Kiracı</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {islemler.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      İşlem yok.
                    </TableCell>
                  </TableRow>
                ) : (
                  islemler.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{formatTarih(i.tarih)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{ISLEM_TURU_LABEL[i.tur]}</Badge>
                      </TableCell>
                      <TableCell>{i.kiraci?.ad ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatPara(i.tutar, i.para_birimi)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Belgeler */}
        <TabsContent value="belgeler" className="mt-4">
          <FileUpload iliskiTuru="mulk" iliskiId={id!} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={duzenlemeAcik} onOpenChange={setDuzenlemeAcik}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Mülk Düzenle</DialogTitle></DialogHeader>
          <MulkForm mulk={mulk} onSuccess={() => setDuzenlemeAcik(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={kiraciFormAcik} onOpenChange={setKiraciFormAcik}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Kiracı Ekle</DialogTitle></DialogHeader>
          <KiraciForm onSuccess={() => setKiraciFormAcik(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={hisseFormAcik} onOpenChange={setHisseFormAcik}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Hisse Ekle</DialogTitle></DialogHeader>
          <HisseFormu mulkId={id!} kisiler={kisiler} onSuccess={() => setHisseFormAcik(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Hisse ekleme formu bileşeni
const hisseSchema = z.object({
  kisi_id: z.string().min(1, 'Kişi seçmelisiniz'),
  hisse_orani: z.coerce.number().min(0.01, 'Hisse %0\'dan büyük olmalı').max(100, 'Hisse %100\'den büyük olamaz'),
  baslangic_tarihi: z.string().min(1, 'Başlangıç tarihi zorunludur'),
  bitis_tarihi: z.string().optional(),
})

type HisseFormData = z.infer<typeof hisseSchema>

function HisseFormu({ mulkId, kisiler, onSuccess }: { mulkId: string; kisiler: any[]; onSuccess: () => void }) {
  const { toast } = useToast()
  const ekle = useHisseEkle()
  const { register, handleSubmit, control, formState: { errors } } = useForm<HisseFormData>({
    resolver: zodResolver(hisseSchema),
    defaultValues: {
      baslangic_tarihi: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: HisseFormData) => {
    try {
      await ekle.mutateAsync({
        mulk_id: mulkId,
        kisi_id: data.kisi_id,
        hisse_orani: data.hisse_orani,
        baslangic_tarihi: data.baslangic_tarihi,
        bitis_tarihi: data.bitis_tarihi || undefined,
      })
      toast({ title: 'Hisse eklendi' })
      onSuccess()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Kişi *</Label>
        <Controller
          control={control}
          name="kisi_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Kişi seçin" /></SelectTrigger>
              <SelectContent>
                {kisiler.filter(k => k.kullanici_hesabi_var_mi).map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.tam_ad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.kisi_id && <p className="text-xs text-destructive">{errors.kisi_id.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Hisse Oranı (%) *</Label>
        <Input type="number" step="0.01" {...register('hisse_orani')} placeholder="50.00" />
        {errors.hisse_orani && <p className="text-xs text-destructive">{errors.hisse_orani.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Başlangıç Tarihi *</Label>
        <Input type="date" {...register('baslangic_tarihi')} />
        {errors.baslangic_tarihi && <p className="text-xs text-destructive">{errors.baslangic_tarihi.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Bitiş Tarihi (opsiyonel)</Label>
        <Input type="date" {...register('bitis_tarihi')} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={ekle.isPending}>
          {ekle.isPending ? 'Ekleniyor...' : 'Ekle'}
        </Button>
      </div>
    </form>
  )
}
