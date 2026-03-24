import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/dashboard'
import Islemler from '@/pages/islemler'
import KiracilarListesi from '@/pages/kiracilar'
import KiraciDetay from '@/pages/kiracilar/KiraciDetay'
import MulklerListesi from '@/pages/mulkler'
import MulkDetay from '@/pages/mulkler/MulkDetay'
import Raporlar from '@/pages/raporlar'
import VeriGirisi from '@/pages/veri-girisi'
import Kisiler from '@/pages/ayarlar/Kisiler'
import { Toaster } from '@/components/ui/toaster'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!session) return <Navigate to="/giris" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/giris" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="islemler" element={<Islemler />} />
          <Route path="kiracilar" element={<KiracilarListesi />} />
          <Route path="kiracilar/:id" element={<KiraciDetay />} />
          <Route path="mulkler" element={<MulklerListesi />} />
          <Route path="mulkler/:id" element={<MulkDetay />} />
          <Route path="raporlar" element={<Raporlar />} />
          <Route path="veri-girisi" element={<VeriGirisi />} />
          <Route path="ayarlar/kisiler" element={<Kisiler />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
