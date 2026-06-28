import { createLogEntry } from '@/lib/api'
import type { LogEntry, LogEntryInsert } from '@/types/database'

// Lightweight offline queue for food log entries. When the device is offline (or
// a create request fails due to the network), the entry payload is stored in
// localStorage and replayed against Supabase once connectivity returns.

const STORAGE_KEY = 'macrobot.pendingLogEntries.v1'

export type PendingPayload = Omit<LogEntryInsert, 'user_id'>

export interface PendingEntry {
  /** Local-only id, prefixed so it never collides with real UUIDs. */
  id: string
  payload: PendingPayload
  createdAt: string
}

/** A LogEntry augmented with a flag marking it as not-yet-synced. */
export type DisplayLogEntry = LogEntry & { __pending?: boolean }

type Listener = () => void
const listeners = new Set<Listener>()

// Cached snapshot so useSyncExternalStore gets a stable reference between writes.
let cache: PendingEntry[] | null = null

function read(): PendingEntry[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? (JSON.parse(raw) as PendingEntry[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(entries: PendingEntry[]): void {
  cache = entries
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* storage full / unavailable — ignore */
  }
  listeners.forEach((fn) => fn())
}

export function subscribePending(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPendingEntries(): PendingEntry[] {
  return read()
}

export function getPendingCount(): number {
  return read().length
}

export function getPendingForDate(date: string): PendingEntry[] {
  return read().filter((e) => (e.payload.logged_date ?? '') === date)
}

function enqueue(payload: PendingPayload): PendingEntry {
  const entry: PendingEntry = {
    id: `pending:${crypto.randomUUID()}`,
    payload,
    createdAt: new Date().toISOString(),
  }
  write([...read(), entry])
  return entry
}

export function removePending(id: string): void {
  write(read().filter((e) => e.id !== id))
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * Create a log entry, falling back to the offline queue when there's no network
 * or the request fails to reach the server. Returns whether it was queued.
 */
export async function createLogEntryQueued(
  payload: PendingPayload,
): Promise<{ queued: boolean; entry?: LogEntry }> {
  if (isOffline()) {
    enqueue(payload)
    return { queued: true }
  }

  try {
    const entry = await createLogEntry(payload)
    return { queued: false, entry }
  } catch (err) {
    // Only swallow network-style failures; surface real errors (auth, validation).
    if (isNetworkError(err)) {
      enqueue(payload)
      return { queued: true }
    }
    throw err
  }
}

function isNetworkError(err: unknown): boolean {
  if (isOffline()) return true
  if (err instanceof TypeError) return true // fetch network failure
  const message = err instanceof Error ? err.message.toLowerCase() : ''
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('load failed')
  )
}

let flushing = false

/**
 * Replay all queued entries against Supabase. Stops early if the network drops
 * again. Returns the number of entries successfully synced.
 */
export async function flushPendingEntries(): Promise<number> {
  if (flushing || isOffline()) return 0
  flushing = true
  let synced = 0

  try {
    for (const entry of read()) {
      try {
        await createLogEntry(entry.payload)
        removePending(entry.id)
        synced += 1
      } catch (err) {
        if (isNetworkError(err)) break
        // A non-network error means this payload is bad; drop it so the queue
        // doesn't get stuck forever.
        removePending(entry.id)
      }
    }
  } finally {
    flushing = false
  }

  return synced
}

/** Convert a queued payload into a LogEntry-shaped row for optimistic display. */
export function pendingToDisplayEntry(pending: PendingEntry): DisplayLogEntry {
  const p = pending.payload
  return {
    id: pending.id,
    user_id: 'pending',
    food_id: p.food_id ?? null,
    logged_date: p.logged_date ?? '',
    meal: p.meal,
    name: p.name,
    quantity: Number(p.quantity ?? 1),
    serving_unit: p.serving_unit ?? 'serving',
    calories: Number(p.calories ?? 0),
    protein_g: Number(p.protein_g ?? 0),
    carbs_g: Number(p.carbs_g ?? 0),
    fats_g: Number(p.fats_g ?? 0),
    fiber_g: Number(p.fiber_g ?? 0),
    notes: p.notes ?? null,
    created_at: pending.createdAt,
    updated_at: pending.createdAt,
    __pending: true,
  }
}
