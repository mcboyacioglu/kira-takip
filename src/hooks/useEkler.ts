import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Ek } from '@/types'

export function useEkler(iliskiTuru: 'mulk' | 'kiraci' | 'islem', iliskiId: string | undefined) {
  return useQuery<Ek[]>({
    queryKey: ['ekler', iliskiTuru, iliskiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ekler')
        .select('*')
        .eq('iliski_turu', iliskiTuru)
        .eq('iliski_id', iliskiId!)
        .order('olusturma_tarihi', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!iliskiId,
  })
}

export function useEkYukle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      dosya,
      iliskiTuru,
      iliskiId,
    }: {
      dosya: File
      iliskiTuru: 'mulk' | 'kiraci' | 'islem'
      iliskiId: string
    }) => {
      const zaman = Date.now()
      const yol = `${iliskiTuru}/${iliskiId}/${zaman}_${dosya.name}`

      const { error: uploadError } = await supabase.storage
        .from('ekler')
        .upload(yol, dosya)
      if (uploadError) throw uploadError

      const { data, error: metaError } = await supabase
        .from('ekler')
        .insert({
          iliski_turu: iliskiTuru,
          iliski_id: iliskiId,
          dosya_adi: dosya.name,
          depolama_yolu: yol,
          dosya_tipi: dosya.type,
          boyut_bayt: dosya.size,
        })
        .select()
        .single()
      if (metaError) throw metaError
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['ekler', vars.iliskiTuru, vars.iliskiId] })
    },
  })
}

export function useEkSil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ek }: { ek: Ek }) => {
      await supabase.storage.from('ekler').remove([ek.depolama_yolu])
      const { error } = await supabase.from('ekler').delete().eq('id', ek.id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['ekler', vars.ek.iliski_turu, vars.ek.iliski_id] })
    },
  })
}

export function useEkIndir() {
  return useMutation({
    mutationFn: async (ek: Ek) => {
      const { data, error } = await supabase.storage
        .from('ekler')
        .createSignedUrl(ek.depolama_yolu, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    },
  })
}
