import type { Timestamp } from 'firebase/firestore'

export const REQUIREMENT_STATUSES = ['draft', 'open', 'in_progress', 'fulfilled', 'cancelled'] as const
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number]

export const MODALITIES = ['images', 'audio', 'tabular', 'video', 'other'] as const
export type Modality = (typeof MODALITIES)[number]

export const ASSIGNMENT_STATUSES = ['requested', 'active', 'completed', 'declined'] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export interface UserProfile {
  displayName: string
  email: string | null
  createdAt: Timestamp
}

export interface Requirement {
  id: string
  title: string
  summary: string
  description: string
  modality: Modality
  format: string
  collectionConstraints: string
  qualityQuantity: string
  legalUrl: string
  /** Download URL after Storage upload (optional) */
  legalStorageUrl: string | null
  budgetText: string
  /** ISO date string YYYY-MM-DD */
  deadline: string
  status: RequirementStatus
  publisherId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ThreadMeta {
  contributorUid: string
  lastMessageAt: Timestamp | null
}

export interface Message {
  id: string
  senderId: string
  text: string
  createdAt: Timestamp
}

export interface Assignment {
  id: string
  requirementId: string
  publisherId: string
  contributorId: string
  status: AssignmentStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Public flat discussion on a requirement (replies reference parent comment). */
export interface RequirementComment {
  id: string
  requirementId: string
  authorId: string
  authorDisplayName: string
  text: string
  parentCommentId: string | null
  replyToAuthorId: string | null
  replyToAuthorDisplayName: string | null
  createdAt: Timestamp
}

export type AppNotificationType = 'comment' | 'reply' | 'dm' | 'assignment'

export interface AppNotification {
  id: string
  recipientId: string
  actorId: string
  type: AppNotificationType
  title: string
  body: string
  requirementId: string | null
  read: boolean
  createdAt: Timestamp
}
