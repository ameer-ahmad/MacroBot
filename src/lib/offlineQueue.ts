import { deleteMealEntries, saveLogEntries } from '@/lib/api'
import type { LogEntry, MealType } from '@/types/database'

const STORAGE_PREFIX = 'macrobot.pendingLogEntries.v2:'

export type PendingPayload = Pick<LogEntry, 'logged_date' | 'meal' | 'name'> &
  Partial<Pick<LogEntry, 'food_id' | 'quantity' | 'serving_unit' | 'calories' |
    'protein_g' | 'carbs_g' | 'fats_g' | 'fiber_g' | 'notes'>>

export interface PendingBatch {
  key: string
  userId: string
  entries: LogEntry[]
  failed: boolean
}

export type DisplayLogEntry = LogEntry & { __pending?: 'queued' | 'failed' }

const listeners = new Set<() => void>()
const failures = new Set<string>()
const syncing = new Set<string>()
const localLocks = new Map<string, Promise<void>>()
const snapshots = new Map<string, PendingBatch[]>()
const empty: PendingBatch[] = []

function notify() {
  snapshots.clear()
  listeners.forEach((listener) => listener())
}

function handleStorage(event: StorageEvent) {
  if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) {
    if (event.key === null) failures.clear()
    else if (event.newValue === null) failures.delete(event.key)
    notify()
  }
}

export function subscribePending(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', handleStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorage)
      snapshots.clear()
    }
  }
}

function readPendingEntries(key: string, userId: string): LogEntry[] {
  const raw = localStorage.getItem(key)
  if (raw === null) return []

  try {
    const entries = JSON.parse(raw) as LogEntry[]
    if (Array.isArray(entries) && entries.every((entry) =>
      entry?.user_id === userId && typeof entry.created_at === 'string',
    )) return entries
  } catch {
    // A corrupt record should not prevent reading other batches.
  }
  return []
}

function readPendingBatches(userId: string): PendingBatch[] {
  const prefix = `${STORAGE_PREFIX}${userId}:`
  const batches: PendingBatch[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(prefix)) continue
      const entries = readPendingEntries(key, userId)
      if (entries.length > 0) batches.push({ key, userId, entries, failed: failures.has(key) })
    }
  } catch {
    // Storage may be unavailable. A save will report the error at the point of entry.
  }
  return batches.sort((a, b) => a.entries[0].created_at.localeCompare(b.entries[0].created_at))
}

export function getPendingBatches(userId: string | undefined): PendingBatch[] {
  if (!userId) return empty
  const cached = snapshots.get(userId)
  if (cached) return cached
  const batches = readPendingBatches(userId)
  snapshots.set(userId, batches)
  return batches
}

export function queueLogEntries(userId: string, payloads: PendingPayload[]): void {
  if (!userId) throw new Error('Sign in to log food.')
  if (payloads.length === 0) throw new Error('Add at least one item.')
  const now = new Date().toISOString()
  const entries: LogEntry[] = payloads.map((payload) => {
    const quantity = Math.round((payload.quantity ?? 1) * 1000) / 1000
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity >= 10_000_000) {
      throw new Error(`Enter a valid amount for ${payload.name}.`)
    }
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      food_id: payload.food_id ?? null,
      logged_date: payload.logged_date,
      meal: payload.meal,
      name: payload.name,
      quantity,
      serving_unit: payload.serving_unit ?? 'serving',
      calories: payload.calories ?? 0,
      protein_g: payload.protein_g ?? 0,
      carbs_g: payload.carbs_g ?? 0,
      fats_g: payload.fats_g ?? 0,
      fiber_g: payload.fiber_g ?? 0,
      notes: payload.notes ?? null,
      created_at: now,
      updated_at: now,
    }
  })

  // Store each batch under its own key so another tab can queue food concurrently.
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}:${entries[0].id}`, JSON.stringify(entries))
  } catch {
    throw new Error('Food could not be saved on this device. Check browser storage and try again.')
  }
  notify()
}

function withOwnerLock(userId: string, work: () => Promise<void>): Promise<void> {
  if (navigator.locks) return navigator.locks.request(`${STORAGE_PREFIX}${userId}`, work)

  const next = (localLocks.get(userId) ?? Promise.resolve()).catch(() => {}).then(work)
  localLocks.set(userId, next)
  return next.finally(() => {
    if (localLocks.get(userId) === next) localLocks.delete(userId)
  })
}

export async function syncPendingBatch(
  batch: PendingBatch,
  onSynced: (entries: LogEntry[]) => void,
): Promise<void> {
  if (syncing.has(batch.key) || !navigator.onLine) return
  syncing.add(batch.key)
  try {
    await withOwnerLock(batch.userId, async () => {
      if (!navigator.onLine) return
      // Use the current entries in case this batch was changed while we waited.
      const entries = readPendingEntries(batch.key, batch.userId)
      if (entries.length === 0) return
      await saveLogEntries(entries)
      onSynced(entries)
      localStorage.removeItem(batch.key)
      failures.delete(batch.key)
    })
  } catch {
    failures.add(batch.key)
  } finally {
    syncing.delete(batch.key)
    notify()
  }
}

async function deleteWithPendingEntries(
  userId: string,
  deleteFromServer: () => Promise<void>,
  matches: (entry: LogEntry) => boolean,
) {
  await withOwnerLock(userId, async () => {
    const batches = readPendingBatches(userId)
    await deleteFromServer()
    for (const { key, entries } of batches) {
      const remaining = entries.filter((entry) => !matches(entry))
      if (remaining.length === entries.length) continue
      if (remaining.length > 0) {
        localStorage.setItem(key, JSON.stringify(remaining))
      } else {
        localStorage.removeItem(key)
        failures.delete(key)
      }
    }
  })
  notify()
}

export function resetWithPendingEntries(userId: string, reset: () => Promise<void>) {
  return deleteWithPendingEntries(userId, reset, () => true)
}

export function deleteMealWithPendingEntries(userId: string, date: string, meal: MealType) {
  return deleteWithPendingEntries(userId, () => {
    if (!navigator.onLine) throw new Error('Reconnect to delete this meal.')
    return deleteMealEntries(userId, date, meal)
  }, (entry) => entry.logged_date === date && entry.meal === meal)
}
