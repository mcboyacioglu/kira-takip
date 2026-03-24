import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Kisi } from '@/types'

export function useKisiler(sadecaAktif = false) {
  return useQuery<Kisi[]>({
    queryKey: ['kisiler', sadecaAktif],
    queryFn: async () => {
      let q = supabase.from('kisiler').select('*').order('tam_ad')
      if (sadecaAktif) q = q.is('bitis_tarihi', null)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

export function useKisi(id: string | undefined) {
  return useQuery<Kisi>({
    queryKey: ['kisiler', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kisiler')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useKisiEkle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (yeni: Omit<Kisi, 'id' | 'olusturma_tarihi' | 'guncelleme_tarihi'>) => {
      const { data, error } = await supabase.from('kisiler').insert(yeni).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kisiler'] }),
  })
}

export function useKisiGuncelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Kisi> & { id: string }) => {
      const { data, error } = await supabase
        .from('kisiler').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kisiler'] }),
  })
}

export function useKisiSil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kisiler').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kisiler'] }),
  })
}
