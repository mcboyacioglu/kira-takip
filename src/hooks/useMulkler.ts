import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Mulk, MulkHissesi } from '@/types'

export function useMulkler(sadecaAktif = true) {
  return useQuery<Mulk[]>({
    queryKey: ['mulkler', sadecaAktif],
    queryFn: async () => {
      let q = supabase.from('mulkler').select('*').order('ad')
      if (sadecaAktif) {
        // Aktif = bitis_tarihi null VEYA bitis_tarihi > bugün
        const bugun = new Date().toISOString().split('T')[0]
        q = q.or(`bitis_tarihi.is.null,bitis_tarihi.gt.${bugun}`)
      }
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

export function useMulk(id: string | undefined) {
  return useQuery<Mulk>({
    queryKey: ['mulkler', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mulkler').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useMulkHisseleri(mulkId: string | undefined) {
  return useQuery<MulkHissesi[]>({
    queryKey: ['mulk_hisseleri', mulkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mulk_hisseleri')
        .select('*, kisi:kisiler(*)')
        .eq('mulk_id', mulkId!)
        .order('baslangic_tarihi', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!mulkId,
  })
}

export function useMulkEkle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (yeni: Omit<Mulk, 'id' | 'olusturma_tarihi' | 'guncelleme_tarihi'>) => {
      const { data, error } = await supabase.from('mulkler').insert(yeni).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mulkler'] }),
  })
}

export function useMulkGuncelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Mulk> & { id: string }) => {
      const { data, error } = await supabase
        .from('mulkler').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['mulkler'] })
      qc.invalidateQueries({ queryKey: ['mulkler', vars.id] })
    },
  })
}

export function useHisseEkle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      yeni: Omit<MulkHissesi, 'id' | 'olusturma_tarihi' | 'guncelleme_tarihi' | 'kisi'>
    ) => {
      const { data, error } = await supabase.from('mulk_hisseleri').insert(yeni).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['mulk_hisseleri', vars.mulk_id] }),
  })
}

export function useHisseGuncelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, mulk_id, ...updates }: Partial<MulkHissesi> & { id: string }) => {
      const { data, error } = await supabase
        .from('mulk_hisseleri').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['mulk_hisseleri', vars.mulk_id] }),
  })
}
