import { createBrowserRouter } from 'react-router-dom'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { OnboardingGate } from '@/components/auth/OnboardingGate'
import { OnboardingOnlyRoute } from '@/components/auth/OnboardingOnlyRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { LogPage } from '@/pages/LogPage'
import { LoginPage } from '@/pages/LoginPage'
import { SearchPage } from '@/pages/SearchPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignUpPage } from '@/pages/SignUpPage'

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignUpPage /> },
    ],
  },
  {
    path: '/onboarding',
    element: <ProtectedRoute />,
    children: [{ index: true, element: <OnboardingOnlyRoute /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <OnboardingGate />,
        children: [
          {
            path: '/',
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'log', element: <LogPage /> },
              { path: 'search', element: <SearchPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
])
