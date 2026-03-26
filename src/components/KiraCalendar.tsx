import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  id: string;
  kira_id: string;
  turu: 'baslangic' | 'bitis' | 'odeme_tarihi';
  tarih: string;
  baslik: string;
  aciklama?: string;
  renk: string;
  kirac_adi?: string;
  mulk_adi?: string;
}

export function KiraCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchMonthEvents();
  }, [currentDate]);

  const fetchMonthEvents = async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('v_takvim_ozeti')
        .select('*')
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.tarih === dayStr);
  };

  const previousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  if (loading && events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Önceki ay"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Sonraki ay"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Gün başlıkları */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Pz'].map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 py-2">
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
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } hover:bg-blue-50 transition cursor-pointer`}
            >
              <div className="font-semibold text-sm mb-1 text-gray-900">
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
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-4 h-4 rounded mt-1 flex-shrink-0"
                style={{ backgroundColor: selectedEvent.renk || '#3B82F6' }}
              ></div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selectedEvent.baslik}</h3>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedEvent.tarih), 'd MMMM yyyy')}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              {selectedEvent.kirac_adi && (
                <div>
                  <span className="text-gray-600">Kiracı:</span>{' '}
                  <span className="font-medium">{selectedEvent.kirac_adi}</span>
                </div>
              )}
              {selectedEvent.mulk_adi && (
                <div>
                  <span className="text-gray-600">Mülk:</span>{' '}
                  <span className="font-medium">{selectedEvent.mulk_adi}</span>
                </div>
              )}
              {selectedEvent.aciklama && (
                <div>
                  <span className="text-gray-600">Açıklama:</span>{' '}
                  <span>{selectedEvent.aciklama}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 rounded-lg transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KiraCalendar;
