import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ParaBirimiSelect from '@/components/shared/ParaBirimiSelect'
import { useMulkler } from '@/hooks/useMulkler'
import { useKiracilar, useKiralamalar } from '@/hooks/useKiracilar'
import { useKisiler } from '@/hooks/useKisiler'
import { useIslemEkle, useIslemGuncelle } from '@/hooks/useIslemler'
import { useDovizKuru } from '@/hooks/useDovizKuru'
import { useToast } from '@/components/ui/use-toast'
import { Islem, IslemTuru, ISLEM_TURU_LABEL } from '@/types'
import { bugunISO } from '@/lib/utils'
import { Loader2, RefreshCw } from 'lucide-react'

const KIRACI_PAYMENT_TYPES: IslemTuru[] = ['kira_odeme_nakit', 'kira_odeme_banka', 'kira_odeme_stopaj', 'kira_odeme_depozitodan', 'kira_tahakkuku', 'masraf_kiradan_dusulen', 'depozito_nakit', 'depozito_banka']

const schema = z.object({
  tarih: z.string().min(1, 'Tarih zorunludur'),
  saat: z.string().optional(),
  tur: z.string().min(1, 'İşlem türü zorunludur'),
  tutar: z.coerce.number().refine(val => val !== 0, 'Tutar 0 olamaz'),
  para_birimi: z.string().default('TRY'),
  odemeyi_gonderen: z.string().optional(), // Transfer için
  odemeyi_alan: z.string().optional(),
  mulk_id: z.string().optional(),
  kiraci_id: z.string().optional(),
  aciklama: z.string().optional(),
  doviz_kuru: z.coerce.number().optional(),
})

type FormData = z.infer<typeof schema>

interface IslemFormProps {
  islem?: Islem
  onSuccess?: () => void
}

