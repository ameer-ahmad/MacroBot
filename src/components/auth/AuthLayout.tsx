import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">MacroBot</p>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8">
        <p className="mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </main>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function AuthField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required = true,
  minLength,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
      />
    </div>
  )
}

export const authButtonClass =
  'w-full cursor-pointer rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const authLinkClass =
  'font-medium text-primary transition-colors duration-200 hover:opacity-80'
