import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ISLEM_TURU_LABEL, IslemTuru } from '@/types'

interface CalendarEvent {
  id: string
  kira_id: string
  turu: 'baslangic' | 'bitis' | 'odeme_tarihi'
  tarih: string
  baslik: string
  aciklama?: string
  renk: string
  kiraci_adi?: string
  mulk_adi?: string
}

export function KiraCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedMulk, setSelectedMulk] = useState<string>('')
  const [mulkler, setMulkler] = useState<Array<{ id: string; ad: string }>>([])

  useEffect(() => {
    fetchMonthEvents()
  }, [currentDate, selectedMulk])

  useEffect(() => {
    const fetchMulkler = async () => {
      const { data } = await supabase
        .from('mulkler')
        .select('id, ad')
        .order('ad', { ascending: true })
      setMulkler((data || []) as Array<{ id: string; ad: string }>)
    }
    fetchMulkler()
  }, [])

  const fetchMonthEvents = async () => {
    setLoading(true)
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

      const { data: kiralarData, error: kiralarErr } = await supabase
        .from('kiralar')
        .select('id, mulk_id, baslangic_tarihi, bitis_tarihi, kiraci:kiracilar(ad), mulk:mulkler(id, ad)')
        .or(`baslangic_tarihi.gte.${start},bitis_tarihi.gte.${start}`)
        .order('baslangic_tarihi', { ascending: true })

      if (kiralarErr) throw kiralarErr

      const kiraEvents: CalendarEvent[] = []
      for (const k of kiralarData || []) {
        if (selectedMulk && (k as any).mulk_id !== selectedMulk) continue
        const kiraciAd = (k as any).kiraci?.ad
        const mulkAd = (k as any).mulk?.ad
        if ((k as any).baslangic_tarihi >= start && (k as any).baslangic_tarihi <= end) {
          kiraEvents.push({
            id: `kira-baslangic-${(k as any).id}`,
            kira_id: (k as any).id,
            turu: 'baslangic',
            tarih: (k as any).baslangic_tarihi,
            baslik: 'Kira Başlangıcı',
            aciklama: 'Kiralama başlangıç tarihi',
            renk: '#16A34A',
            kiraci_adi: kiraciAd,
            mulk_adi: mulkAd,
          })
        }
        if ((k as any).bitis_tarihi && (k as any).bitis_tarihi >= start && (k as any).bitis_tarihi <= end) {
          kiraEvents.push({
            id: `kira-bitis-${(k as any).id}`,
            kira_id: (k as any).id,
            turu: 'bitis',
            tarih: (k as any).bitis_tarihi,
            baslik: 'Kira Bitişi',
            aciklama: 'Kiralama bitiş tarihi',
            renk: '#DC2626',
            kiraci_adi: kiraciAd,
            mulk_adi: mulkAd,
          })
        }
      }

      const { data: islemData, error: islemErr } = await supabase
        .from('islemler')
        .select('id, tarih, tur, tutar, para_birimi, aciklama, mulk_id, kiraci:kiracilar(ad), mulk:mulkler(ad)')
        .gte('tarih', start)
        .lte('tarih', end)
        .order('tarih', { ascending: true })

      if (islemErr) throw islemErr

      const islemEvents: CalendarEvent[] = (islemData || [])
        .filter((i: any) => !selectedMulk || i.mulk_id === selectedMulk)
        .map((i: any) => ({
        id: `islem-${i.id}`,
        kira_id: '',
        turu: 'odeme_tarihi',
        tarih: i.tarih,
        baslik: ISLEM_TURU_LABEL[i.tur as IslemTuru] ?? `İşlem: ${i.tur}`,
        aciklama: `${Number(i.tutar).toLocaleString('tr-TR')} ${i.para_birimi}${i.aciklama ? ` - ${i.aciklama}` : ''}`,
        renk: '#6366F1',
        kiraci_adi: i.kiraci?.ad,
        mulk_adi: i.mulk?.ad,
      }))

      setEvents([...kiraEvents, ...islemEvents])
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  })

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return events.filter(e => e.tarih === dayStr)
  }

  const previousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))
  }

  const goToday = () => {
    setCurrentDate(new Date())
  }

  if (loading && events.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {format(currentDate, 'MMMM yyyy', { locale: tr })}
        </h2>
        <div className="flex gap-2 items-center">
          <select
            value={selectedMulk}
            onChange={(e) => setSelectedMulk(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">Tüm Mülkler</option>
            {mulkler.map((m) => (
              <option key={m.id} value={m.id}>{m.ad}</option>
            ))}
          </select>
          <button
            onClick={goToday}
            className="px-3 py-2 hover:bg-accent rounded-lg transition text-sm"
            title="Bugün"
          >
            Bugün
          </button>
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-accent rounded-lg transition"
            title="Önceki ay"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-accent rounded-lg transition"
            title="Sonraki ay"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Gün başlıkları */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
          <div key={day} className="text-center font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Takvim Grid */}
      <div className="grid grid-cols-7 gap-2 min-h-96">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toString()}
              className={`min-h-24 border rounded-lg p-2 ${
                isCurrentMonth ? 'bg-card' : 'bg-muted/20'
              } ${isToday(day) ? 'border-primary border-2 ring-1 ring-primary/30' : ''} hover:bg-accent/30 transition cursor-pointer`}
            >
              <div className="font-semibold text-sm mb-1">
                {format(day, 'd')}
              </div>

              {/* Etkinlikler */}
              <div className="space-y-1">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: event.renk || '#3B82F6' }}
                    title={event.baslik}
                  >
                    {event.baslik}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Detail Popup */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-4 h-4 rounded mt-1 flex-shrink-0"
                style={{ backgroundColor: selectedEvent.renk || '#3B82F6' }}
              ></div>
              <div>
                <h3 className="font-bold text-lg">{selectedEvent.baslik}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedEvent.tarih), 'd MMMM yyyy', { locale: tr })}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              {selectedEvent.kiraci_adi && (
                <div>
                  <span className="text-muted-foreground">Kiracı:</span>{' '}
                  <span className="font-medium">{selectedEvent.kiraci_adi}</span>
                </div>
              )}
              {selectedEvent.mulk_adi && (
                <div>
                  <span className="text-muted-foreground">Mülk:</span>{' '}
                  <span className="font-medium">{selectedEvent.mulk_adi}</span>
                </div>
              )}
              {selectedEvent.aciklama && (
                <div>
                  <span className="text-muted-foreground">Açıklama:</span>{' '}
                  <span>{selectedEvent.aciklama}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 bg-muted hover:bg-accent text-foreground font-medium py-2 rounded-lg transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KiraCalendar
