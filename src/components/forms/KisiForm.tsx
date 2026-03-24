import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useKisiEkle, useKisiGuncelle } from '@/hooks/useKisiler'
import { useToast } from '@/components/ui/use-toast'
import { Kisi } from '@/types'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  tam_ad: z.string().min(1, 'Ad zorunludur'),
  kimlik_no: z.string().optional(),
  telefon: z.string().optional(),
  eposta: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  kullanici_hesabi_var_mi: z.boolean().default(false),
  admin: z.boolean().default(false),
  baslangic_tarihi: z.string().optional(),
  bitis_tarihi: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface KisiFormProps {
  kisi?: Kisi
  onSuccess?: () => void
}

export default function KisiForm({ kisi, onSuccess }: KisiFormProps) {
  const { toast } = useToast()
  const ekle = useKisiEkle()
  const guncelle = useKisiGuncelle()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: kisi ? {
      tam_ad: kisi.tam_ad,
      kimlik_no: kisi.kimlik_no ?? '',
      telefon: kisi.telefon ?? '',
      eposta: kisi.eposta ?? '',
      kullanici_hesabi_var_mi: kisi.kullanici_hesabi_var_mi,
      admin: kisi.admin ?? false,
      baslangic_tarihi: kisi.baslangic_tarihi ?? '',
      bitis_tarihi: kisi.bitis_tarihi ?? '',
    } : { kullanici_hesabi_var_mi: false, admin: false },
  })

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      kimlik_no: data.kimlik_no || undefined,
      telefon: data.telefon || undefined,
      eposta: data.eposta || undefined,
      baslangic_tarihi: data.baslangic_tarihi || undefined,
      bitis_tarihi: data.bitis_tarihi || undefined,
    }
    try {
      if (kisi) {
        await guncelle.mutateAsync({ id: kisi.id, ...payload })
        toast({ title: 'Kişi güncellendi' })
      } else {
        await ekle.mutateAsync(payload as Parameters<typeof ekle.mutateAsync>[0])
        toast({ title: 'Kişi eklendi' })
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
        <Label htmlFor="tam_ad">Tam Ad *</Label>
        <Input id="tam_ad" {...register('tam_ad')} placeholder="Ad Soyad" />
        {errors.tam_ad && <p className="text-xs text-destructive">{errors.tam_ad.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="kimlik_no">TC / Pasaport No</Label>
          <Input id="kimlik_no" {...register('kimlik_no')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="telefon">Telefon</Label>
          <Input id="telefon" {...register('telefon')} placeholder="+90 5XX..." />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="eposta">E-posta</Label>
        <Input id="eposta" type="email" {...register('eposta')} />
        {errors.eposta && <p className="text-xs text-destructive">{errors.eposta.message}</p>}
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

      <div className="flex items-center gap-2">
        <input id="kullanici_hesabi_var_mi" type="checkbox" {...register('kullanici_hesabi_var_mi')} className="h-4 w-4 rounded border-border" />
        <Label htmlFor="kullanici_hesabi_var_mi">Sisteme giriş yapabilir</Label>
      </div>

      <div className="flex items-center gap-2">
        <input id="admin" type="checkbox" {...register('admin')} className="h-4 w-4 rounded border-border" />
        <Label htmlFor="admin">Admin (yönetici)</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {kisi ? 'Güncelle' : 'Ekle'}
      </Button>
    </form>
  )
}
