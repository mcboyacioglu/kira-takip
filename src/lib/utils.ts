import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPara(
  tutar: number | null | undefined,
  paraBirimi = 'TRY',
  sembol?: string
): string {
  if (tutar == null) return '—'

  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(tutar)

  const sym = sembol ?? paraBirimiSembol(paraBirimi)
  return `${formatted} ${sym}`
}

export function paraBirimiSembol(kod: string): string {
  const map: Record<string, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
  }
  return map[kod] ?? kod
}

export function formatTarih(tarih: string | null | undefined): string {
  if (!tarih) return '—'
  try {
    return format(parseISO(tarih), 'dd.MM.yyyy', { locale: tr })
  } catch {
    return tarih
  }
}

export function formatTarihUzun(tarih: string | null | undefined): string {
  if (!tarih) return '—'
  try {
    return format(parseISO(tarih), 'dd MMMM yyyy', { locale: tr })
  } catch {
    return tarih
  }
}

export function formatTarihAy(tarih: string | null | undefined): string {
  if (!tarih) return '—'
  try {
    return format(parseISO(tarih), 'MMMM yyyy', { locale: tr })
  } catch {
    return tarih
  }
}

export function bugunISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function dosyaBoyutu(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`
}

export function kisalt(metin: string, uzunluk = 40): string {
  if (metin.length <= uzunluk) return metin
  return `${metin.slice(0, uzunluk)}…`
}
