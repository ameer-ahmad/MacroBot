import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateFoodLog } from '@/hooks/useLogEntries'
import { MEAL_LABELS, queryKeys } from '@/lib/api'
import { parseDateString } from '@/lib/macros'
import { deleteMealWithPendingEntries } from '@/lib/offlineQueue'
import { useAuth } from '@/providers/AuthProvider'
import type { LogEntry, MealType } from '@/types/database'

export function DeleteMealDialog({ date, meal, entries, onClose }: {
  date: string
  meal: MealType
  entries: LogEntry[]
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const queryClient = useQueryClient()
  const userId = useAuth().user?.id ?? ''
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: () => deleteMealWithPendingEntries(userId, date, meal),
    onSuccess: async () => {
      const queryKey = queryKeys.logEntries(date)
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData<LogEntry[]>(queryKey, (saved) => saved?.filter((entry) => entry.meal !== meal))
      void invalidateFoodLog(queryClient)
      onClose()
    },
  })

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  const displayDate = parseDateString(date).toLocaleDateString(undefined, { dateStyle: 'medium' })

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!mutation.isPending) onClose()
      }}
      aria-labelledby="delete-meal-title"
      aria-describedby="delete-meal-description"
      className="fixed inset-x-0 bottom-0 top-auto mx-auto max-h-[90dvh] w-full max-w-sm space-y-4 rounded-t-2xl border border-border bg-card px-5 pt-5 pb-[calc(1rem_+_env(safe-area-inset-bottom))] text-foreground shadow-xl backdrop:bg-foreground/40 sm:inset-y-0 sm:my-auto sm:rounded-2xl sm:pb-5"
    >
      <div className="space-y-1">
        <h3 id="delete-meal-title" className="text-lg font-semibold">Delete {MEAL_LABELS[meal].toLowerCase()}?</h3>
        <p id="delete-meal-description" className="text-sm text-muted">
          Remove all items from this meal on {displayDate}.
        </p>
      </div>
      {entries.length > 0 && (
        <ul className="max-h-40 list-disc space-y-1 overflow-y-auto rounded-xl bg-background py-2 pr-3 pl-7 text-sm">
          {entries.map((entry) => <li key={entry.id} className="break-words">{entry.name}</li>)}
        </ul>
      )}
      {mutation.error && (
        <p className="text-sm text-fats" role="alert">
          {mutation.error instanceof Error ? mutation.error.message : 'Couldn’t delete this meal. Try again.'}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
          className="min-h-11 flex-1 cursor-pointer rounded-xl border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="min-h-11 flex-1 cursor-pointer rounded-xl bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {mutation.isPending ? 'Deleting…' : 'Delete meal'}
        </button>
      </div>
    </dialog>
  )
}
