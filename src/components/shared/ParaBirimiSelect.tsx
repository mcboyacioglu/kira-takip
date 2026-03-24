import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useParaBirimleri } from '@/hooks/useParaBirimleri'

interface ParaBirimiSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function ParaBirimiSelect({
  value,
  onValueChange,
  placeholder = 'Para birimi',
  disabled,
  className,
}: ParaBirimiSelectProps) {
  const { data: paraBirimleri = [], isLoading } = useParaBirimleri()

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {paraBirimleri.map((pb) => (
          <SelectItem key={pb.kod} value={pb.kod}>
            <span className="flex items-center gap-2">
              <span className="w-4 text-center font-mono text-xs text-muted-foreground">
                {pb.sembol}
              </span>
              {pb.kod} – {pb.ad}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
