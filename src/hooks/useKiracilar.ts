import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Kiraci, Kiralama } from '@/types'

interface KiraciFiltre {
  mulkId?: string
  sadecaAktif?: boolean
}

export function useKiracilar({ mulkId }: KiraciFiltre = {}) {
  return useQuery<Kiraci[]>({
    queryKey: ['kiracilar', mulkId],
    queryFn: async () => {
      // Tüm kiracıları getir
      const { data, error } = await supabase
        .from('kiracilar')
        .select('*')
        .order('ad')
      
      if (error) {
        console.error('Kiracilar sorgu hatası:', error)
        throw error
      }
      return data ?? []
    },
  })
}

export function useKiraci(id: string | undefined) {
  return useQuery<Kiraci>({
    queryKey: ['kiracilar', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kiracilar')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useKiraciEkle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (yeni: Omit<Kiraci, 'id' | 'olusturma_tarihi' | 'guncelleme_tarihi'>) => {
      const { data, error } = await supabase.from('kiracilar').insert(yeni).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kiracilar'] }),
  })
}

export function useKiraciGuncelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Kiraci> & { id: string }) => {
      const { data, error } = await supabase
        .from('kiracilar').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['kiracilar'] })
      qc.invalidateQueries({ queryKey: ['kiracilar', vars.id] })
    },
  })
}

export function useKiraciSil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kiracilar').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kiracilar'] }),
  })
}

// Kiralama hooks
interface KiralamaFiltre {
  kiraciId?: string
  mulkId?: string
  sadecaAktif?: boolean
}

export function useKiralamalar({ kiraciId, mulkId, sadecaAktif = false }: KiralamaFiltre = {}) {
  return useQuery<Kiralama[]>({
    queryKey: ['kiralar', kiraciId, mulkId, sadecaAktif],
    queryFn: async () => {
      console.log('useKiralamalar çalışıyor...')
      
      // Tüm kiraları getir - filtreleme frontend'de yapılacak
      const { data, error } = await supabase
        .from('kiralar')
        .select('*, kiraci:kiracilar(id, ad), mulk:mulkler(id, ad)')
        .order('baslangic_tarihi', { ascending: false })
      
      console.log('Kiralar verisi:', data, 'Hata:', error)
      
      if (error) {
        console.error('Kiralar sorgu hatası:', error)
        throw error
      }
      
      let veriler = data ?? []
      
      // Kiraci filtresi
      if (kiraciId) {
        veriler = veriler.filter(v => v.kiraci_id === kiraciId)
      }
      
      // Mulk filtresi  
      if (mulkId) {
        veriler = veriler.filter(v => v.mulk_id === mulkId)
      }
      
      // Aktif filtreleme (frontend'de)
      if (sadecaAktif) {
        const bugun = new Date().toISOString().split('T')[0]
        veriler = veriler.filter(k => {
          if (!k.bitis_tarihi) return true  // bitis_tarihi null = aktif
          return new Date(k.bitis_tarihi) >= new Date(bugun)
        })
      }
      
      return veriler
    },
  })
}

export function useAktifKiralamalar(kiraciId: string) {
  return useQuery<Kiralama[]>({
    queryKey: ['kiralar', 'aktif', kiraciId],
    queryFn: async () => {
      const bugun = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('kiralar')
        .select('*, mulk:mulkler(id, ad)')
        .eq('kiraci_id', kiraciId)
        .or(`bitis_tarihi.is.null,bitis_tarihi.gt.${bugun}`)
        .order('baslangic_tarihi', { ascending: false })
      
      if (error) throw error
      return data ?? []
    },
  })
}

export function useKiralama(id: string | undefined) {
  return useQuery<Kiralama>({
    queryKey: ['kiralar', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kiralar')
        .select('*, mulk:mulkler(id, ad, adres), kiraci:kiracilar(id, ad)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useKiralamaEkle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (yeni: Omit<Kiralama, 'id' | 'olusturma_tarihi' | 'guncelleme_tarihi' | 'kiraci' | 'mulk'>) => {
      const { data, error } = await supabase.from('kiralar').insert(yeni).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kiralar'] })
      qc.invalidateQueries({ queryKey: ['kiracilar'] })
    },
  })
}

export function useKiralamaGuncelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Kiralama> & { id: string }) => {
      // Nested objeler ve hesaplanan/gereksiz alanları çıkar
      const { kiraci, mulk, olusturma_tarihi, guncelleme_tarihi, kontrat_baslangici, kiraci_id, ...rest } = updates as any
      void kiraci; void mulk; void olusturma_tarihi; void guncelleme_tarihi; void kontrat_baslangici; void kiraci_id
      console.log('Kiralama güncelleniyor:', rest)
      const { error } = await supabase
        .from('kiralar').update(rest).eq('id', id)
      if (error) {
        console.error('Kiralama güncelleme hatası:', error)
        throw error
      }
      return rest
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kiralar'] })
      qc.invalidateQueries({ queryKey: ['kiracilar'] })
    },
  })
}