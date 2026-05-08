/**
 * Offline-first persistence for local development (localStorage).
 * Not for production secrets — passwords are stored in plain text for demo only.
 */
import type { Timestamp } from 'firebase/firestore'

import type { RequirementWritePayload } from '@/domain/requirementWrite'
import type { SessionUser } from '@/domain/session'
import { pingBrowserNotification } from '@/lib/browserNotify'
import type {
  AppNotification,
  AppNotificationType,
  Assignment,
  Message,
  Modality,
  Requirement,
  RequirementComment,
  RequirementStatus,
  UserProfile,
} from '@/domain/types'

function ts(ms: number): Timestamp {
  return {
    toMillis: () => ms,
    toDate: () => new Date(ms),
  } as Timestamp
}

const KEY = 'datasetdeal-local-v1'

type UserRow = { email: string; password: string; displayName: string; createdAtMs: number }

type ReqRow = {
  publisherId: string
  payload: RequirementWritePayload
  legalStorageUrl: string | null
  createdAtMs: number
  updatedAtMs: number
}

type AsgRow = {
  requirementId: string
  publisherId: string
  contributorId: string
  status: 'requested' | 'active' | 'completed' | 'declined'
  createdAtMs: number
  updatedAtMs: number
}

type MsgRow = {
  id: string
  requirementId: string
  threadContributorId: string
  senderId: string
  text: string
  createdAtMs: number
}

type CommentRow = {
  id: string
  requirementId: string
  authorId: string
  authorDisplayName: string
  text: string
  parentCommentId: string | null
  replyToAuthorId: string | null
  replyToAuthorDisplayName: string | null
  createdAtMs: number
}

type NotifRow = {
  id: string
  recipientId: string
  actorId: string
  type: AppNotificationType
  title: string
  body: string
  requirementId: string | null
  read: boolean
  createdAtMs: number
}

type State = {
  usersById: Record<string, UserRow>
  profiles: Record<string, { displayName: string; email: string | null; createdAtMs: number }>
  requirements: Record<string, ReqRow>
  assignments: Record<string, AsgRow>
  messages: MsgRow[]
  comments: CommentRow[]
  notifications: NotifRow[]
  sessionUid: string | null
}

function emptyState(): State {
  return {
    usersById: {},
    profiles: {},
    requirements: {},
    assignments: {},
    messages: [],
    comments: [],
    notifications: [],
    sessionUid: null,
  }
}

let state: State = emptyState()
let hydrated = false

const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) {
    try {
      fn()
    } catch {
      /* One subscriber must not block others (e.g. auth after login). */
    }
  }
}

function load() {
  if (typeof window === 'undefined') return
  if (hydrated) return
  hydrated = true
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>
      state = {
        ...emptyState(),
        ...parsed,
        usersById: { ...emptyState().usersById, ...parsed.usersById },
        profiles: { ...emptyState().profiles, ...parsed.profiles },
        requirements: { ...emptyState().requirements, ...parsed.requirements },
        assignments: { ...emptyState().assignments, ...parsed.assignments },
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        sessionUid: parsed.sessionUid ?? null,
      }
    }
  } catch {
    state = emptyState()
  }
}

function save() {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(state))
  notify()
}

function newId() {
  return crypto.randomUUID()
}

export function displayNameFor(uid: string): string {
  load()
  return state.usersById[uid]?.displayName ?? state.profiles[uid]?.displayName ?? uid.slice(0, 8)
}

function pushNotifLocal(
  recipientId: string,
  actorId: string,
  type: AppNotificationType,
  title: string,
  body: string,
  requirementId: string | null,
) {
  if (recipientId === actorId) return
  state.notifications.push({
    id: newId(),
    recipientId,
    actorId,
    type,
    title,
    body,
    requirementId,
    read: false,
    createdAtMs: Date.now(),
  })
  if (recipientId === state.sessionUid) {
    pingBrowserNotification(title, body)
  }
  save()
}

export function subscribeLocal(cb: () => void) {
  load()
  listeners.add(cb)
  cb()
  return () => listeners.delete(cb)
}

export function getSessionUser(): SessionUser | null {
  load()
  if (!state.sessionUid) return null
  const u = state.usersById[state.sessionUid]
  if (!u) return null
  return { uid: state.sessionUid, email: u.email, displayName: u.displayName }
}

