import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Building2, MapPin } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import MulkForm from '@/components/forms/MulkForm'
import { useMulkler } from '@/hooks/useMulkler'
import { useKiralamalar } from '@/hooks/useKiracilar'
import { useAuth } from '@/hooks/useAuth'
import { formatPara, formatTarih } from '@/lib/utils'

export default function MulklerListesi() {
  const [formAcik, setFormAcik] = useState(false)
  const { isAdmin } = useAuth()
  const { data: mulkler = [], isLoading } = useMulkler(false)
  const { data: kiralar = [] } = useKiralamalar({ sadecaAktif: true })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mülkler"
        description="Portföydeki tüm mülkler"
        actions={
          isAdmin && (
            <Button onClick={() => setFormAcik(true)} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Yeni Mülk
            </Button>
          )
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : mulkler.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Henüz mülk eklenmemiş.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setFormAcik(true)}>
            Mülk Ekle
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mulkler.map((mulk) => {
            const aktifKiracilar = kiralar.filter(k => k.mulk_id === mulk.id)
            const aktif = !mulk.bitis_tarihi || new Date(mulk.bitis_tarihi) > new Date()
            return (
              <Link
                key={mulk.id}
                to={`/mulkler/${mulk.id}`}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium group-hover:text-primary transition-colors">{mulk.ad}</h3>
                      {mulk.adres && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {mulk.adres}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={aktif ? 'positive' : 'muted'}>
                    {aktif ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  {mulk.satin_alma_fiyati && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alış Fiyatı</span>
                      <span className="tabular-nums font-medium">
                        {formatPara(mulk.satin_alma_fiyati, mulk.para_birimi)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aktif Kiracı</span>
                    <span className="font-medium">{aktifKiracilar.length}</span>
                  </div>
                  {mulk.baslangic_tarihi && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Başlangıç</span>
                      <span>{formatTarih(mulk.baslangic_tarihi)}</span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Dialog open={formAcik} onOpenChange={setFormAcik}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Mülk Ekle</DialogTitle>
          </DialogHeader>
          <MulkForm onSuccess={() => setFormAcik(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
