import type { SessionUser } from '@/domain/session'
import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './authService.remote'

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<SessionUser> {
  if (isFirebaseBackend()) {
    return remote.registerWithEmail(email, password, displayName)
  }
  return local.localRegister(email, password, displayName)
}

export async function loginWithEmail(email: string, password: string): Promise<SessionUser> {
  if (isFirebaseBackend()) {
    return remote.loginWithEmail(email, password)
  }
  return local.localLogin(email, password)
}

export async function logout(): Promise<void> {
  if (isFirebaseBackend()) {
    return remote.logout()
  }
  local.localLogout()
}
