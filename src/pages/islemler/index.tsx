import { useState } from 'react'
import { Plus, ArrowLeftRight, FileDown } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import IslemForm from '@/components/forms/IslemForm'
import { useIslemler } from '@/hooks/useIslemler'
import { useMulkler } from '@/hooks/useMulkler'
import { useAuth } from '@/hooks/useAuth'
import { formatPara, formatTarih } from '@/lib/utils'
import { ISLEM_TURU_LABEL, IslemTuru } from '@/types'
import { Islem } from '@/types'

export default function Islemler() {
  const [formAcik, setFormAcik] = useState(false)
  const [seciliIslem, setSeciliIslem] = useState<Islem | undefined>()
  const [turFiltre, setTurFiltre] = useState<string>('')
  const [mulkFiltre, setMulkFiltre] = useState<string>('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const { isAdmin } = useAuth()

  const { data: islemler = [], isLoading } = useIslemler({
    tur: turFiltre as IslemTuru || undefined,
    mulkId: mulkFiltre || undefined,
    baslangic: baslangic || undefined,
    bitis: bitis || undefined,
  })
  const { data: mulkler = [] } = useMulkler(false)

  const handleYeni = () => {
    setSeciliIslem(undefined)
    setFormAcik(true)
  }

  const handleDuzenle = (islem: Islem) => {
    setSeciliIslem(islem)
    setFormAcik(true)
  }

  const exportCSV = () => {
    const header = 'Tarih,Tür,Kiracı,Mülk,Tutar,Para Birimi,USD Karşılığı,Açıklama'
    const rows = islemler.map(i =>
      [
        i.tarih,
        ISLEM_TURU_LABEL[i.tur],
        i.kiraci?.ad ?? '',
        i.mulk?.ad ?? '',
        i.tutar,
        i.para_birimi,
        i.usd_tutari ?? '',
        i.aciklama ?? '',
      ].join(',')
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'islemler.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="İşlemler"
        description="Tüm finansal işlem kayıtları"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <FileDown className="mr-1 h-4 w-4" />
              CSV
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={handleYeni}>
                <Plus className="mr-1 h-4 w-4" />
                Yeni İşlem
              </Button>
            )}
          </div>
        }
      />

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <Select value={turFiltre || 'all'} onValueChange={(v) => setTurFiltre(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tüm işlem türleri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Türler</SelectItem>
            {Object.entries(ISLEM_TURU_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mulkFiltre || 'all'} onValueChange={(v) => setMulkFiltre(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tüm mülkler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Mülkler</SelectItem>
            {mulkler.map(m => <SelectItem key={m.id} value={m.id}>{m.ad}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
            className="w-40"
            placeholder="Başlangıç"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={bitis}
            onChange={(e) => setBitis(e.target.value)}
            className="w-40"
            placeholder="Bitiş"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : islemler.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <ArrowLeftRight className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">İşlem bulunamadı.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleYeni}>
            İşlem Ekle
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Kiracı / Mülk</TableHead>
                <TableHead>Ödemeyi Alan</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead className="text-right">TRY</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {islemler.map(i => (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => handleDuzenle(i)}>
                  <TableCell className="tabular-nums text-muted-foreground">{formatTarih(i.tarih)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={i.tur.startsWith('kira_odeme') ? 'positive' : i.tur === 'kira_tahakkuku' ? 'warning' : i.tur === 'masraf_kiradan_dusulen' ? 'negative' : 'secondary'}
                      className="text-xs"
                    >
                      {ISLEM_TURU_LABEL[i.tur]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {i.kiraci?.ad ?? i.mulk?.ad ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {i.odemeyi_alan_kisi?.tam_ad ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatPara(i.tutar, i.para_birimi)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                    {i.try_tutari ? formatPara(i.try_tutari, 'TRY') : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                    {i.usd_tutari ? formatPara(i.usd_tutari, 'USD') : '—'}
                  </TableCell>
                  <TableCell className="w-8" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formAcik} onOpenChange={setFormAcik}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{seciliIslem ? 'İşlemi Düzenle' : 'Yeni İşlem'}</DialogTitle>
          </DialogHeader>
          <IslemForm islem={seciliIslem} onSuccess={() => { setFormAcik(false); setSeciliIslem(undefined) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
