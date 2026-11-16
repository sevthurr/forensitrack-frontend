import { createHashRouter, RouterProvider } from 'react-router'
import { AppProvider } from './store/AppContext'
import { ToastHost } from './components/ui'
import { Layout, NotFound, RequireAdmin } from './components/Layout'
import Login from './pages/Login'
import AcceptInvite from './pages/AcceptInvite'
import MfaSetup from './pages/MfaSetup'
import MfaVerify from './pages/MfaVerify'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import EvidenceList from './pages/EvidenceList'
import EvidenceDetail from './pages/EvidenceDetail'
import Verify from './pages/Verify'
import AuditLogs from './pages/AuditLogs'
import UsersPage from './pages/Users'
import UserDetail from './pages/UserDetail'
import Profile from './pages/Profile'

const router = createHashRouter([
  { path: '/login', Component: Login },
  { path: '/accept-invite', Component: AcceptInvite },
  { path: '/mfa-setup', Component: MfaSetup },
  { path: '/mfa-verify', Component: MfaVerify },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'cases', Component: Cases },
      { path: 'cases/:id', Component: CaseDetail },
      { path: 'evidence', Component: EvidenceList },
      { path: 'evidence/:id', Component: EvidenceDetail },
      { path: 'verify', Component: Verify },
      {
        Component: RequireAdmin,
        children: [
          { path: 'audit-logs', Component: AuditLogs },
          { path: 'users', Component: UsersPage },
          { path: 'users/:id', Component: UserDetail },
        ],
      },
      { path: 'profile', Component: Profile },
      { path: '*', Component: NotFound },
    ],
  },
])

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <ToastHost />
    </AppProvider>
  )
}
