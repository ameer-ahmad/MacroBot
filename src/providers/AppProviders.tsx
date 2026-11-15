import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'

function AccountQueries({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <QueryCache key={user?.id ?? 'guest'}>{children}</QueryCache>
}

function QueryCache({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: 1 },
    },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AccountQueries>{children}</AccountQueries>
    </AuthProvider>
  )
}
