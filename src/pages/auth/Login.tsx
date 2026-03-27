import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, Loader2, Mail, KeyRound } from 'lucide-react'

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [adim, setAdim] = useState<'email' | 'otp'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)

  if (loading) return null
  if (session) return <Navigate to="/" replace />

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setHata(null)
    setBilgi(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    setIsLoading(false)
    if (error) {
      setHata(error.message)
      return
    }

    setAdim('otp')
    setBilgi('E-posta adresinize tek kullanımlık giriş kodu gönderdik.')
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setHata(null)
    setBilgi(null)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    setIsLoading(false)
    if (error) {
      setHata(error.message)
      return
    }

    setBilgi('Giriş başarılı, yönlendiriliyorsunuz...')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Home className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">Kira Takip</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mülk ve kira yönetim sistemi</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-2 mb-4">
            <h2 className="text-lg font-semibold">Giriş Yap</h2>
            <p className="text-sm text-muted-foreground">
              {adim === 'email'
                ? 'E-posta adresinizi girin, size tek kullanımlık kod gönderelim.'
                : 'E-postanıza gelen 6 haneli kodu girin.'}
            </p>
          </div>

          {adim === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">E-posta Adresi</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {hata && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{hata}</p>}
              {bilgi && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{bilgi}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || !email}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Kod Gönder
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="otp">Tek Kullanımlık Kod</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  autoFocus
                />
              </div>

              {hata && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{hata}</p>}
              {bilgi && <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{bilgi}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || otp.length < 6}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Kod ile Giriş Yap
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setAdim('email')
                  setOtp('')
                  setHata(null)
                  setBilgi(null)
                }}
              >
                E-postayı Değiştir
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
