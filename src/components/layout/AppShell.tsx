import { useLayoutEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { StatusBar } from './StatusBar'
import { ThemeToggle } from './ThemeToggle'

export function AppShell() {
  const shellRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const shell = shellRef.current
    const header = headerRef.current
    if (!shell || !header) return

    // The status bar can change the header height while the date control is pinned below it.
    const updateOffset = () => shell.style.setProperty('--app-header-height', `${header.offsetHeight}px`)
    updateOffset()
    const observer = new ResizeObserver(updateOffset)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={shellRef} className="flex min-h-dvh flex-col bg-background">
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              MacroBot
            </p>
            <h1 className="text-lg font-semibold text-foreground">Nutrition Tracker</h1>
          </div>
          <ThemeToggle />
        </div>
        <StatusBar />
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
