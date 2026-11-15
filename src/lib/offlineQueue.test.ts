import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteMealEntries, saveLogEntries } from '@/lib/api'
import { deleteMealWithPendingEntries, getPendingBatches, queueLogEntries, resetWithPendingEntries, syncPendingBatch } from '@/lib/offlineQueue'

vi.mock('@/lib/api', () => ({ deleteMealEntries: vi.fn(), saveLogEntries: vi.fn() }))

const row = { name: 'Oats', meal: 'breakfast', logged_date: '2026-11-14' } as const
const network = { onLine: true }
let userId: string

beforeEach(() => {
  userId = crypto.randomUUID()
  network.onLine = true
  const storage = new Map<string, string>()
  vi.stubGlobal('navigator', network)
  vi.stubGlobal('localStorage', {
    get length() { return storage.size },
    key: (index: number) => [...storage.keys()][index] ?? null,
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  vi.mocked(saveLogEntries).mockReset().mockResolvedValue(undefined)
  vi.mocked(deleteMealEntries).mockReset().mockResolvedValue(undefined)
})

afterEach(() => vi.unstubAllGlobals())

describe('food log queue', () => {
  it('saves an entire meal offline and only exposes it to its owner', async () => {
    network.onLine = false
    queueLogEntries(userId, [row, { ...row, name: 'Milk' }])

    const [batch] = getPendingBatches(userId)
    expect(batch.entries.map((entry) => entry.name)).toEqual(['Oats', 'Milk'])
    expect(getPendingBatches(crypto.randomUUID())).toEqual([])
    await syncPendingBatch(batch, vi.fn())
    expect(saveLogEntries).not.toHaveBeenCalled()

    network.onLine = true
    await syncPendingBatch(batch, vi.fn())
    expect(saveLogEntries).toHaveBeenCalledExactlyOnceWith(batch.entries)
    expect(getPendingBatches(userId)).toEqual([])
  })

  it('keeps an unsuccessful batch and uses the same entry IDs when retried', async () => {
    vi.mocked(saveLogEntries).mockRejectedValueOnce(new Error('Connection lost'))
    queueLogEntries(userId, [row, { ...row, name: 'Milk' }])
    const [batch] = getPendingBatches(userId)
    const onSynced = vi.fn()

    await syncPendingBatch(batch, onSynced)
    expect(onSynced).not.toHaveBeenCalled()
    expect(getPendingBatches(userId)[0]).toEqual({ ...batch, failed: true })

    await Promise.all([
      syncPendingBatch(getPendingBatches(userId)[0], onSynced),
      syncPendingBatch(getPendingBatches(userId)[0], onSynced),
    ])
    expect(vi.mocked(saveLogEntries).mock.calls).toEqual([[batch.entries], [batch.entries]])
    expect(onSynced).toHaveBeenCalledExactlyOnceWith(batch.entries)
    expect(getPendingBatches(userId)).toEqual([])
  })

  it('preserves pending food when reset fails and clears only that account on success', async () => {
    const otherUser = crypto.randomUUID()
    queueLogEntries(userId, [row])
    queueLogEntries(otherUser, [row])

    await expect(resetWithPendingEntries(userId, async () => { throw new Error('Offline') })).rejects.toThrow('Offline')
    expect(getPendingBatches(userId)).toHaveLength(1)

    await resetWithPendingEntries(userId, async () => {})
    expect(getPendingBatches(userId)).toHaveLength(0)
    expect(getPendingBatches(otherUser)).toHaveLength(1)
  })

  it('reports storage failure before showing an entry as saved', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded') })
    expect(() => queueLogEntries(userId, [row])).toThrow('could not be saved')
    expect(getPendingBatches(userId)).toEqual([])
  })

  it('removes only the selected meal and syncs the remaining entries from a previously read batch', async () => {
    const otherUser = crypto.randomUUID()
    queueLogEntries(userId, [row, { ...row, meal: 'lunch' }, { ...row, logged_date: '2026-11-15' }])
    queueLogEntries(otherUser, [row])
    const [batch] = getPendingBatches(userId)
    const onSynced = vi.fn()

    await Promise.all([
      deleteMealWithPendingEntries(userId, row.logged_date, row.meal),
      syncPendingBatch(batch, onSynced),
    ])

    const remaining = batch.entries.slice(1)
    expect(deleteMealEntries).toHaveBeenCalledExactlyOnceWith(userId, row.logged_date, row.meal)
    expect(saveLogEntries).toHaveBeenCalledExactlyOnceWith(remaining)
    expect(onSynced).toHaveBeenCalledExactlyOnceWith(remaining)
    expect(getPendingBatches(otherUser)).toHaveLength(1)
  })

  it('waits for an upload in progress before deleting the meal on the server', async () => {
    let finishUpload!: () => void
    vi.mocked(saveLogEntries).mockReturnValueOnce(new Promise<void>((resolve) => { finishUpload = resolve }))
    queueLogEntries(userId, [row])
    const [batch] = getPendingBatches(userId)

    const syncing = syncPendingBatch(batch, vi.fn())
    await vi.waitFor(() => expect(saveLogEntries).toHaveBeenCalledOnce())
    const deleting = deleteMealWithPendingEntries(userId, row.logged_date, row.meal)
    await Promise.resolve()
    expect(deleteMealEntries).not.toHaveBeenCalled()
    finishUpload()

    await Promise.all([syncing, deleting])
    expect(deleteMealEntries).toHaveBeenCalledOnce()
    expect(getPendingBatches(userId)).toEqual([])
  })

  it('keeps the pending meal when deletion fails or the device is offline', async () => {
    queueLogEntries(userId, [row])
    const [batch] = getPendingBatches(userId)
    vi.mocked(deleteMealEntries).mockRejectedValueOnce(new Error('Connection lost'))

    await expect(deleteMealWithPendingEntries(userId, row.logged_date, row.meal)).rejects.toThrow('Connection lost')
    expect(getPendingBatches(userId)).toEqual([batch])

    network.onLine = false
    await expect(deleteMealWithPendingEntries(userId, row.logged_date, row.meal)).rejects.toThrow('Reconnect')
    expect(deleteMealEntries).toHaveBeenCalledOnce()
    expect(getPendingBatches(userId)).toEqual([batch])
  })
})
