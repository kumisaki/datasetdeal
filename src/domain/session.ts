/** Minimal session user for UI + local auth (mirrors fields we use from Firebase User). */
export type SessionUser = {
  uid: string
  email: string | null
  displayName: string | null
}
