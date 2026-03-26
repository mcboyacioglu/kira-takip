import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface Notification {
  id: string
  tip: string
  baslik: string
  mesaj: string
  okundu: boolean
  olusturma_tarihi: string
}

const tipIkonu: Record<string, string> = {
  gecikme: '⚠️',
  yaklasan_odeme: '📅',
  kontrat_bitis: '📋',
  genel: '📢',
}

interface NotificationCenterProps {
  embedded?: boolean
}

export function NotificationCenter({ embedded = false }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(embedded)

  useEffect(() => {
    fetchNotifications()
  }, [])

  // Dropdown açıkken dışarı tıklanınca kapat
  useEffect(() => {
    if (embedded) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.notification-wrapper')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [embedded])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('bildirimler')
        .select('*')
        .order('olusturma_tarihi', { ascending: false })
        .limit(20);

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.okundu).length)
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('bildirimler')
        .update({ okundu: true, okunma_tarihi: new Date().toISOString() })
        .eq('id', id);

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, okundu: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Bildirim güncellenirken hata:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.okundu).map(n => n.id);
      if (unreadIds.length === 0) return

      await supabase
        .from('bildirimler')
        .update({ okundu: true, okunma_tarihi: new Date().toISOString() })
        .in('id', unreadIds)

      setNotifications(prev => prev.map(n => ({ ...n, okundu: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Bildirimler güncellenirken hata:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('bildirimler').delete().eq('id', id);
      const deleted = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (deleted && !deleted.okundu) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Bildirim silinirken hata:', error)
    }
  }

  const panel = (
    <div className={embedded ? 'w-full rounded-xl border border-border bg-card max-h-[600px] flex flex-col' : 'absolute right-0 mt-2 w-96 rounded-lg border border-border bg-popover shadow-xl z-50 max-h-[500px] flex flex-col'}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-lg">Bildirimler</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-primary hover:underline"
          >
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Yükleniyor...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="text-4xl mb-2">🔕</div>
            <div>Bildirim yok</div>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 border-b border-border hover:bg-accent/30 transition cursor-pointer ${!notif.okundu ? 'bg-primary/5' : ''}`}
              onClick={() => !notif.okundu && markAsRead(notif.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{tipIkonu[notif.tip] || '📢'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm truncate">{notif.baslik}</h4>
                    {!notif.okundu && (
                      <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.mesaj}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notif.olusturma_tarihi), 'HH:mm - d MMM')}
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    deleteNotification(notif.id)
                  }}
                  className="text-muted-foreground hover:text-destructive transition flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="relative notification-wrapper">
      {!embedded && (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 text-muted-foreground hover:bg-accent rounded-lg transition"
        >
          <span className="text-2xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {showDropdown && panel}
    </div>
  )
}

export default NotificationCenter
