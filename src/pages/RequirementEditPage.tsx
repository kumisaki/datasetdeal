import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { requirementFormSchema } from '@/domain/validation'
import type { RequirementWritePayload } from '@/domain/requirementWrite'
import { getRequirement, updateRequirement } from '@/services/requirementService'

import { RequirementFormFields } from './RequirementNewPage'

export function RequirementEditPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RequirementWritePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await getRequirement(id)
        if (cancelled) return
        if (!r) {
          setError('Not found')
          setLoading(false)
          return
        }
        if (user && r.publisherId !== user.uid) {
          setError('You do not own this post')
          setLoading(false)
          return
        }
        setForm({
          title: r.title,
          summary: r.summary,
          description: r.description,
          modality: r.modality,
          format: r.format,
          collectionConstraints: r.collectionConstraints,
          qualityQuantity: r.qualityQuantity,
          legalUrl: r.legalUrl,
          budgetText: r.budgetText,
          deadline: r.deadline,
          status: r.status,
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, user])

  function update<K extends keyof RequirementWritePayload>(key: K, value: RequirementWritePayload[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!id || !form) return
    setError(null)
    const parsed = requirementFormSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form')
      return
    }
    setSubmitting(true)
    try {
      await updateRequirement(id, parsed.data)
      navigate(`/requirements/${id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>
  if (error && !form) return <p className="text-red-600 dark:text-red-400">{error}</p>
  if (!form) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit requirement</h1>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <RequirementFormFields form={form} update={update} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Status is <strong>{form.status}</strong>. Publish or manage assignments from the post page when ready.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <Link
            to={id ? `/requirements/${id}` : '/requirements'}
            className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium no-underline dark:border-zinc-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
