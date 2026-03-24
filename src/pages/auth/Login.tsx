import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, Loader2, Mail } from 'lucide-react'

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [gonderildi, setGonderildi] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  if (loading) return null
  if (session) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setHata(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setIsLoading(false)
    if (error) {
      setHata(error.message)
    } else {
      setGonderildi(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Home className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">Kira Takip</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mülk ve kira yönetim sistemi
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          {gonderildi ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">E-posta gönderildi</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{email}</span> adresine bir giriş bağlantısı gönderdik. Lütfen gelen kutunuzu kontrol edin.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setGonderildi(false); setEmail('') }}
              >
                Farklı e-posta dene
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Giriş Yap</h2>
                <p className="text-sm text-muted-foreground">
                  E-posta adresinize magic link göndereceğiz.
                </p>
              </div>

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

              {hata && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {hata}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !email}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Giriş Bağlantısı Gönder
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
