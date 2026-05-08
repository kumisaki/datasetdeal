import { onAuthStateChanged } from 'firebase/auth'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { SessionUser } from '@/domain/session'
import { auth } from '@/lib/firebase'
import { isFirebaseBackend } from '@/lib/mode'
import { getSessionUser, subscribeAuth as subscribeLocalAuth } from '@/local/db'

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  /** Re-read session from the local store (local mode only). Call after login/register so UI updates even if a subscriber threw during notify(). */
  syncLocalSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const syncLocalSession = useCallback(() => {
    if (!isFirebaseBackend()) {
      setUser(getSessionUser())
    }
  }, [])

  useEffect(() => {
    if (!isFirebaseBackend()) {
      setUser(getSessionUser())
      setLoading(false)
      const unsub = subscribeLocalAuth(() => {
        setUser(getSessionUser())
      })
      const onCustomAuth = () => {
        setUser(getSessionUser())
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('datasetdeal-auth-changed', onCustomAuth)
      }
      return () => {
        unsub()
        if (typeof window !== 'undefined') {
          window.removeEventListener('datasetdeal-auth-changed', onCustomAuth)
        }
      }
    }

    if (!auth) {
      setUser(null)
      setLoading(false)
      return
    }

    return onAuthStateChanged(auth, (u) => {
      setUser(
        u
          ? {
              uid: u.uid,
              email: u.email ?? null,
              displayName: u.displayName ?? null,
            }
          : null,
      )
      setLoading(false)
    })
  }, [])

  const value = useMemo(() => ({ user, loading, syncLocalSession }), [user, loading, syncLocalSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
