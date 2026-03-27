import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Building2,
  BarChart3,
  Settings,
  X,
  Home,
  Database,
  CalendarDays,
  Bell,
  HandCoins,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import { useEffectivePageVisibility, PageKey } from '@/hooks/usePageVisibility'

const navItems = [
  { href: '/',           label: 'Ana Sayfa',  icon: LayoutDashboard },
  { href: '/islemler',   label: 'İşlemler',   icon: ArrowLeftRight },
  { href: '/kiracilar',  label: 'Kiracılar',  icon: Users },
  { href: '/mulkler',    label: 'Mülkler',    icon: Building2 },
  { href: '/takvim',     label: 'Takvim',     icon: CalendarDays },
  { href: '/bildirimler', label: 'Bildirimler', icon: Bell },
]

const reportItems = [
  { href: '/raporlar', label: 'Genel raporlar', icon: BarChart3 },
  { href: '/raporlar/ortaklar', label: 'Ortak raporu', icon: HandCoins },
]

const adminItems = [
  { href: '/veri-girisi', label: 'Veri Girişi', icon: Database },
]

const settingsItems = [
  { href: '/ayarlar/kisiler', label: 'Kişiler', icon: Settings },
  { href: '/ayarlar/sayfa-erisim', label: 'Sayfa Erişim', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const { isAdmin } = useAuth()
  const visibility = useEffectivePageVisibility()
  const canSee = (href: string) => isAdmin || visibility[href as PageKey] === 'all'
  const visibleReports = reportItems.filter((item) => canSee(item.href))
  const visibleSettings = settingsItems.filter((item) => canSee(item.href))

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Kira Takip</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-auto p-3">
          {navItems.filter((item) => canSee(item.href)).map((item) => {
            const active =
              item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {/* Raporlar */}
          {visibleReports.length > 0 && (
            <div className="pt-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Raporlar
              </p>
              {visibleReports.map((item) => {
                const active =
                  item.href === '/raporlar'
                    ? location.pathname === '/raporlar'
                    : location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Admin-only: Veri Girişi */}
          {isAdmin && (
            <div className="pt-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Yönetim
              </p>
              {adminItems.filter((item) => canSee(item.href)).map((item) => {
                const active = location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}

          {visibleSettings.length > 0 && (
            <div className="pt-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Ayarlar
              </p>
              {visibleSettings.map((item) => {
              const active = location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
              })}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4">
          <p className="text-xs text-muted-foreground/50 text-center">v0.1.0</p>
        </div>
      </aside>
    </>
  )
}
