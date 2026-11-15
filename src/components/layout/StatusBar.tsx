import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { CloudOff, RefreshCw, UploadCloud } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { invalidateFoodLog } from '@/hooks/useLogEntries'
import { usePendingBatches } from '@/hooks/usePendingSync'
import { queryKeys } from '@/lib/api'
import { syncPendingBatch, type PendingBatch } from '@/lib/offlineQueue'
import type { LogEntry } from '@/types/database'

export function StatusBar() {
  const online = useOnlineStatus()
  const batches = usePendingBatches()
  const pending = batches.reduce((count, batch) => count + batch.entries.length, 0)
  const failed = batches.reduce((count, batch) => count + (batch.failed ? batch.entries.length : 0), 0)
  const queryClient = useQueryClient()
  const wasOnline = useRef(online)
  const previousKeys = useRef<string[]>([])

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const sync = useCallback((batch: PendingBatch) => {
    void syncPendingBatch(batch, (entries) => {
      const dates = new Set(entries.map((entry) => entry.logged_date))
      for (const date of dates) {
        queryClient.setQueryData<LogEntry[]>(queryKeys.logEntries(date), (saved = []) => {
          const savedIds = new Set(saved.map((entry) => entry.id))
          return [...saved, ...entries.filter((entry) => entry.logged_date === date && !savedIds.has(entry.id))]
        })
      }
    })
  }, [queryClient])

  useEffect(() => {
    const reconnected = online && !wasOnline.current
    wasOnline.current = online
    if (online) {
      for (const batch of batches) {
        if (!batch.failed || reconnected) sync(batch)
      }
    }

    const keys = new Set(batches.map((batch) => batch.key))
    // A batch may have been synced in this tab or another one.
    if (previousKeys.current.some((key) => !keys.has(key))) void invalidateFoodLog(queryClient)
    previousKeys.current = [...keys]
  }, [batches, online, queryClient, sync])

  return (
    <>
      {needRefresh && (
        <Bar tone="primary">
          <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">A new version is available.</span>
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="cursor-pointer rounded-lg bg-primary-foreground/20 px-3 py-1 font-medium hover:bg-primary-foreground/30"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="cursor-pointer rounded-lg px-2 py-1 font-medium opacity-80 hover:opacity-100"
          >
            Later
          </button>
        </Bar>
      )}
      {!online && (
        <Bar tone="muted">
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1" role="status">
            Offline. {pending ? `${pending} saved on this device.` : 'You can still log food.'}
          </span>
        </Bar>
      )}
      {online && pending > 0 && (
        <Bar tone="primary">
          <UploadCloud className="h-4 w-4 shrink-0" aria-hidden="true" />
          {failed ? (
            <>
              <span className="flex-1" role="status">Couldn’t sync {failed} {failed === 1 ? 'entry' : 'entries'}.</span>
              <button
                type="button"
                onClick={() => batches.filter((batch) => batch.failed).forEach(sync)}
                className="cursor-pointer rounded-lg bg-primary-foreground/20 px-3 py-1 font-medium hover:bg-primary-foreground/30"
              >
                Retry
              </button>
            </>
          ) : (
            <span className="flex-1" role="status">Syncing {pending} {pending === 1 ? 'entry' : 'entries'}…</span>
          )}
        </Bar>
      )}
    </>
  )
}

function Bar({
  tone,
  children,
}: {
  tone: 'primary' | 'muted'
  children: React.ReactNode
}) {
  const toneClass =
    tone === 'primary'
      ? 'bg-primary text-primary-foreground'
      : 'bg-foreground/80 text-background'
  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm ${toneClass}`}>
      <div className="mx-auto flex w-full max-w-lg items-center gap-2">{children}</div>
    </div>
  )
}
