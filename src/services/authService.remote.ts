import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'

import type { SessionUser } from '@/domain/session'
import { requireAuth } from '@/lib/firebase'

import { createUserProfile } from './userService.remote'

function toSession(u: { uid: string; email: string | null; displayName: string | null }): SessionUser {
  return { uid: u.uid, email: u.email, displayName: u.displayName }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<SessionUser> {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password)
  await updateProfile(cred.user, { displayName })
  await createUserProfile(cred.user.uid, displayName, cred.user.email)
  return toSession({
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName,
  })
}

export async function loginWithEmail(email: string, password: string): Promise<SessionUser> {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password)
  return toSession({
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName,
  })
}

export async function logout(): Promise<void> {
  await signOut(requireAuth())
}