export function subscribeAuth(cb: () => void) {
  return subscribeLocal(cb)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function localRegister(email: string, password: string, displayName: string): SessionUser {
  load()
  const norm = normalizeEmail(email)
  if (Object.values(state.usersById).some((x) => normalizeEmail(x.email) === norm)) {
    throw new Error('Email already registered')
  }
  const id = newId()
  const now = Date.now()
  state.usersById[id] = { email: norm, password, displayName, createdAtMs: now }
  state.profiles[id] = { displayName, email: norm, createdAtMs: now }
  state.sessionUid = id
  save()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('datasetdeal-auth-changed'))
  }
  return getSessionUser()!
}

export function localLogin(email: string, password: string): SessionUser {
  load()
  const norm = normalizeEmail(email)
  const match = Object.entries(state.usersById).find(
    ([, u]) => normalizeEmail(u.email) === norm && u.password === password,
  )
  if (!match) throw new Error('Invalid email or password')
  state.sessionUid = match[0]
  save()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('datasetdeal-auth-changed'))
  }
  return getSessionUser()!
}

export function localLogout() {
  load()
  state.sessionUid = null
  save()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('datasetdeal-auth-changed'))
  }
}

function toRequirement(id: string, row: ReqRow): Requirement {
  return {
    id,
    ...row.payload,
    legalStorageUrl: row.legalStorageUrl,
    publisherId: row.publisherId,
    createdAt: ts(row.createdAtMs),
    updatedAt: ts(row.updatedAtMs),
  }
}

export function getRequirement(id: string): Requirement | null {
  load()
  const row = state.requirements[id]
  if (!row) return null
  return toRequirement(id, row)
}

export function subscribeRequirements(
  filters: { modality?: Modality | ''; status?: RequirementStatus | 'browse' },
  cb: (items: Requirement[]) => void,
) {
  return subscribeLocal(() => {
    let list = Object.entries(state.requirements).map(([rid, row]) => toRequirement(rid, row))
    if (filters.modality) list = list.filter((r) => r.modality === filters.modality)
    if (filters.status && filters.status !== 'browse') {
      list = list.filter((r) => r.status === filters.status)
    } else {
      list = list.filter((r) => r.status === 'open' || r.status === 'in_progress')
    }
    list.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    cb(list.slice(0, 80))
  })
}

export function subscribeMyRequirements(publisherId: string, cb: (items: Requirement[]) => void) {
  return subscribeLocal(() => {
    const list = Object.entries(state.requirements)
      .filter(([, r]) => r.publisherId === publisherId)
      .map(([id, row]) => toRequirement(id, row))
      .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
    cb(list.slice(0, 100))
  })
}

export function createRequirement(publisherId: string, payload: RequirementWritePayload): string {
  load()
  const id = newId()
  const now = Date.now()
  state.requirements[id] = {
    publisherId,
    payload,
    legalStorageUrl: null,
    createdAtMs: now,
    updatedAtMs: now,
  }
  save()
  return id
}

export function updateRequirement(id: string, payload: RequirementWritePayload) {
  load()
  const row = state.requirements[id]
  if (!row) throw new Error('Not found')
  row.payload = payload
  row.updatedAtMs = Date.now()
  save()
}

export function publishRequirement(id: string) {
  load()
  const row = state.requirements[id]
  if (!row) throw new Error('Not found')
  row.payload.status = 'open'
  row.updatedAtMs = Date.now()
  save()
}

export function setLegalStorageUrl(id: string, url: string) {
  load()
  const row = state.requirements[id]
  if (!row) throw new Error('Not found')
  row.legalStorageUrl = url
  row.updatedAtMs = Date.now()
  save()
}

export function setRequirementStatus(id: string, status: RequirementStatus) {
  load()
  const row = state.requirements[id]
  if (!row) throw new Error('Not found')
  row.payload.status = status
  row.updatedAtMs = Date.now()
  save()
}

function toAssignment(id: string, row: AsgRow): Assignment {
  return {
    id,
    requirementId: row.requirementId,
    publisherId: row.publisherId,
    contributorId: row.contributorId,
    status: row.status,
    createdAt: ts(row.createdAtMs),
    updatedAt: ts(row.updatedAtMs),
  }
}

