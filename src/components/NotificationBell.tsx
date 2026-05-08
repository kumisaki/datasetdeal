import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import type { AppNotification } from '@/domain/types'
import { tryRequestNotificationPermission } from '@/lib/browserNotify'
import { markAllNotificationsRead, markNotificationRead, subscribeUserNotifications } from '@/services/notificationService'

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return subscribeUserNotifications(
      userId,
      setItems,
      () => {
        /* ignore */
      },
    )
  }, [userId])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const unread = items.filter((n) => !n.read).length

  async function onOpenItem(n: AppNotification) {
    if (!n.read) {
      try {
        await markNotificationRead(userId, n.id)
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
  }

  async function onMarkAll() {
    try {
      await markAllNotificationsRead(userId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Open notifications"
        onClick={() => setOpen((v) => !v)}
      >
        Alerts
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500">Notifications</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-violet-600 hover:underline dark:text-violet-400"
                onClick={() => tryRequestNotificationPermission()}
              >
                Desktop
              </button>
              {unread > 0 && (
                <button type="button" className="text-xs text-violet-600 hover:underline dark:text-violet-400" onClick={() => void onMarkAll()}>
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((n) => {
              const href = n.requirementId ? `/requirements/${n.requirementId}` : '#'
              const inner = (
                <>
                  <p className={`text-sm font-medium ${n.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{n.body}</p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ''}
                  </p>
                </>
              )
              return (
                <li key={n.id}>
                  {n.requirementId ? (
                    <Link
                      to={href}
                      className={`block px-3 py-2 no-underline hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!n.read ? 'bg-violet-50/80 dark:bg-violet-950/30' : ''}`}
                      onClick={() => void onOpenItem(n)}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!n.read ? 'bg-violet-50/80 dark:bg-violet-950/30' : ''}`}
                      onClick={() => void onOpenItem(n)}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              )
            })}
            {!items.length && <li className="px-3 py-6 text-center text-sm text-zinc-500">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
