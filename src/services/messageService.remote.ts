import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { COLLECTIONS } from '@/domain/paths'
import type { Message } from '@/domain/types'
import { requireDb } from '@/lib/firebase'

import { pushAppNotification } from './notificationService.remote'
import { getUserProfile } from './userService.remote'

const db = () => requireDb()

function messagesCollectionRef(requirementId: string, contributorUid: string) {
  return collection(
    db(),
    COLLECTIONS.requirements,
    requirementId,
    COLLECTIONS.threads,
    contributorUid,
    COLLECTIONS.messages,
  )
}

function threadDocRef(requirementId: string, contributorUid: string) {
  return doc(db(), COLLECTIONS.requirements, requirementId, COLLECTIONS.threads, contributorUid)
}

export async function sendMessage(
  requirementId: string,
  contributorUid: string,
  senderId: string,
  text: string,
) {
  const batchMessages = messagesCollectionRef(requirementId, contributorUid)
  await addDoc(batchMessages, {
    senderId,
    text,
    createdAt: serverTimestamp(),
  })
  await setDoc(
    threadDocRef(requirementId, contributorUid),
    {
      contributorUid,
      lastMessageAt: serverTimestamp(),
    },
    { merge: true },
  )

  const reqSnap = await getDoc(doc(db(), COLLECTIONS.requirements, requirementId))
  if (!reqSnap.exists()) return
  const pub = reqSnap.data().publisherId as string
  const recipientId = senderId === pub ? contributorUid : pub
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text
  const prof = await getUserProfile(senderId)
  const dn = prof?.displayName ?? senderId.slice(0, 8)
  await pushAppNotification(recipientId, senderId, 'dm', 'New direct message', `${dn}: ${preview}`, requirementId)
}

export function subscribeMessages(
  requirementId: string,
  contributorUid: string,
  onNext: (items: Message[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(messagesCollectionRef(requirementId, contributorUid), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const items: Message[] = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          senderId: data.senderId as string,
          text: data.text as string,
          createdAt: data.createdAt,
        }
      })
      onNext(items)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

/** Thread document ids under requirements/{id}/threads (each id is the contributor in that DM). */
export function subscribeRequirementThreadPartners(
  requirementId: string,
  onNext: (ids: string[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const threadsCol = collection(db(), COLLECTIONS.requirements, requirementId, COLLECTIONS.threads)
  return onSnapshot(
    threadsCol,
    (snap) => {
      onNext(snap.docs.map((d) => d.id).sort())
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}
