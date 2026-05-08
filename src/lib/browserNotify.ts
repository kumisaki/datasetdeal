/** Best-effort desktop notification (requires user gesture for permission on some browsers). */
export function tryRequestNotificationPermission(): void {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  } catch {
    /* insecure context or unsupported API */
  }
}

export function pingBrowserNotification(title: string, body: string) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    new Notification(title, { body, silent: false })
  } catch {
    /* ignore */
  }
}
