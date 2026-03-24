import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ParaBirimiSelect from '@/components/shared/ParaBirimiSelect'
import { useMulkEkle, useMulkGuncelle } from '@/hooks/useMulkler'
import { useToast } from '@/components/ui/use-toast'
import { Mulk } from '@/types'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  ad: z.string().min(1, 'Mülk adı zorunludur'),
  detay: z.string().optional(),
  adres: z.string().optional(),
  satin_alma_fiyati: z.coerce.number().optional(),
  para_birimi: z.string().default('TRY'),
  baslangic_tarihi: z.string().optional(),
  bitis_tarihi: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface MulkFormProps {
  mulk?: Mulk
  onSuccess?: () => void
}

export default function MulkForm({ mulk, onSuccess }: MulkFormProps) {
  const { toast } = useToast()
  const ekle = useMulkEkle()
  const guncelle = useMulkGuncelle()

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: mulk ? {
      ad: mulk.ad,
      detay: mulk.detay ?? '',
      adres: mulk.adres ?? '',
      satin_alma_fiyati: mulk.satin_alma_fiyati ?? undefined,
      para_birimi: mulk.para_birimi ?? 'TRY',
      baslangic_tarihi: mulk.baslangic_tarihi ?? '',
      bitis_tarihi: mulk.bitis_tarihi ?? '',
    } : { para_birimi: 'TRY' },
  })

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      detay: data.detay || undefined,
      adres: data.adres || undefined,
      baslangic_tarihi: data.baslangic_tarihi || undefined,
      bitis_tarihi: data.bitis_tarihi || undefined,
    }
    try {
      if (mulk) {
        await guncelle.mutateAsync({ id: mulk.id, ...payload })
        toast({ title: 'Mülk güncellendi' })
      } else {
        await ekle.mutateAsync(payload as Parameters<typeof ekle.mutateAsync>[0])
        toast({ title: 'Mülk eklendi' })
      }
      onSuccess?.()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Hata', description: err instanceof Error ? err.message : 'Bir hata oluştu' })
    }
  }

  const isLoading = ekle.isPending || guncelle.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="ad">Mülk Adı *</Label>
        <Input id="ad" {...register('ad')} placeholder="Örn: Kadıköy Dairesi" />
        {errors.ad && <p className="text-xs text-destructive">{errors.ad.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="adres">Adres</Label>
        <Textarea id="adres" {...register('adres')} placeholder="Tam adres" rows={2} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="detay">Detay</Label>
        <Textarea id="detay" {...register('detay')} placeholder="Ek açıklama" rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="satin_alma_fiyati">Satın Alma Fiyatı</Label>
          <Input id="satin_alma_fiyati" type="number" step="0.01" {...register('satin_alma_fiyati')} />
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="baslangic_tarihi">Başlangıç Tarihi</Label>
          <Input id="baslangic_tarihi" type="date" {...register('baslangic_tarihi')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bitis_tarihi">Bitiş Tarihi</Label>
          <Input id="bitis_tarihi" type="date" {...register('bitis_tarihi')} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mulk ? 'Güncelle' : 'Mülk Ekle'}
      </Button>
    </form>
  )
}
