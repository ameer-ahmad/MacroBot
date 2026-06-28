import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { CloudOff, RefreshCw, UploadCloud } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { usePendingCount } from '@/hooks/usePendingSync'
import { flushPendingEntries } from '@/lib/offlineQueue'

const SYNCED_KEYS = ['log-entries', 'daily-totals', 'recent-foods', 'loggable-search']

export function StatusBar() {
  const online = useOnlineStatus()
  const pending = usePendingCount()
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const wasOffline = useRef(!navigator.onLine)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // Flush the offline queue when we (re)gain connectivity or on first load.
  useEffect(() => {
    let cancelled = false
    async function sync() {
      if (!online || pending === 0 || syncing) return
      setSyncing(true)
      const synced = await flushPendingEntries()
      if (!cancelled) {
        setSyncing(false)
        if (synced > 0) {
          queryClient.invalidateQueries({
            predicate: (q) => SYNCED_KEYS.includes(String(q.queryKey[0])),
          })
        }
      }
    }
    void sync()
    return () => {
      cancelled = true
    }
  }, [online, pending, syncing, queryClient])

  useEffect(() => {
    wasOffline.current = !online
  }, [online])

  if (needRefresh) {
    return (
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
    )
  }

  if (!online) {
    return (
      <Bar tone="muted">
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          Offline — entries are saved on this device{pending > 0 ? ` (${pending} pending)` : ''}.
        </span>
      </Bar>
    )
  }

  if (pending > 0) {
    return (
      <Bar tone="primary">
        <UploadCloud className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          {syncing ? 'Syncing' : 'Saving'} {pending} offline{' '}
          {pending === 1 ? 'entry' : 'entries'}…
        </span>
      </Bar>
    )
  }

  return null
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
