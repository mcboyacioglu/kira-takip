import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Islem, IslemTuru } from '@/types'

interface IslemFiltre {
  mulkId?: string
  kiraciId?: string
  tur?: IslemTuru
  baslangic?: string
  bitis?: string
  limit?: number
}

export function useIslemler(filtre: IslemFiltre = {}) {
  return useQuery<Islem[]>({
    queryKey: ['islemler', filtre],
    queryFn: async () => {
      let q = supabase
        .from('islemler')
        .select(`
          *,
          mulk:mulkler(id, ad),
          kiraci:kiracilar(id, ad),
          odemeyi_alan_kisi:kisiler!islemler_odemeyi_alan_fkey(id, tam_ad)
        `)
        .order('tarih', { ascending: false })
        .order('olusturma_tarihi', { ascending: false })

      if (filtre.mulkId)   q = q.eq('mulk_id', filtre.mulkId)
      if (filtre.kiraciId) q = q.eq('kiraci_id', filtre.kiraciId)
      if (filtre.tur)      q = q.eq('tur', filtre.tur)
      if (filtre.baslangic) q = q.gte('tarih', filtre.baslangic)
      if (filtre.bitis)    q = q.lte('tarih', filtre.bitis)
      if (filtre.limit)    q = q.limit(filtre.limit)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

export function useIslem(id: string | undefined) {
  return useQuery<Islem>({
    queryKey: ['islemler', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('islemler')
        .select(`
          *,
          mulk:mulkler(id, ad),
          kiraci:kiracilar(id, ad),
          odemeyi_alan_kisi:kisiler!islemler_odemeyi_alan_fkey(id, tam_ad)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useIslemEkle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      yeni: Omit<Islem, 'id' | 'usd_tutari' | 'olusturma_tarihi' | 'guncelleme_tarihi' | 'mulk' | 'kiraci' | 'odemeyi_alan_kisi'>
    ) => {
      const { data, error } = await supabase.from('islemler').insert(yeni).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['islemler'] }),
  })
}

export function useIslemGuncelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Islem> & { id: string }) => {
      const { mulk: _m, kiraci: _k, odemeyi_alan_kisi: _o, usd_tutari: _u, ...rest } = updates as Islem
      void _m; void _k; void _o; void _u
      const { data, error } = await supabase
        .from('islemler').update(rest).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['islemler'] }),
  })
}

export function useIslemSil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('islemler').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['islemler'] }),
  })
}
