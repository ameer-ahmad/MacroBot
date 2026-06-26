import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import {
  AuthField,
  AuthLayout,
  authButtonClass,
  authLinkClass,
} from '@/components/auth/AuthLayout'

export function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const hasSession = await signUp(email, password, name)
      if (hasSession) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/login', {
          replace: true,
          state: { message: 'Check your email to confirm your account, then sign in.' },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Start tracking your macros today">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-fats/30 bg-fats/10 px-4 py-3 text-sm text-fats">
            {error}
          </p>
        )}

        <AuthField
          label="Name"
          id="name"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
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
          autoComplete="new-password"
          minLength={6}
        />

        <button type="submit" disabled={submitting} className={authButtonClass}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
