import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useKiraciEkle, useKiraciGuncelle } from '@/hooks/useKiracilar'
import { useToast } from '@/components/ui/use-toast'
import { Kiraci } from '@/types'
import { Loader2 } from 'lucide-react'

const kiraciSchema = z.object({
  ad: z.string().min(1, 'Ad zorunludur'),
  uzun_ad: z.string().optional(),
  vergi_dairesi: z.string().optional(),
  vergi_no: z.string().optional(),
  kimlik_no: z.string().optional(),
  kontrat_baslangici: z.string().optional(),
  kontrat_sonu: z.string().optional(),
})

type KiraciFormData = z.infer<typeof kiraciSchema>

interface KiraciFormProps {
  kiraci?: Kiraci
  onSuccess?: () => void
}

export default function KiraciForm({ kiraci, onSuccess }: KiraciFormProps) {
  const { toast } = useToast()
  const kiraciEkle = useKiraciEkle()
  const kiraciGuncelle = useKiraciGuncelle()

  const { register, handleSubmit, formState: { errors } } = useForm<KiraciFormData>({
    resolver: zodResolver(kiraciSchema),
    defaultValues: kiraci ? {
      ad: kiraci.ad,
      uzun_ad: kiraci.uzun_ad ?? '',
      vergi_dairesi: kiraci.vergi_dairesi ?? '',
      vergi_no: kiraci.vergi_no ?? '',
      kimlik_no: kiraci.kimlik_no ?? '',
      kontrat_baslangici: kiraci.kontrat_baslangici ?? '',
      kontrat_sonu: kiraci.kontrat_sonu ?? '',
    } : {},
  })

  const isLoading = kiraciEkle.isPending || kiraciGuncelle.isPending

  const onSubmit = async (data: KiraciFormData) => {
    const payload = {
      ad: data.ad,
      uzun_ad: data.uzun_ad || undefined,
      vergi_dairesi: data.vergi_dairesi || undefined,
      vergi_no: data.vergi_no || undefined,
      kimlik_no: data.kimlik_no || undefined,
      kontrat_baslangici: data.kontrat_baslangici || undefined,
      kontrat_sonu: data.kontrat_sonu || undefined,
    }

    try {
      if (kiraci) {
        await kiraciGuncelle.mutateAsync({ id: kiraci.id, ...payload })
      } else {
        await kiraciEkle.mutateAsync(payload as Parameters<typeof kiraciEkle.mutateAsync>[0])
      }
      toast({ title: 'Kiracı kaydedildi' })
      onSuccess?.()
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Hata', description: err instanceof Error ? err.message : 'Bir hata oluştu' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="ad">Kısa Ad *</Label>
          <Input id="ad" {...register('ad')} placeholder="Kiracı kısa adı" />
          {errors.ad && <p className="text-xs text-destructive">{errors.ad.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="uzun_ad">Ticari Unvan</Label>
          <Input id="uzun_ad" {...register('uzun_ad')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="vergi_dairesi">Vergi Dairesi</Label>
          <Input id="vergi_dairesi" {...register('vergi_dairesi')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vergi_no">Vergi / TC No</Label>
          <Input id="vergi_no" {...register('vergi_no')} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="kimlik_no">Kimlik No</Label>
        <Input id="kimlik_no" {...register('kimlik_no')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="kontrat_baslangici">Kontrat Başlangıcı</Label>
          <Input id="kontrat_baslangici" type="date" {...register('kontrat_baslangici')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="kontrat_sonu">Kontrat Bitişi</Label>
          <Input id="kontrat_sonu" type="date" {...register('kontrat_sonu')} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {kiraci ? 'Güncelle' : 'Kaydet'}
      </Button>
    </form>
  )
}
