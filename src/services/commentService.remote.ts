import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'

import { COLLECTIONS } from '@/domain/paths'
import type { RequirementComment } from '@/domain/types'
import { requireDb } from '@/lib/firebase'

import { pushAppNotification } from './notificationService.remote'

const db = () => requireDb()

function commentsCol(requirementId: string) {
  return collection(db(), COLLECTIONS.requirements, requirementId, COLLECTIONS.comments)
}

export async function addComment(
  requirementId: string,
  authorId: string,
  authorDisplayName: string,
  text: string,
  parentCommentId: string | null,
  replyToAuthorId: string | null,
  replyToAuthorDisplayName: string | null,
) {
  await addDoc(commentsCol(requirementId), {
    requirementId,
    authorId,
    authorDisplayName,
    text,
    parentCommentId,
    replyToAuthorId,
    replyToAuthorDisplayName,
    createdAt: serverTimestamp(),
  })

  const reqSnap = await getDoc(doc(db(), COLLECTIONS.requirements, requirementId))
  if (!reqSnap.exists()) return
  const req = reqSnap.data()
  const pub = req.publisherId as string
  const titleShort = (req.title as string) ?? 'Post'

  if (parentCommentId) {
    const parentSnap = await getDoc(doc(db(), COLLECTIONS.requirements, requirementId, COLLECTIONS.comments, parentCommentId))
    const parentAuthorId = parentSnap.exists() ? (parentSnap.data().authorId as string) : null
    const parentDisplayName = parentSnap.exists() ? (parentSnap.data().authorDisplayName as string) : ''

    if (parentAuthorId && parentAuthorId !== authorId) {
      await pushAppNotification(
        parentAuthorId,
        authorId,
        'reply',
        'Someone replied to you',
        `${authorDisplayName} on "${titleShort}" replied to @${parentDisplayName}`,
        requirementId,
      )
    }
    const pubAlreadyNotifiedAsParent = parentAuthorId === pub
    if (pub !== authorId && !pubAlreadyNotifiedAsParent) {
      await pushAppNotification(
        pub,
        authorId,
        'comment',
        'New reply on your post',
        `${authorDisplayName} added a reply on "${titleShort}"`,
        requirementId,
      )
    }
  } else if (pub !== authorId) {
    await pushAppNotification(
      pub,
      authorId,
      'comment',
      'New comment',
      `${authorDisplayName} commented on "${titleShort}"`,
      requirementId,
    )
  }
}

export function subscribeComments(
  requirementId: string,
  onNext: (items: RequirementComment[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(commentsCol(requirementId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const items: RequirementComment[] = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          requirementId,
          authorId: data.authorId as string,
          authorDisplayName: data.authorDisplayName as string,
          text: data.text as string,
          parentCommentId: (data.parentCommentId as string | null) ?? null,
          replyToAuthorId: (data.replyToAuthorId as string | null) ?? null,
          replyToAuthorDisplayName: (data.replyToAuthorDisplayName as string | null) ?? null,
          createdAt: data.createdAt,
        }
      })
      onNext(items)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}
