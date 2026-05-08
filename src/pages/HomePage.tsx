import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Publish and fulfill dataset requirements
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Post what you need—images from specific angles, printer noise recordings, structured labels—and collaborate with
          contributors. Chat in-thread, confirm assignments, and keep legal terms visible.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/requirements"
          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white no-underline hover:bg-violet-500"
        >
          Browse requirements
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 no-underline hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Create an account
        </Link>
      </div>
    </div>
  )
}
