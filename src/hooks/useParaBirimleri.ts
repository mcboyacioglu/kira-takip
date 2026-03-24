import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ParaBirimi } from '@/types'

export function useParaBirimleri(sadecaAktif = true) {
  return useQuery<ParaBirimi[]>({
    queryKey: ['para_birimleri', sadecaAktif],
    queryFn: async () => {
      let q = supabase.from('para_birimleri').select('*').order('kod')
      if (sadecaAktif) q = q.eq('aktif', true)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 60, // 1 saat
  })
}

export function useParaBirimiEkle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (yeni: Omit<ParaBirimi, 'olusturma_tarihi' | 'guncelleme_tarihi'>) => {
      const { data, error } = await supabase.from('para_birimleri').insert(yeni).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['para_birimleri'] }),
  })
}

export function useParaBirimiGuncelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ kod, ...updates }: Partial<ParaBirimi> & { kod: string }) => {
      const { data, error } = await supabase
        .from('para_birimleri')
        .update(updates)
        .eq('kod', kod)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['para_birimleri'] }),
  })
}
