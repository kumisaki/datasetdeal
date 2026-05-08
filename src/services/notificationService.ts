import type { AppNotification } from '@/domain/types'
import { isFirebaseBackend } from '@/lib/mode'
import * as local from '@/local/db'
import * as remote from './notificationService.remote'

export const subscribeUserNotifications = isFirebaseBackend()
  ? remote.subscribeUserNotifications
  : (userId: string, onNext: (items: AppNotification[]) => void, onError?: (e: Error) => void) =>
      local.subscribeUserNotifications(userId, onNext, onError)

export const markNotificationRead = isFirebaseBackend()
  ? remote.markNotificationRead
  : async (userId: string, notificationId: string) => {
      local.markNotificationRead(userId, notificationId)
    }

export const markAllNotificationsRead = isFirebaseBackend()
  ? remote.markAllNotificationsRead
  : async (userId: string) => {
      local.markAllNotificationsRead(userId)
    }
