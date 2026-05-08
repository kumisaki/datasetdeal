import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { MODALITIES, type Modality, type Requirement } from '@/domain/types'
import { subscribeRequirements } from '@/services/requirementService'

export function RequirementsPage() {
  const [modality, setModality] = useState<Modality | ''>('')
  const [items, setItems] = useState<Requirement[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeRequirements(
      { modality, status: 'browse' },
      setItems,
      (e) => setError(e.message),
    )
    return unsub
  }, [modality])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Browse requirements</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Open and in-progress posts from publishers.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Modality</span>
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={modality}
            onChange={(e) => setModality(e.target.value as Modality | '')}
          >
            <option value="">All</option>
            {MODALITIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              to={`/requirements/${r.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 no-underline shadow-sm hover:border-violet-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{r.title}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {r.status} · {r.modality}
                </span>
              </div>
              {r.summary && <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{r.summary}</p>}
              <p className="mt-2 text-xs text-zinc-500">Deadline {r.deadline}</p>
            </Link>
          </li>
        ))}
        {!items.length && !error && <p className="text-zinc-600 dark:text-zinc-400">No requirements match these filters.</p>}
      </ul>
    </div>
  )
}
