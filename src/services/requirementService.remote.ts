import type { DocumentData } from 'firebase/firestore'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'

import { COLLECTIONS } from '@/domain/paths'
import type { RequirementWritePayload } from '@/domain/requirementWrite'
import type { Modality, Requirement, RequirementStatus } from '@/domain/types'
import { requireDb } from '@/lib/firebase'

const db = () => requireDb()

function mapRequirement(id: string, data: DocumentData): Requirement {
  return {
    id,
    title: data.title as string,
    summary: (data.summary as string) ?? '',
    description: data.description as string,
    modality: data.modality as Requirement['modality'],
    format: data.format as string,
    collectionConstraints: (data.collectionConstraints as string) ?? '',
    qualityQuantity: (data.qualityQuantity as string) ?? '',
    legalUrl: (data.legalUrl as string) ?? '',
    legalStorageUrl: (data.legalStorageUrl as string | null) ?? null,
    budgetText: (data.budgetText as string) ?? '',
    deadline: data.deadline as string,
    status: data.status as RequirementStatus,
    publisherId: data.publisherId as string,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export async function getRequirement(requirementId: string): Promise<Requirement | null> {
  const snap = await getDoc(doc(db(), COLLECTIONS.requirements, requirementId))
  if (!snap.exists()) return null
  return mapRequirement(snap.id, snap.data())
}

export interface RequirementListFilters {
  modality?: Modality | ''
  status?: RequirementStatus | 'browse'
}

export function subscribeRequirements(
  filters: RequirementListFilters,
  onNext: (items: Requirement[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const constraints = []
  if (filters.modality) {
    constraints.push(where('modality', '==', filters.modality))
  }
  if (filters.status && filters.status !== 'browse') {
    constraints.push(where('status', '==', filters.status))
  } else {
    constraints.push(where('status', 'in', ['open', 'in_progress']))
  }
  constraints.push(orderBy('createdAt', 'desc'))
  constraints.push(limit(80))

  const q = query(collection(db(), COLLECTIONS.requirements), ...constraints)
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => mapRequirement(d.id, d.data()))
      onNext(list)
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

export function subscribeMyRequirements(
  publisherId: string,
  onNext: (items: Requirement[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db(), COLLECTIONS.requirements),
    where('publisherId', '==', publisherId),
    orderBy('updatedAt', 'desc'),
    limit(100),
  )
  return onSnapshot(
    q,
    (snap) => {
      onNext(snap.docs.map((d) => mapRequirement(d.id, d.data())))
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err))),
  )
}

export async function createRequirement(publisherId: string, payload: RequirementWritePayload) {
  const ref = await addDoc(collection(db(), COLLECTIONS.requirements), {
    ...payload,
    publisherId,
    legalStorageUrl: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateRequirement(requirementId: string, payload: RequirementWritePayload) {
  const ref = doc(db(), COLLECTIONS.requirements, requirementId)
  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}

export async function publishRequirement(requirementId: string) {
  const ref = doc(db(), COLLECTIONS.requirements, requirementId)
  await updateDoc(ref, {
    status: 'open',
    updatedAt: serverTimestamp(),
  })
}

export async function setRequirementLegalStorageUrl(requirementId: string, url: string) {
  const ref = doc(db(), COLLECTIONS.requirements, requirementId)
  await updateDoc(ref, {
    legalStorageUrl: url,
    updatedAt: serverTimestamp(),
  })
}

export async function updateRequirementStatusFromAssignment(
  requirementId: string,
  status: RequirementStatus,
) {
  const ref = doc(db(), COLLECTIONS.requirements, requirementId)
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function fetchAssignmentsForRequirement(requirementId: string) {
  const q = query(collection(db(), COLLECTIONS.assignments), where('requirementId', '==', requirementId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
