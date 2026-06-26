import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, Search, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/log', label: 'Log', icon: ClipboardList },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-card/90 shadow-lg backdrop-blur-md"
      aria-label="Main navigation"
    >
      <ul className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-accent text-primary'
                    : 'text-muted hover:text-foreground',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