export function createAssignmentRequest(requirementId: string, publisherId: string, contributorId: string) {
  load()
  const id = newId()
  const now = Date.now()
  state.assignments[id] = {
    requirementId,
    publisherId,
    contributorId,
    status: 'requested',
    createdAtMs: now,
    updatedAtMs: now,
  }
  save()
  const title = state.requirements[requirementId]?.payload.title ?? 'Post'
  pushNotifLocal(
    publisherId,
    contributorId,
    'assignment',
    'New assignment request',
    `${displayNameFor(contributorId)} applied for "${title}"`,
    requirementId,
  )
}

export function subscribeAssignmentsForRequirement(requirementId: string, cb: (items: Assignment[]) => void) {
  return subscribeLocal(() => {
    const list = Object.entries(state.assignments)
      .filter(([, a]) => a.requirementId === requirementId)
      .map(([id, row]) => toAssignment(id, row))
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    cb(list)
  })
}

export function subscribeMyAssignments(uid: string, cb: (items: Assignment[]) => void) {
  return subscribeLocal(() => {
    const list = Object.entries(state.assignments)
      .filter(([, a]) => a.publisherId === uid || a.contributorId === uid)
      .map(([id, row]) => toAssignment(id, row))
      .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
    cb(list)
  })
}

export function confirmAssignment(assignmentId: string, requirementId: string) {
  load()
  for (const [id, a] of Object.entries(state.assignments)) {
    if (a.requirementId !== requirementId) continue
    if (id === assignmentId) {
      a.status = 'active'
    } else if (a.status === 'requested') {
      a.status = 'declined'
    }
    a.updatedAtMs = Date.now()
  }
  setRequirementStatus(requirementId, 'in_progress')
}

export function declineAssignment(assignmentId: string) {
  load()
  const a = state.assignments[assignmentId]
  if (a) {
    a.status = 'declined'
    a.updatedAtMs = Date.now()
    save()
  }
}

export function completeAssignment(assignmentId: string, requirementId: string) {
  load()
  const a = state.assignments[assignmentId]
  if (a) {
    a.status = 'completed'
    a.updatedAtMs = Date.now()
  }
  setRequirementStatus(requirementId, 'fulfilled')
}

export function sendMessage(requirementId: string, threadContributorId: string, senderId: string, text: string) {
  load()
  state.messages.push({
    id: newId(),
    requirementId,
    threadContributorId,
    senderId,
    text,
    createdAtMs: Date.now(),
  })
  save()
  const pub = state.requirements[requirementId]?.publisherId
  if (!pub) return
  const recipientId = senderId === pub ? threadContributorId : pub
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text
  pushNotifLocal(recipientId, senderId, 'dm', 'New direct message', `${displayNameFor(senderId)}: ${preview}`, requirementId)
}

export function subscribeMessages(
  requirementId: string,
  threadContributorId: string,
  cb: (items: Message[]) => void,
) {
  return subscribeLocal(() => {
    const items = state.messages
      .filter((m) => m.requirementId === requirementId && m.threadContributorId === threadContributorId)
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map((m) => ({
        id: m.id,
        senderId: m.senderId,
        text: m.text,
        createdAt: ts(m.createdAtMs),
      }))
    cb(items)
  })
}

/** Contributor UIDs that have at least one message on this requirement (thread keys). */
export function subscribeRequirementThreadPartners(requirementId: string, cb: (ids: string[]) => void) {
  return subscribeLocal(() => {
    const ids = new Set<string>()
    for (const m of state.messages) {
      if (m.requirementId === requirementId) ids.add(m.threadContributorId)
    }
    cb([...ids].sort())
  })
}

