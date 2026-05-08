/** Portable collection and document path contract for web or future native clients. */

export const COLLECTIONS = {
  users: 'users',
  requirements: 'requirements',
  assignments: 'assignments',
  threads: 'threads',
  messages: 'messages',
  comments: 'comments',
  notifications: 'notifications',
} as const

export function userDocPath(uid: string): string {
  return `${COLLECTIONS.users}/${uid}`
}

export function requirementDocPath(requirementId: string): string {
  return `${COLLECTIONS.requirements}/${requirementId}`
}

export function threadDocPath(requirementId: string, contributorUid: string): string {
  return `${COLLECTIONS.requirements}/${requirementId}/${COLLECTIONS.threads}/${contributorUid}`
}

export function threadMessagesPath(requirementId: string, contributorUid: string): string {
  return `${threadDocPath(requirementId, contributorUid)}/${COLLECTIONS.messages}`
}

export function assignmentDocPath(assignmentId: string): string {
  return `${COLLECTIONS.assignments}/${assignmentId}`
}

export function legalStoragePath(requirementId: string, fileName: string): string {
  return `legal/${requirementId}/${fileName}`
}
