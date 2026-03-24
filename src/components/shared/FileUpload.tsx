import { useRef, useState } from 'react'
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEkler, useEkYukle, useEkSil, useEkIndir } from '@/hooks/useEkler'
import { dosyaBoyutu, formatTarih } from '@/lib/utils'
import { Ek } from '@/types'
import { useToast } from '@/components/ui/use-toast'

interface FileUploadProps {
  iliskiTuru: 'mulk' | 'kiraci' | 'islem'
  iliskiId: string
}

export default function FileUpload({ iliskiTuru, iliskiId }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { data: ekler = [], isLoading } = useEkler(iliskiTuru, iliskiId)
  const { toast } = useToast()
  const yukle = useEkYukle()
  const sil = useEkSil()
  const indir = useEkIndir()

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((dosya) => {
      yukle.mutate({ dosya, iliskiTuru, iliskiId }, {
        onError: (error: any) => {
          toast({ variant: 'destructive', title: 'Yükleme hatası', description: error.message })
        }
      })
    })
  }

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Dosyaları sürükle veya <span className="text-primary cursor-pointer">tıkla</span>
        </p>
      </div>

      {/* File list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
      ) : ekler.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz dosya eklenmemiş.</p>
      ) : (
        <ul className="space-y-2">
          {ekler.map((ek: Ek) => (
            <li
              key={ek.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ek.dosya_adi}</p>
                <p className="text-xs text-muted-foreground">
                  {ek.boyut_bayt ? dosyaBoyutu(ek.boyut_bayt) : ''} · {formatTarih(ek.olusturma_tarihi)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => indir.mutate(ek)}
                  disabled={indir.isPending}
                >
                  {indir.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => sil.mutate({ ek })}
                  disabled={sil.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {yukle.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Yükleniyor...
        </div>
      )}
    </div>
  )
}
