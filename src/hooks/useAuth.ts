import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let alive = true
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const fetchUserData = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('kisiler')
          .select('admin')
          .eq('kullanici_id', userId)
          .maybeSingle()
        if (error) {
          if (alive) setIsAdmin(false)
          return
        }
        if (alive) setIsAdmin(data?.admin ?? false)
      } catch {
        if (alive) setIsAdmin(false)
      }
    }

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (!alive) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserData(session.user.id)
        } else if (alive) {
          setIsAdmin(false)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (event === 'INITIAL_SESSION') return
        if (!alive) return
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        if (nextSession?.user) {
          await fetchUserData(nextSession.user.id)
        } else if (alive) {
          setIsAdmin(false)
        }
      }
    )

    fallbackTimer = setTimeout(() => {
      if (alive) setLoading(false)
    }, 4000)

    return () => {
      alive = false
      if (fallbackTimer) clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setIsAdmin(false)
    setLoading(false)
  }

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, loading, isAdmin, signOut }),
    [session, user, loading, isAdmin]
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx) return ctx
  return {
    session: null,
    user: null,
    loading: false,
    isAdmin: false,
    signOut: async () => undefined,
  }
}
