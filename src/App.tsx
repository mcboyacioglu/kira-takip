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
import SayfaErisim from '@/pages/ayarlar/SayfaErisim'
import KiraCalendar from '@/components/KiraCalendar'
import { NotificationCenter } from '@/components/NotificationCenter'
import { PartnerBalanceReport } from '@/components/PartnerBalanceReport'
import { Toaster } from '@/components/ui/toaster'
import { useEffectivePageVisibility, PageKey } from '@/hooks/usePageVisibility'

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

function PageGuard({ path, children }: { path: PageKey; children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth()
  const visibility = useEffectivePageVisibility()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  const canAccess = isAdmin || visibility[path] === 'all'
  if (!canAccess) return <Navigate to="/" replace />
  return <>{children}</>
}

// Wrapper page'ler — AppShell içinde düzgün render için
function TakvimPage() {
  return (
    <div className="p-6">
      <KiraCalendar />
    </div>
  )
}

function BildirimlerPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bildirimler</h1>
      <NotificationCenter embedded />
    </div>
  )
}

function OrtakRaporPage() {
  return (
    <div className="p-6">
      <PartnerBalanceReport />
    </div>
  )
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
          <Route path="islemler" element={<PageGuard path="/islemler"><Islemler /></PageGuard>} />
          <Route path="kiracilar" element={<PageGuard path="/kiracilar"><KiracilarListesi /></PageGuard>} />
          <Route path="kiracilar/:id" element={<PageGuard path="/kiracilar"><KiraciDetay /></PageGuard>} />
          <Route path="mulkler" element={<PageGuard path="/mulkler"><MulklerListesi /></PageGuard>} />
          <Route path="mulkler/:id" element={<PageGuard path="/mulkler"><MulkDetay /></PageGuard>} />
          <Route path="raporlar" element={<PageGuard path="/raporlar"><Raporlar /></PageGuard>} />
          <Route path="raporlar/ortaklar" element={<PageGuard path="/raporlar/ortaklar"><OrtakRaporPage /></PageGuard>} />
          <Route path="takvim" element={<PageGuard path="/takvim"><TakvimPage /></PageGuard>} />
          <Route path="bildirimler" element={<PageGuard path="/bildirimler"><BildirimlerPage /></PageGuard>} />
          <Route path="veri-girisi" element={<PageGuard path="/veri-girisi"><VeriGirisi /></PageGuard>} />
          <Route path="ayarlar/kisiler" element={<PageGuard path="/ayarlar/kisiler"><Kisiler /></PageGuard>} />
          <Route path="ayarlar/sayfa-erisim" element={<PageGuard path="/ayarlar/sayfa-erisim"><SayfaErisim /></PageGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
