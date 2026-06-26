import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'

export function GuestRoute() {
  const { isAuthenticated, needsOnboarding, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={needsOnboarding ? '/onboarding' : '/'} replace />
  }

  return <Outlet />
}
