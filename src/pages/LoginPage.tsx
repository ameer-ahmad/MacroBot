import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import {
  AuthField,
  AuthLayout,
  authButtonClass,
  authLinkClass,
} from '@/components/auth/AuthLayout'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const message = (location.state as { message?: string } | null)?.message

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(email, password)
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to track your nutrition">
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <p className="rounded-xl border border-border bg-accent px-4 py-3 text-sm text-foreground">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-fats/30 bg-fats/10 px-4 py-3 text-sm text-fats">
            {error}
          </p>
        )}

        <AuthField
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthField
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          minLength={6}
        />

        <button type="submit" disabled={submitting} className={authButtonClass}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className={authLinkClass}>
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
