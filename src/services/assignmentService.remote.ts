import type { DocumentData } from 'firebase/firestore'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import { COLLECTIONS } from '@/domain/paths'
import type { Assignment, AssignmentStatus } from '@/domain/types'
import { requireDb } from '@/lib/firebase'

import { pushAppNotification } from './notificationService.remote'
import { updateRequirementStatusFromAssignment } from './requirementService.remote'
import { getUserProfile } from './userService.remote'

const db = () => requireDb()

function mapAssignment(id: string, data: DocumentData): Assignment {
  return {
    id,
    requirementId: data.requirementId as string,
    publisherId: data.publisherId as string,
    contributorId: data.contributorId as string,
    status: data.status as AssignmentStatus,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function createAssignmentRequest(
  requirementId: string,
  publisherId: string,
  contributorId: string,
) {
  await addDoc(collection(db(), COLLECTIONS.assignments), {
    requirementId,
    publisherId,
    contributorId,
    status: 'requested',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const reqSnap = await getDoc(doc(db(), COLLECTIONS.requirements, requirementId))
  const title = reqSnap.exists() ? (reqSnap.data().title as string) : 'Post'
  const prof = await getUserProfile(contributorId)
  const name = prof?.displayName ?? contributorId.slice(0, 8)
  await pushAppNotification(
    publisherId,
    contributorId,
    'assignment',
    'New assignment request',
    `${name} applied for "${title}"`,
    requirementId,
  )
}

export function subscribeAssignmentsForRequirement(
  requirementId: string,
  onNext: (items: Assignment[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db(), COLLECTIONS.assignments), where('requirementId', '==', requirementId))
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => mapAssignment(d.id, d.data()))
      list.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      onNext(list)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

export function subscribeMyAssignments(
  uid: string,
  onNext: (items: Assignment[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const map = new Map<string, Assignment>()
  const emit = () => {
    const list = [...map.values()].sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
    onNext(list)
  }

  const qPub = query(collection(db(), COLLECTIONS.assignments), where('publisherId', '==', uid))
  const qCon = query(collection(db(), COLLECTIONS.assignments), where('contributorId', '==', uid))

  const unsubPub = onSnapshot(
    qPub,
    (snap) => {
      for (const d of snap.docs) {
        map.set(d.id, mapAssignment(d.id, d.data()))
      }
      emit()
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )

  const unsubCon = onSnapshot(
    qCon,
    (snap) => {
      for (const d of snap.docs) {
        map.set(d.id, mapAssignment(d.id, d.data()))
      }
      emit()
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )

  return () => {
    unsubPub()
    unsubCon()
  }
}

export async function confirmAssignment(assignmentId: string, requirementId: string) {
  const q = query(collection(db(), COLLECTIONS.assignments), where('requirementId', '==', requirementId))
  const snap = await getDocs(q)
  const batch = writeBatch(db())
  const now = serverTimestamp()

  for (const d of snap.docs) {
    const ref = doc(db(), COLLECTIONS.assignments, d.id)
    if (d.id === assignmentId) {
      batch.update(ref, { status: 'active', updatedAt: now })
    } else if ((d.data().status as string) === 'requested') {
      batch.update(ref, { status: 'declined', updatedAt: now })
    }
  }

  await batch.commit()
  await updateRequirementStatusFromAssignment(requirementId, 'in_progress')
}

export async function declineAssignment(assignmentId: string) {
  const ref = doc(db(), COLLECTIONS.assignments, assignmentId)
  await updateDoc(ref, { status: 'declined', updatedAt: serverTimestamp() })
}

export async function completeAssignment(assignmentId: string, requirementId: string) {
  const ref = doc(db(), COLLECTIONS.assignments, assignmentId)
  await updateDoc(ref, { status: 'completed', updatedAt: serverTimestamp() })
  await updateRequirementStatusFromAssignment(requirementId, 'fulfilled')
}

export async function cancelRequirementToOpen(requirementId: string) {
  await updateRequirementStatusFromAssignment(requirementId, 'open')
}
