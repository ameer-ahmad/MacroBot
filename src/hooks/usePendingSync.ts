import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  getPendingBatches,
  subscribePending,
  type DisplayLogEntry,
  type PendingBatch,
} from '@/lib/offlineQueue'
import { useAuth } from '@/providers/AuthProvider'

export function usePendingBatches(): PendingBatch[] {
  const userId = useAuth().user?.id
  const getSnapshot = useCallback(() => getPendingBatches(userId), [userId])
  return useSyncExternalStore(subscribePending, getSnapshot)
}

export function usePendingDisplayEntries(date: string): DisplayLogEntry[] {
  const batches = usePendingBatches()
  return useMemo(
    () =>
      batches.flatMap(({ entries, failed }) =>
        entries
          .filter((entry) => entry.logged_date === date)
          .map((entry): DisplayLogEntry => ({ ...entry, __pending: failed ? 'failed' : 'queued' })),
      ),
    [batches, date],
  )
}
