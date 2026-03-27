import { useState } from 'react'
import { Plus, Pencil, UserCircle2 } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import KisiForm from '@/components/forms/KisiForm'
import { useKisiler } from '@/hooks/useKisiler'
import { useAuth } from '@/hooks/useAuth'
import { formatTarih } from '@/lib/utils'
import { Kisi } from '@/types'

export default function Kisiler() {
  const [formAcik, setFormAcik] = useState(false)
  const [seciliKisi, setSeciliKisi] = useState<Kisi | undefined>()
  const { data: kisiler = [], isLoading } = useKisiler()
  const { isAdmin } = useAuth()

  const handleYeni = () => {
    setSeciliKisi(undefined)
    setFormAcik(true)
  }

  const handleDuzenle = (kisi: Kisi) => {
    setSeciliKisi(kisi)
    setFormAcik(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kişiler"
        description="Ortaklar, tahsildarlar ve sistem kullanıcıları"
        actions={
          isAdmin && (
            <Button onClick={handleYeni} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Kişi Ekle
            </Button>
          )
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : kisiler.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <UserCircle2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Henüz kişi eklenmemiş.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleYeni}>
            Kişi Ekle
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>TC / Pasaport</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kisiler.map(k => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.tam_ad}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{k.kimlik_no ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{k.telefon ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{k.eposta ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTarih(k.baslangic_tarihi)}</TableCell>
                  <TableCell>
                    <Badge variant={!k.bitis_tarihi || new Date(k.bitis_tarihi) > new Date() ? 'positive' : 'muted'}>
                      {!k.bitis_tarihi || new Date(k.bitis_tarihi) > new Date() ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {k.admin ? (
                      <Badge variant="warning" className="text-xs">Admin</Badge>
                    ) : k.kullanici_hesabi_var_mi ? (
                      <Badge variant="default" className="text-xs">Kullanıcı</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuzenle(k)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formAcik} onOpenChange={setFormAcik}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{seciliKisi ? 'Kişi Düzenle' : 'Yeni Kişi Ekle'}</DialogTitle>
          </DialogHeader>
          <KisiForm kisi={seciliKisi} onSuccess={() => { setFormAcik(false); setSeciliKisi(undefined) }} />
        </DialogContent>
      </Dialog>

    </div>
  )
}
