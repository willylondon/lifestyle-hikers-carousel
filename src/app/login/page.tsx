'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        if (response.status === 429) {
          setError(`Too many attempts. Try again in ${response.headers.get('Retry-After') || 'a short while'} seconds.`)
        } else {
          setError('Unable to sign in.')
        }
        return
      }
      router.replace('/')
      router.refresh()
    } catch {
      setError('Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e0c] px-4 text-stone-100">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-[#d6a23d]">Lifestyle Hikers</p>
        <h1 className="text-3xl font-semibold">Carousel Creator</h1>
        <p className="mt-2 text-sm text-stone-400">Sign in to use the production AI tools.</p>
        <div className="mt-7 space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-stone-200">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-[#d6a23d]"
          />
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-[#d6a23d] px-4 py-3 font-semibold text-black disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
