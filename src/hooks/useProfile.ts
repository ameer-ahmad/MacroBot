import { useQuery } from '@tanstack/react-query'
import { fetchProfile, queryKeys } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'

export function useProfile() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
    enabled: isAuthenticated,
    networkMode: 'always',
  })
}
