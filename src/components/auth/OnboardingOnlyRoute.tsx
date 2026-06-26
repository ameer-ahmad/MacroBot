import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { OnboardingPage } from '@/pages/OnboardingPage'

export function OnboardingOnlyRoute() {
  const { isAuthenticated, needsOnboarding, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!needsOnboarding) {
    return <Navigate to="/" replace />
  }

  return <OnboardingPage />
}
