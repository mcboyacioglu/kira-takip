// Uygulama genelinde kullanılan TypeScript tipleri

export interface ParaBirimi {
  kod: string
  ad: string
  sembol: string
  aktif: boolean
  olusturma_tarihi: string
  guncelleme_tarihi: string
}

export interface Kisi {
  id: string
  tam_ad: string
  kimlik_no?: string
  telefon?: string
  eposta?: string
  kullanici_hesabi_var_mi: boolean
  kullanici_id?: string
  baslangic_tarihi?: string
  bitis_tarihi?: string
  admin?: boolean
  olusturma_tarihi: string
  guncelleme_tarihi: string
}

export interface Mulk {
  id: string
  ad: string
  detay?: string
  adres?: string
  satin_alma_fiyati?: number
  para_birimi: string
  baslangic_tarihi?: string
  bitis_tarihi?: string
  olusturma_tarihi: string
  guncelleme_tarihi: string
}

export interface MulkHissesi {
  id: string
  mulk_id: string
  kisi_id: string
  hisse_orani: number
  baslangic_tarihi: string
  bitis_tarihi?: string
  olusturma_tarihi: string
  guncelleme_tarihi: string
  kisi?: Kisi
}

export type IslemTuru =
  | 'kira_tahakkuku'
  | 'kira_odeme_nakit'
  | 'kira_odeme_banka'
  | 'kira_odeme_stopaj'
  | 'kira_odeme_depozitodan'
  | 'masraf_kiradan_dusulen'
  | 'transfer'
  | 'depozito_nakit'
  | 'depozito_banka'
  | 'depozito_iade'

export const ISLEM_TURU_LABEL: Record<IslemTuru, string> = {
  kira_tahakkuku:    'Kira Tahakkuku',
  kira_odeme_nakit:  'Kira Ödemesi (Nakit)',
  kira_odeme_banka:  'Kira Ödemesi (Banka)',
  kira_odeme_stopaj: 'Stopaj Ödemesi',
  kira_odeme_depozitodan: 'Depozitodan Kira Ödeme',
  masraf_kiradan_dusulen: 'Masraf (kiradan düşülen)',
  transfer:          'Transfer',
  depozito_nakit:   'Depozito (Nakit)',
  depozito_banka:   'Depozito (Banka)',
  depozito_iade:    'Depozito İadesi',
}

export const ISLEM_TURU_RENK: Record<IslemTuru, string> = {
  kira_tahakkuku:    'warning',
  kira_odeme_nakit:  'positive',
  kira_odeme_banka:  'positive',
  kira_odeme_stopaj: 'muted',
  kira_odeme_depozitodan: 'positive',
  masraf_kiradan_dusulen: 'negative',
  transfer:          'muted',
  depozito_nakit:   'muted',
  depozito_banka:   'muted',
  depozito_iade:    'muted',
}

export interface Kiraci {
  id: string
  ad: string
  uzun_ad?: string
  vergi_dairesi?: string
  vergi_no?: string
  kimlik_no?: string
  kontrat_baslangici?: string
  kontrat_sonu?: string
  olusturma_tarihi: string
  guncelleme_tarihi: string
}

export interface Kiralama {
  id: string
  kiraci_id: string
  mulk_id: string
  kira_tutari: number
  kira_para_birimi: string
  kontrat_baslangici?: string
  baslangic_tarihi: string
  bitis_tarihi?: string
  stopaj_takibi: boolean
  olusturma_tarihi: string
  guncelleme_tarihi: string
  kiraci?: Kiraci
  mulk?: Mulk
}

export interface Islem {
  id: string
  tarih: string
  saat?: string
  tur: IslemTuru
  tutar: number
  para_birimi: string
  odemeyi_alan?: string
  mulk_id?: string
  kiraci_id?: string
  aciklama?: string
  doviz_kuru?: number
  usd_tutari?: number
  try_tutari?: number
  olusturma_tarihi: string
  guncelleme_tarihi: string
  mulk?: Mulk
  kiraci?: Kiraci
  odemeyi_alan_kisi?: Kisi
}

export interface Ek {
  id: string
  iliski_turu: 'mulk' | 'kiraci' | 'islem'
  iliski_id: string
  dosya_adi: string
  depolama_yolu: string
  dosya_tipi?: string
  boyut_bayt?: number
  yukleyen_id?: string
  olusturma_tarihi: string
  guncelleme_tarihi: string
}

export interface DovizKuru {
  tarih: string
  para_birimi: string
  alis: number
  satis: number
  doviz_kuru?: number
}

export interface DashboardStats {
  aktif_kiraci_sayisi: number
  aktif_mulk_sayisi: number
  bu_ay_beklenen: Record<string, number>
  bu_ay_tahsilat: Record<string, number>
  gecikmiş_toplam: Record<string, number>
}
