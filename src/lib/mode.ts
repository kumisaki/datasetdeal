/** When false (default), the app uses an in-browser local store (no Firebase account or CLI). */
export function isFirebaseBackend(): boolean {
  return import.meta.env.VITE_USE_FIREBASE === 'true'
}
