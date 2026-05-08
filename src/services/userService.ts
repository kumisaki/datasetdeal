import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './userService.remote'

export async function createUserProfile(uid: string, displayName: string, email: string | null) {
  if (isFirebaseBackend()) {
    return remote.createUserProfile(uid, displayName, email)
  }
  local.createUserProfile(uid, displayName, email)
}

export async function getUserProfile(uid: string) {
  if (isFirebaseBackend()) {
    return remote.getUserProfile(uid)
  }
  return local.getUserProfile(uid)
}
