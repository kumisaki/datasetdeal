import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { COLLECTIONS } from '@/domain/paths'
import type { UserProfile } from '@/domain/types'
import { requireDb } from '@/lib/firebase'

const db = () => requireDb()

export async function createUserProfile(uid: string, displayName: string, email: string | null) {
  const ref = doc(db(), COLLECTIONS.users, uid)
  await setDoc(ref, {
    displayName,
    email,
    createdAt: serverTimestamp(),
  })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), COLLECTIONS.users, uid))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    displayName: d.displayName as string,
    email: (d.email as string | undefined) ?? null,
    createdAt: d.createdAt,
  }
}
