import { useMemo, useSyncExternalStore } from 'react'
import {
  getPendingEntries,
  pendingToDisplayEntry,
  subscribePending,
  type DisplayLogEntry,
  type PendingEntry,
} from '@/lib/offlineQueue'

function subscribe(listener: () => void) {
  return subscribePending(listener)
}

/** All queued (not-yet-synced) entries, reactive to queue changes. */
export function usePendingEntries(): PendingEntry[] {
  return useSyncExternalStore(subscribe, getPendingEntries, getPendingEntries)
}

export function usePendingCount(): number {
  return usePendingEntries().length
}

/** Queued entries for a specific date, shaped for optimistic display in the log. */
export function usePendingDisplayEntries(date: string): DisplayLogEntry[] {
  const all = usePendingEntries()
  return useMemo(
    () =>
      all
        .filter((e) => (e.payload.logged_date ?? '') === date)
        .map(pendingToDisplayEntry),
    [all, date],
  )
}
