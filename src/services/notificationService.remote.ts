import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import { COLLECTIONS } from '@/domain/paths'
import type { AppNotification, AppNotificationType } from '@/domain/types'
import { requireAuth, requireDb } from '@/lib/firebase'
import { pingBrowserNotification } from '@/lib/browserNotify'

const db = () => requireDb()

function notificationsCol(recipientId: string) {
  return collection(db(), COLLECTIONS.users, recipientId, COLLECTIONS.notifications)
}

/** Creates a notification doc under the recipient's user subcollection (actor must be signed-in user). */
export async function pushAppNotification(
  recipientId: string,
  actorId: string,
  type: AppNotificationType,
  title: string,
  body: string,
  requirementId: string | null,
) {
  if (recipientId === actorId) return
  await addDoc(notificationsCol(recipientId), {
    recipientId,
    actorId,
    type,
    title,
    body,
    requirementId,
    read: false,
    createdAt: serverTimestamp(),
  })
  const self = requireAuth().currentUser?.uid
  if (self === recipientId) {
    pingBrowserNotification(title, body)
  }
}

export function subscribeUserNotifications(
  userId: string,
  onNext: (items: AppNotification[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(notificationsCol(userId), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const items: AppNotification[] = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          recipientId: data.recipientId as string,
          actorId: data.actorId as string,
          type: data.type as AppNotificationType,
          title: data.title as string,
          body: data.body as string,
          requirementId: (data.requirementId as string | null) ?? null,
          read: !!(data.read as boolean | undefined),
          createdAt: data.createdAt,
        }
      })
      onNext(items)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const ref = doc(db(), COLLECTIONS.users, userId, COLLECTIONS.notifications, notificationId)
  await updateDoc(ref, { read: true })
}

export async function markAllNotificationsRead(userId: string) {
  const q = query(notificationsCol(userId), where('read', '==', false))
  const snap = await getDocs(q)
  if (snap.empty) return
  const batch = writeBatch(db())
  for (const d of snap.docs) {
    batch.update(d.ref, { read: true })
  }
  await batch.commit()
}
