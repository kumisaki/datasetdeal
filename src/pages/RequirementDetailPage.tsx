import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import type { Assignment, Message, Requirement, RequirementComment } from '@/domain/types'
import { commentSchema, messageSchema } from '@/domain/validation'
import {
  completeAssignment,
  confirmAssignment,
  createAssignmentRequest,
  declineAssignment,
  subscribeAssignmentsForRequirement,
} from '@/services/assignmentService'
import { addComment, subscribeComments } from '@/services/commentService'
import {
  sendMessage,
  subscribeMessages,
  subscribeRequirementThreadPartners,
} from '@/services/messageService'
import { getRequirement, publishRequirement, setRequirementLegalStorageUrl } from '@/services/requirementService'
import { uploadLegalDocument } from '@/services/storageService'

function formatTsMs(ms: number): string {
  return new Date(ms).toLocaleString()
}

function formatCommentLine(c: RequirementComment): string {
  if (c.parentCommentId && c.replyToAuthorDisplayName) {
    return `${c.authorDisplayName} replied to @${c.replyToAuthorDisplayName}: ${c.text}`
  }
  return `${c.authorDisplayName}: ${c.text}`
}

export function RequirementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [requirement, setRequirement] = useState<Requirement | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [threadPartner, setThreadPartner] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [commTab, setCommTab] = useState<'comments' | 'dm'>('comments')
  const [comments, setComments] = useState<RequirementComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState<{
    id: string
    authorDisplayName: string
    authorId: string
  } | null>(null)
  const [threadPartnerIds, setThreadPartnerIds] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const isPublisher = !!(user && requirement && user.uid === requirement.publisherId)

  const contributorUidForChat = useMemo(() => {
    if (!user || !requirement) return null
    if (isPublisher) return threadPartner
    return user.uid
  }, [user, requirement, isPublisher, threadPartner])

  const contributorOptions = useMemo(() => {
    const set = new Set<string>()
    for (const a of assignments) set.add(a.contributorId)
    for (const t of threadPartnerIds) set.add(t)
    return [...set].sort()
  }, [assignments, threadPartnerIds])

  useEffect(() => {
    if (!id || !isPublisher) return
    return subscribeRequirementThreadPartners(
      id,
      setThreadPartnerIds,
      (e) => setActionError(e.message),
    )
  }, [id, isPublisher])

  useEffect(() => {
    setThreadPartner(null)
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await getRequirement(id)
        if (cancelled) return
        if (!r) {
          setLoadError('Not found or you cannot view this post.')
          return
        }
        setRequirement(r)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeAssignmentsForRequirement(id, setAssignments, (e) => setActionError(e.message))
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeComments(id, setComments, (e) => setActionError(e.message))
  }, [id])

  useEffect(() => {
    if (!isPublisher || !user) return
    const active = assignments.find((a) => a.status === 'active')
    const requested = assignments.find((a) => a.status === 'requested')
    const pick = active?.contributorId ?? requested?.contributorId ?? null
    setThreadPartner((prev) => {
      if (prev && contributorOptions.includes(prev)) return prev
      if (pick && contributorOptions.includes(pick)) return pick
      if (contributorOptions.length === 1) return contributorOptions[0]!
      return null
    })
  }, [assignments, isPublisher, user, contributorOptions])

  useEffect(() => {
    if (!id || !contributorUidForChat) {
      setMessages([])
      return
    }
    return subscribeMessages(id, contributorUidForChat, setMessages, (e) => setActionError(e.message))
  }, [id, contributorUidForChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const myAssignment = user
    ? assignments.find((a) => a.contributorId === user.uid && ['requested', 'active'].includes(a.status))
    : undefined

  const canRequest =
    user &&
    requirement &&
    !isPublisher &&
    requirement.status === 'open' &&
    !assignments.some((a) => a.contributorId === user.uid && ['requested', 'active'].includes(a.status))

  async function onPublish() {
    if (!requirement || !id) return
    setActionError(null)
    setPublishing(true)
    try {
      await publishRequirement(id)
      setRequirement({ ...requirement, status: 'open' })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  async function onRequest() {
    if (!requirement || !user || !id) return
    setActionError(null)
    setRequesting(true)
    try {
      await createAssignmentRequest(id, requirement.publisherId, user.uid)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not request')
    } finally {
      setRequesting(false)
    }
  }

  async function onPostComment(e: FormEvent) {
    e.preventDefault()
    if (!user || !id) return
    const parsed = commentSchema.safeParse({ text: commentText })
    if (!parsed.success) {
      setActionError(parsed.error.issues[0]?.message ?? 'Invalid comment')
      return
    }
    setActionError(null)
    const label = user.displayName?.trim() || user.email?.split('@')[0] || user.uid.slice(0, 8)
    try {
      await addComment(
        id,
        user.uid,
        label,
        parsed.data.text,
        replyTarget?.id ?? null,
        replyTarget?.authorId ?? null,
        replyTarget?.authorDisplayName ?? null,
      )
      setCommentText('')
      setReplyTarget(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Comment failed')
    }
  }

  async function onSendMessage(e: FormEvent) {
    e.preventDefault()
    if (!user || !id || !contributorUidForChat) return
    const parsed = messageSchema.safeParse({ text: messageText })
    if (!parsed.success) {
      setActionError(parsed.error.issues[0]?.message ?? 'Invalid message')
      return
    }
    setActionError(null)
    try {
      await sendMessage(id, contributorUidForChat, user.uid, parsed.data.text)
      setMessageText('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Send failed')
    }
  }

  async function onLegalUpload(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file || !id || !requirement) return
    setActionError(null)
    try {
      const url = await uploadLegalDocument(id, file)
      await setRequirementLegalStorageUrl(id, url)
      setRequirement({ ...requirement, legalStorageUrl: url })
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  async function onConfirmAssignment(assignmentId: string) {
    if (!id) return
    setActionError(null)
    try {
      await confirmAssignment(assignmentId, id)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Confirm failed')
    }
  }

  async function onDeclineAssignment(assignmentId: string) {
    setActionError(null)
    try {
      await declineAssignment(assignmentId)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Decline failed')
    }
  }

  async function onCompleteOrder(assignmentId: string) {
    if (!id) return
    setActionError(null)
    try {
      await completeAssignment(assignmentId, id)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Complete failed')
    }
  }

  if (loadError) {
    return <p className="text-red-600 dark:text-red-400">{loadError}</p>
  }

  if (!requirement) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            {requirement.modality} · {requirement.status}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{requirement.title}</h1>
          {requirement.summary && <p className="mt-2 text-zinc-600 dark:text-zinc-400">{requirement.summary}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {isPublisher && requirement.status === 'draft' && (
            <button
              type="button"
              onClick={() => void onPublish()}
              disabled={publishing}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          )}
          {isPublisher && (
            <Link
              to={`/requirements/${requirement.id}/edit`}
              className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium no-underline dark:border-zinc-700"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </div>
      )}

      <section className="grid gap-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Details</h2>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">{requirement.description}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Format</dt>
            <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{requirement.format}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Collection constraints</dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
              {requirement.collectionConstraints || '—'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Quality & quantity</dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
              {requirement.qualityQuantity || '—'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Budget / terms</dt>
            <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{requirement.budgetText || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Deadline</dt>
            <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{requirement.deadline}</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Legal URL</dt>
            <dd className="mt-1">
              {requirement.legalUrl ? (
                <a href={requirement.legalUrl} rel="noreferrer" target="_blank">
                  {requirement.legalUrl}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Legal document (file)</dt>
            <dd className="mt-1 space-y-2">
              {requirement.legalStorageUrl ? (
                <a href={requirement.legalStorageUrl} rel="noreferrer" target="_blank">
                  Download uploaded file
                </a>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-400">None</span>
              )}
              {isPublisher && (
                <div>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
                    className="text-sm"
                    onChange={(e) => void onLegalUpload(e.target.files)}
                  />
                  <p className="mt-1 text-xs text-zinc-500">Publisher only, max 10MB (see storage rules).</p>
                </div>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Assignments</h2>
        {user && canRequest && (
          <button
            type="button"
            onClick={() => void onRequest()}
            disabled={requesting}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {requesting ? 'Requesting…' : 'Request to take this order'}
          </button>
        )}
        {user && myAssignment && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Your assignment status: <strong>{myAssignment.status}</strong>
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              <span className="text-sm text-zinc-800 dark:text-zinc-200">
                Contributor <code className="text-xs">{a.contributorId.slice(0, 8)}…</code> ·{' '}
                <strong>{a.status}</strong>
              </span>
              {isPublisher && a.status === 'requested' && (
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                    onClick={() => void onConfirmAssignment(a.id)}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                    onClick={() => void onDeclineAssignment(a.id)}
                  >
                    Decline
                  </button>
                </span>
              )}
              {isPublisher && a.status === 'active' && (
                <button
                  type="button"
                  className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  onClick={() => void onCompleteOrder(a.id)}
                >
                  Mark fulfilled
                </button>
              )}
            </li>
          ))}
          {!assignments.length && <li className="text-sm text-zinc-500">No assignment activity yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              commTab === 'comments'
                ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
            onClick={() => setCommTab('comments')}
          >
            Discussion
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              commTab === 'dm'
                ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
            onClick={() => setCommTab('dm')}
          >
            Direct messages
          </button>
        </div>

        {commTab === 'comments' && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Public thread in flat order. Replies look like {`"Name replied to @Someone: …"`}. The person you reply to
              and the publisher get in-app alerts (optional desktop notifications).
            </p>
            {!user && <p className="text-sm text-zinc-600 dark:text-zinc-400">Log in to comment or reply.</p>}
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
              {comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <p className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">{formatCommentLine(c)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500">{formatTsMs(c.createdAt.toMillis())}</span>
                    {user && (
                      <button
                        type="button"
                        className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
                        onClick={() =>
                          setReplyTarget({
                            id: c.id,
                            authorDisplayName: c.authorDisplayName,
                            authorId: c.authorId,
                          })
                        }
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!comments.length && <p className="text-sm text-zinc-500">No comments yet.</p>}
            </div>
            {user && (
              <form onSubmit={(e) => void onPostComment(e)} className="space-y-2">
                {replyTarget && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span>
                      Replying to{' '}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">@{replyTarget.authorDisplayName}</span>
                    </span>
                    <button type="button" className="text-xs text-violet-600 hover:underline dark:text-violet-400" onClick={() => setReplyTarget(null)}>
                      Cancel
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <textarea
                    className="min-h-[72px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="Write a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="h-fit rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                  >
                    Post
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {commTab === 'dm' && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              One-to-one chat with the publisher or a contributor. Updates in real time; new messages also appear
              under Notifications in the header.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Message thread</h3>
              {isPublisher && contributorOptions.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">With</span>
                  <select
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    value={threadPartner ?? ''}
                    onChange={(e) => setThreadPartner(e.target.value || null)}
                  >
                    <option value="">Select contributor…</option>
                    {contributorOptions.map((c) => (
                      <option key={c} value={c}>
                        {c.slice(0, 10)}…
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {!user && <p className="text-sm text-zinc-600 dark:text-zinc-400">Log in to send direct messages.</p>}

            {user && !isPublisher && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">You are messaging the publisher as yourself.</p>
            )}

            {user && isPublisher && contributorOptions.length > 0 && !threadPartner && (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Pick a contributor above to load that thread (including messages sent before an assignment).
              </p>
            )}

            {user && isPublisher && !contributorOptions.length && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                When someone requests this order or messages you, they will appear in the dropdown above.
              </p>
            )}

            <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
              {messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{m.senderId === user?.uid ? 'You' : 'Partner'}</span>
                  <span className="ml-2 text-xs text-zinc-500">{formatTsMs(m.createdAt.toMillis())}</span>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">{m.text}</p>
                </div>
              ))}
              {!messages.length && contributorUidForChat && <p className="text-sm text-zinc-500">No messages yet. Say hello.</p>}
              <div ref={messagesEndRef} />
            </div>

            {user && contributorUidForChat && (
              <form onSubmit={(e) => void onSendMessage(e)} className="flex flex-col gap-2 sm:flex-row">
                <textarea
                  className="min-h-[80px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="Write a direct message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button
                  type="submit"
                  className="h-fit rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