export default function IslemForm({ islem, onSuccess }: IslemFormProps) {
  const { toast } = useToast()
  const ekle = useIslemEkle()
  const guncelle = useIslemGuncelle()
  const { data: mulkler = [] } = useMulkler(false)
  const { data: kiracilar = [] } = useKiracilar({})
  const { data: kiralar = [] } = useKiralamalar({})
  const { data: kisiler = [] } = useKisiler()

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: islem ? {
      tarih: islem.tarih,
      saat: islem.saat ?? '',
      tur: islem.tur,
      tutar: islem.tutar,
      para_birimi: islem.para_birimi,
      odemeyi_alan: islem.odemeyi_alan ?? '',
      mulk_id: islem.mulk_id ?? '',
      kiraci_id: islem.kiraci_id ?? '',
      aciklama: islem.aciklama ?? '',
      doviz_kuru: islem.doviz_kuru ?? undefined,
    } : {
      tarih: bugunISO(),
      para_birimi: 'TRY',
    },
  })

  const watchedTur = watch('tur') as IslemTuru | undefined
  const watchedParaBirimi = watch('para_birimi')
  const watchedTarih = watch('tarih')
  const watchedTutar = watch('tutar')
  const watchedDovizKuru = watch('doviz_kuru')
  const watchedKiraciId = watch('kiraci_id')

  const isTransfer = watchedTur === 'transfer'
  const isTahakkuk = watchedTur === 'kira_tahakkuku'
  const isMasraf = watchedTur === 'masraf_kiradan_dusulen'
  const kiraciGerekli = watchedTur ? KIRACI_PAYMENT_TYPES.includes(watchedTur) : false
  const odemeyiAlanGerekli = kiraciGerekli && !isTahakkuk && !isMasraf
  const kurGerekli = watchedParaBirimi && watchedParaBirimi !== 'USD'

  // Kiraci secildiginde Mulk'u otomatik sec
  useEffect(() => {
    if (watchedKiraciId && kiralar.length > 0) {
      const seciliKiraciKiralama = kiralar.find(k => k.kiraci_id === watchedKiraciId)
      if (seciliKiraciKiralama) {
        setValue('mulk_id', seciliKiraciKiralama.mulk_id)
      }
    }
  }, [watchedKiraciId, kiralar, setValue])

  // Mulk secimi artık kullanıcıdan değil, kiracıdan otomatik gelir

  // Tarih degistiginde o tarihte aktif olan kiraciyi otomatik sec (sadece yeni kayit)
  useEffect(() => {
    if (!watchedTarih || islem || !kiraciGerekli || kiralar.length === 0) return
    
    const tarih = new Date(watchedTarih)
    const aktifKiracilar = kiralar.filter(k => {
      const baslangic = k.baslangic_tarihi ? new Date(k.baslangic_tarihi) : null
      const bitis = k.bitis_tarihi ? new Date(k.bitis_tarihi) : null
      const kiraci = kiracilar.find(kk => kk.id === k.kiraci_id)
      const kontratSonu = kiraci?.kontrat_sonu ? new Date(kiraci.kontrat_sonu) : null
      const aktifKiralama = (!baslangic || baslangic <= tarih) && (!bitis || bitis > tarih)
      const aktifKiraci = !kontratSonu || kontratSonu >= tarih
      return aktifKiralama && aktifKiraci
    })
    
    if (aktifKiracilar.length === 1) {
      setValue('kiraci_id', aktifKiracilar[0].kiraci_id)
    } else if (aktifKiracilar.length > 1) {
      // Birden fazla aktif kiraci varsa, en son baslayani sec
      const enSonBaslayan = aktifKiracilar.sort((a, b) => {
        const aTarih = a.baslangic_tarihi ? new Date(a.baslangic_tarihi).getTime() : 0
        const bTarih = b.baslangic_tarihi ? new Date(b.baslangic_tarihi).getTime() : 0
        return bTarih - aTarih
      })[0]
      setValue('kiraci_id', enSonBaslayan.kiraci_id)
    }
  }, [watchedTarih, islem, kiraciGerekli, kiralar, kiracilar, setValue])

  const { data: dovizKuru, isLoading: kurYukleniyor } = useDovizKuru(
    watchedTarih,
    watchedParaBirimi,
    !!watchedTarih && !!watchedParaBirimi
  )

  const [usdGosterim, setUsdGosterim] = useState<number | null>(null)

  useEffect(() => {
    if (dovizKuru && !islem) {
      // TRY için doviz_kuru = 1/ilis, USD için = 1, EUR için = EUR_alis/USD_alis
      // Hook'ta hesaplanıp doviz_kuru olarak dönüyor
      setValue('doviz_kuru', dovizKuru.doviz_kuru ?? 1)
    }
  }, [dovizKuru, setValue, islem])

  useEffect(() => {
    if (watchedTutar && watchedDovizKuru) {
      setUsdGosterim(watchedTutar * watchedDovizKuru)
    } else {
      setUsdGosterim(null)
    }
  }, [watchedTutar, watchedDovizKuru])

  const onSubmit = async (data: FormData) => {
    // Tahakkuk için kiraci zorunlu
    if (isTahakkuk && !data.kiraci_id) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Kira tahakkuku için kiracı seçilmelidir' })
      return
    }

    // Tahakkuk ve masraf için odemeyi alan gerekmez, digerleri için gerekli
    if (odemeyiAlanGerekli && !data.odemeyi_alan) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Ödemeyi alan kişi seçilmelidir' })
      return
    }

    const payload = {
      ...data,
      tur: data.tur as IslemTuru,
      saat: data.saat || undefined,
      odemeyi_gonderen: isTransfer ? (data.odemeyi_gonderen || undefined) : undefined,
      odemeyi_alan: (isTahakkuk || isMasraf) ? undefined : (data.odemeyi_alan || undefined),
      mulk_id: isTransfer ? undefined : (data.mulk_id || undefined),
      kiraci_id: isTransfer ? undefined : (data.kiraci_id || undefined),
      aciklama: data.aciklama || undefined,
      doviz_kuru: data.doviz_kuru || undefined,
    }
    try {
      if (islem) {
        await guncelle.mutateAsync({ id: islem.id, ...payload })
        toast({ title: 'İşlem güncellendi' })
      } else {
        await ekle.mutateAsync(payload as Parameters<typeof ekle.mutateAsync>[0])
        toast({ title: 'İşlem kaydedildi' })
      }
      onSuccess?.()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Hata', description: err instanceof Error ? err.message : 'Bir hata oluştu' })
    }
  }

  const isLoading = ekle.isPending || guncelle.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Tür */}
      <div className="space-y-1">
        <Label>İşlem Türü *</Label>
        <Controller
          control={control}
          name="tur"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="İşlem türünü seçin" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ISLEM_TURU_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.tur && <p className="text-xs text-destructive">{errors.tur.message}</p>}
      </div>

      {/* Tarih & Saat */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tarih">Tarih *</Label>
          <Input id="tarih" type="date" {...register('tarih')} />
          {errors.tarih && <p className="text-xs text-destructive">{errors.tarih.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="saat">Saat</Label>
          <Input id="saat" type="time" {...register('saat')} />
        </div>
      </div>

      {/* Tutar & Para Birimi */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tutar">
            Tutar *
          </Label>
          <Input id="tutar" type="number" step="0.01" {...register('tutar')} placeholder="0.00" />
          {errors.tutar && <p className="text-xs text-destructive">{errors.tutar.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Para Birimi</Label>
          <Controller
            control={control}
            name="para_birimi"
            render={({ field }) => (
              <ParaBirimiSelect value={field.value} onValueChange={field.onChange} />
            )}
          />
        </div>
      </div>

      {/* Döviz kuru */}
      {kurGerekli && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="doviz_kuru">TCMB Döviz Kuru (TRY → USD)</Label>
            {kurYukleniyor && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex gap-2">
            <Input
              id="doviz_kuru"
              type="number"
              step="0.000001"
              {...register('doviz_kuru')}
              placeholder="Otomatik doldurulur"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => dovizKuru && setValue('doviz_kuru', dovizKuru.doviz_kuru ?? 1)}
              disabled={!dovizKuru}
              title="Güncel kuru uygula"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {usdGosterim !== null && (
            <p className="text-xs text-muted-foreground tabular-nums">
              ≈ ${usdGosterim.toFixed(2)} USD
            </p>
          )}
        </div>
      )}

      {/* Kiracı - Tür + Tarihe göre uygun olanlar */}
      {!isTransfer && kiraciGerekli && (
        <div className="space-y-1">
          <Label>Kiracı *</Label>
          <Controller
            control={control}
            name="kiraci_id"
            render={({ field }) => {
              const seciliTarih = watchedTarih ? new Date(watchedTarih) : null
              const uygunKiraciIdSet = new Set(
                kiralar
                  .filter((kr) => {
                    const b = kr.baslangic_tarihi ? new Date(kr.baslangic_tarihi) : null
                    const bt = kr.bitis_tarihi ? new Date(kr.bitis_tarihi) : null
                    if (!seciliTarih) return true
                    return (!b || b <= seciliTarih) && (!bt || bt > seciliTarih)
                  })
                  .map((kr) => kr.kiraci_id)
              )

                    const uygunKiracilar = kiracilar.filter((k) => {
                      if (!uygunKiraciIdSet.has(k.id)) return false
                      if (!seciliTarih) return true
                      const kontratSonu = k.kontrat_sonu ? new Date(k.kontrat_sonu) : null
                      return !kontratSonu || kontratSonu >= seciliTarih
                    })

              return (
                <Select value={field.value ?? '_clear_'} onValueChange={(v) => field.onChange(v === '_clear_' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kiracı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_clear_">— Seçilmedi —</SelectItem>
                    {uygunKiracilar.map((k) => {
                      const kiraciKiralama = kiralar.find(kr => kr.kiraci_id === k.id)
                      return (
                        <SelectItem key={k.id} value={k.id}>
                          {k.ad}{kiraciKiralama?.mulk ? ` (${kiraciKiralama.mulk.ad})` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )
            }}
          />
        </div>
      )}

      {/* Mülk - Kiracıya göre otomatik (read-only) */}
      {!isTransfer && (
        <div className="space-y-1">
          <Label>Mülk</Label>
          <Controller
            control={control}
            name="mulk_id"
            render={({ field }) => (
              <Select value={field.value ?? '_clear_'} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Kiracıya göre otomatik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_clear_">— Seçilmedi —</SelectItem>
                  {mulkler.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">Mülk, seçilen kiracıya göre otomatik doldurulur.</p>
        </div>
      )}

      {/* Transfer için: Gönderen ve Alan */}
      {isTransfer && (
        <>
          <div className="space-y-1">
            <Label>Ödemeyi Gönderen *</Label>
            <Controller
              control={control}
              name="odemeyi_gonderen"
              render={({ field }) => (
                <Select value={field.value ?? '_clear_'} onValueChange={(v) => field.onChange(v === '_clear_' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Göndereni seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_clear_">— Seçilmedi —</SelectItem>
                    {kisiler.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.tam_ad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </>
      )}

      {/* Ödemeyi Alan - Tahakkuk ve Masraf dışında zorunlu */}
      {odemeyiAlanGerekli && (
        <div className="space-y-1">
          <Label>Ödemeyi Alan *</Label>
          <Controller
            control={control}
            name="odemeyi_alan"
            render={({ field }) => (
              <Select value={field.value ?? '_clear_'} onValueChange={(v) => field.onChange(v === '_clear_' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alan kişiyi seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_clear_">— Seçilmedi —</SelectItem>
                  {kisiler.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.tam_ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.odemeyi_alan && <p className="text-xs text-destructive">{errors.odemeyi_alan.message}</p>}
        </div>
      )}

      {/* Açıklama */}
      <div className="space-y-1">
        <Label htmlFor="aciklama">Açıklama</Label>
        <Textarea id="aciklama" {...register('aciklama')} rows={2} placeholder="Serbest metin..." />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {islem ? 'Güncelle' : 'İşlemi Kaydet'}
      </Button>
    </form>
  )
}
