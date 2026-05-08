import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { NotificationBell } from '@/components/NotificationBell'
import { useAuth } from '@/context/AuthContext'
import { isFirebaseBackend } from '@/lib/mode'
import { logout } from '@/services/authService'

const linkBase =
  'rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-200 dark:hover:bg-zinc-800/80'
const activeLink = 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100'

export function Layout() {
  const { user, loading } = useAuth()
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function onSignOut() {
    setLogoutError(null)
    try {
      await logout()
    } catch (e) {
      setLogoutError(e instanceof Error ? e.message : 'Sign out failed')
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        {!isFirebaseBackend() && (
          <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
            Local mode — data in this browser only (localStorage). Firebase is disabled until you set VITE_USE_FIREBASE=true.
          </div>
        )}
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight text-zinc-900 no-underline dark:text-zinc-50">
            DatasetDeal
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/requirements" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ''}`}>
                Browse
              </NavLink>
              {!loading && user && (
                <>
                  <NavLink to="/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ''}`}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/requirements/new" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ''}`}>
                    New post
                  </NavLink>
                </>
              )}
              {!loading && !user && (
                <>
                  <NavLink to="/login" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ''}`}>
                    Log in
                  </NavLink>
                  <NavLink to="/register" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ''}`}>
                    Register
                  </NavLink>
                </>
              )}
            </nav>
            {!loading && user && (
              <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-2 sm:border-t-0 sm:pt-0 dark:border-zinc-800">
                <NotificationBell userId={user.uid} />
                <span className="max-w-[12rem] truncate text-sm text-zinc-600 dark:text-zinc-300" title={user.email ?? user.uid}>
                  {user.displayName ?? user.email ?? user.uid.slice(0, 8)}
                </span>
                <button
                  type="button"
                  className={`${linkBase} border-0 bg-transparent cursor-pointer`}
                  onClick={() => void onSignOut()}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
        {logoutError && (
          <div className="mx-auto max-w-5xl px-4 pb-2 text-sm text-red-600 dark:text-red-400">{logoutError}</div>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Compensation is arranged off-platform. DatasetDeal connects publishers and contributors.
      </footer>
    </div>
  )
}