export async function uploadLegalDocumentLocal(requirementId: string, file: File): Promise<string> {
  void requirementId
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      if (url.length > 6 * 1024 * 1024) {
        reject(new Error('File too large for local demo (max ~6MB).'))
        return
      }
      resolve(url)
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

export function createUserProfile(uid: string, displayName: string, email: string | null) {
  load()
  state.profiles[uid] = { displayName, email, createdAtMs: Date.now() }
  save()
}

export function getUserProfile(uid: string): UserProfile | null {
  load()
  const p = state.profiles[uid]
  if (!p) return null
  return {
    displayName: p.displayName,
    email: p.email,
    createdAt: ts(p.createdAtMs),
  }
}

export function cancelRequirementToOpen(requirementId: string) {
  setRequirementStatus(requirementId, 'open')
}

export async function fetchAssignmentsForRequirement(requirementId: string) {
  load()
  return Object.entries(state.assignments)
    .filter(([, a]) => a.requirementId === requirementId)
    .map(([id, row]) => ({ id, ...row }))
}

function toComment(row: CommentRow): RequirementComment {
  return {
    id: row.id,
    requirementId: row.requirementId,
    authorId: row.authorId,
    authorDisplayName: row.authorDisplayName,
    text: row.text,
    parentCommentId: row.parentCommentId,
    replyToAuthorId: row.replyToAuthorId,
    replyToAuthorDisplayName: row.replyToAuthorDisplayName,
    createdAt: ts(row.createdAtMs),
  }
}

export function subscribeComments(
  requirementId: string,
  cb: (items: RequirementComment[]) => void,
  _onError?: (e: Error) => void,
) {
  void _onError
  return subscribeLocal(() => {
    const list = state.comments
      .filter((c) => c.requirementId === requirementId)
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map(toComment)
    cb(list)
  })
}

export function addComment(
  requirementId: string,
  authorId: string,
  authorDisplayNameInput: string,
  text: string,
  parentCommentId: string | null,
  replyToAuthorId: string | null,
  replyToAuthorDisplayName: string | null,
) {
  load()
  const authorDisplayName = authorDisplayNameInput.trim() || displayNameFor(authorId)
  const row: CommentRow = {
    id: newId(),
    requirementId,
    authorId,
    authorDisplayName,
    text,
    parentCommentId,
    replyToAuthorId,
    replyToAuthorDisplayName,
    createdAtMs: Date.now(),
  }
  state.comments.push(row)
  save()

  const req = state.requirements[requirementId]
  if (!req) return
  const pub = req.publisherId
  const titleShort = req.payload.title

  if (parentCommentId) {
    const parent = state.comments.find((c) => c.id === parentCommentId)
    if (parent && parent.authorId !== authorId) {
      pushNotifLocal(
        parent.authorId,
        authorId,
        'reply',
        'Someone replied to you',
        `${authorDisplayName} on "${titleShort}" replied to @${parent.authorDisplayName}`,
        requirementId,
      )
    }
    const pubAlreadyNotifiedAsParent = parent?.authorId === pub
    if (pub !== authorId && !pubAlreadyNotifiedAsParent) {
      pushNotifLocal(
        pub,
        authorId,
        'comment',
        'New reply on your post',
        `${authorDisplayName} added a reply on "${titleShort}"`,
        requirementId,
      )
    }
  } else if (pub !== authorId) {
    pushNotifLocal(
      pub,
      authorId,
      'comment',
      'New comment',
      `${authorDisplayName} commented on "${titleShort}"`,
      requirementId,
    )
  }
}

function toNotif(row: NotifRow): AppNotification {
  return {
    id: row.id,
    recipientId: row.recipientId,
    actorId: row.actorId,
    type: row.type,
    title: row.title,
    body: row.body,
    requirementId: row.requirementId,
    read: row.read,
    createdAt: ts(row.createdAtMs),
  }
}

export function subscribeUserNotifications(
  userId: string,
  cb: (items: AppNotification[]) => void,
  _onError?: (e: Error) => void,
) {
  void _onError
  return subscribeLocal(() => {
    const list = state.notifications
      .filter((n) => n.recipientId === userId)
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map(toNotif)
    cb(list)
  })
}

export function markNotificationRead(userId: string, notificationId: string) {
  load()
  const n = state.notifications.find((x) => x.recipientId === userId && x.id === notificationId)
  if (n) {
    n.read = true
    save()
  }
}

export function markAllNotificationsRead(userId: string) {
  load()
  let changed = false
  for (const n of state.notifications) {
    if (n.recipientId === userId && !n.read) {
      n.read = true
      changed = true
    }
  }
  if (changed) save()
}
