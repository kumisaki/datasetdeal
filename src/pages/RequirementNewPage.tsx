import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import type { RequirementWritePayload } from '@/domain/requirementWrite'
import { MODALITIES, type Modality } from '@/domain/types'
import { requirementFormSchema } from '@/domain/validation'
import { createRequirement } from '@/services/requirementService'

const empty: RequirementWritePayload = {
  title: '',
  summary: '',
  description: '',
  modality: 'images',
  format: '',
  collectionConstraints: '',
  qualityQuantity: '',
  legalUrl: '',
  budgetText: '',
  deadline: new Date().toISOString().slice(0, 10),
  status: 'draft',
}

export function RequirementNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RequirementWritePayload>(empty)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) {
    return null
  }

  const uid = user.uid

  function update<K extends keyof RequirementWritePayload>(key: K, value: RequirementWritePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = requirementFormSchema.safeParse({ ...form, status: 'draft' })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form')
      return
    }
    setSubmitting(true)
    try {
      const id = await createRequirement(uid, { ...parsed.data, status: 'draft' })
      navigate(`/requirements/${id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New requirement</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Saved as <strong>draft</strong>. You can publish when ready from the post page.
      </p>
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4"
      >
        <RequirementFormFields form={form} update={update} />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save draft'}
        </button>
        <Link to="/dashboard" className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium no-underline dark:border-zinc-700">
          Cancel
        </Link>
      </div>
      </form>
    </div>
  )
}

export function RequirementFormFields({
  form,
  update,
}: {
  form: RequirementWritePayload
  update: <K extends keyof RequirementWritePayload>(key: K, value: RequirementWritePayload[K]) => void
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Title</span>
        <input
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Summary</span>
        <input
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.summary}
          onChange={(e) => update('summary', e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Description</span>
        <textarea
          rows={6}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Modality</span>
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.modality}
            onChange={(e) => update('modality', e.target.value as Modality)}
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Deadline (YYYY-MM-DD)</span>
          <input
            type="date"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.deadline}
            onChange={(e) => update('deadline', e.target.value)}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Data format</span>
        <input
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.format}
          onChange={(e) => update('format', e.target.value)}
          placeholder="e.g. WAV 48kHz, PNG 2k resolution"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Collection constraints</span>
        <textarea
          rows={3}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.collectionConstraints}
          onChange={(e) => update('collectionConstraints', e.target.value)}
          placeholder="Where, when, device, environment…"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Quality & quantity</span>
        <textarea
          rows={3}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.qualityQuantity}
          onChange={(e) => update('qualityQuantity', e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Legal / license URL</span>
        <input
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.legalUrl}
          onChange={(e) => update('legalUrl', e.target.value)}
          placeholder="https://…"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Budget / compensation (text)</span>
        <input
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.budgetText}
          onChange={(e) => update('budgetText', e.target.value)}
        />
      </label>
    </div>
  )
}
