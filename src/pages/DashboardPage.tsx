import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import type { Assignment, Requirement } from '@/domain/types'
import { subscribeMyAssignments } from '@/services/assignmentService'
import { subscribeMyRequirements } from '@/services/requirementService'

export function DashboardPage() {
  const { user } = useAuth()
  const [reqs, setReqs] = useState<Requirement[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeMyRequirements(user.uid, setReqs, (e) => setError(e.message))
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeMyAssignments(user.uid, setAssignments, (e) => setError(e.message))
  }, [user])

  if (!user) return null

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as <strong>{user.email}</strong>
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">My requirement posts</h2>
          <Link
            to="/requirements/new"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white no-underline hover:bg-violet-500"
          >
            New post
          </Link>
        </div>
        <ul className="space-y-2">
          {reqs.map((r) => (
            <li key={r.id}>
              <Link
                to={`/requirements/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 no-underline dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{r.title}</span>
                <span className="text-xs text-zinc-500">
                  {r.status} · {r.modality}
                </span>
              </Link>
            </li>
          ))}
          {!reqs.length && <li className="text-sm text-zinc-500">No posts yet.</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">My assignments</h2>
        <ul className="space-y-2">
          {assignments.map((a) => (
            <li key={a.id}>
              <Link
                to={`/requirements/${a.requirementId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm no-underline dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span>
                  Requirement <code className="text-xs">{a.requirementId.slice(0, 8)}…</code>
                </span>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{a.status}</span>
              </Link>
            </li>
          ))}
          {!assignments.length && <li className="text-sm text-zinc-500">No assignments yet.</li>}
        </ul>
      </section>
    </div>
  )
}
