import PageHeader from '@/components/shared/PageHeader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PAGE_VISIBILITY_DEFAULTS, PageKey, PageStage, useEffectivePageVisibility, useUpdatePageVisibility } from '@/hooks/usePageVisibility'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'

export default function SayfaErisim() {
  const { isAdmin, loading } = useAuth()
  const visibility = useEffectivePageVisibility()
  const updateVisibility = useUpdatePageVisibility()

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!isAdmin) return <Navigate to="/" replace />

  const pageItems: Array<{ key: PageKey; label: string }> = [
    { key: '/', label: 'Ana Sayfa' },
    { key: '/islemler', label: 'İşlemler' },
    { key: '/kiracilar', label: 'Kiracılar' },
    { key: '/mulkler', label: 'Mülkler' },
    { key: '/takvim', label: 'Takvim' },
    { key: '/raporlar', label: 'Raporlar' },
    { key: '/raporlar/ortaklar', label: 'Ortak Raporu' },
    { key: '/bildirimler', label: 'Bildirimler' },
    { key: '/veri-girisi', label: 'Veri Girişi' },
    { key: '/ayarlar/kisiler', label: 'Ayarlar > Kişiler' },
    { key: '/ayarlar/sayfa-erisim', label: 'Ayarlar > Sayfa Erişim' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sayfa Erişim"
        description="Sayfaları All veya Admin only olarak işaretleyin"
      />

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold">Erişim Durumu</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Admin olmayan kullanıcılar yalnızca <b>all</b> işaretli sayfaları görür.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sayfa</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((p) => {
              const current = visibility[p.key] ?? PAGE_VISIBILITY_DEFAULTS[p.key]
              return (
                <TableRow key={p.key}>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell>
                    <div className="inline-flex rounded-lg border border-border overflow-hidden">
                      <button
                        className={`px-3 py-1.5 text-sm ${current === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}`}
                        onClick={() => updateVisibility.mutate({ page_key: p.key, stage: 'all' as PageStage })}
                      >
                        All
                      </button>
                      <button
                        className={`px-3 py-1.5 text-sm border-l border-border ${current === 'admin_only' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}`}
                        onClick={() => updateVisibility.mutate({ page_key: p.key, stage: 'admin_only' as PageStage })}
                      >
                        Admin only
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
