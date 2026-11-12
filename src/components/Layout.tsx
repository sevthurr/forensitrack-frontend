import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { ChevronDown, CircleUser, FolderOpen, LayoutDashboard, LogOut, Menu, Package, PanelLeftClose, PanelLeftOpen, ScrollText, ShieldCheck, Users, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Badge, Logo } from './ui'
import { cn, initials } from '../lib/utils'

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center text-center py-24">
      <span className="h-14 w-14 rounded-xl bg-bad/10 text-bad grid place-items-center mb-4"><ShieldCheck size={26} /></span>
      <h1 className="font-display text-3xl">Access Denied</h1>
      <p className="text-mute mt-2 max-w-md text-sm">Your current role does not have permission to view this page or record. </p>
      <Link to="/" className="mt-6 text-gold text-sm hover:underline">Return to dashboard</Link>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="flex flex-col items-center text-center py-24">
      <h1 className="font-display text-5xl text-gold">404</h1>
      <p className="text-mute mt-2 text-sm">This page does not exist.</p>
      <Link to="/" className="mt-6 text-gold text-sm hover:underline">Return to dashboard</Link>
    </div>
  )
}

export function RequireAdmin() {
  const { isAdmin, loadingAuth } = useApp()
  if (loadingAuth) return null
  return isAdmin ? <Outlet /> : <AccessDenied />
}

export function Layout() {
  const { me, isAdmin, logout, userName, loadingAuth } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [menu, setMenu] = useState(false)

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="h-0.5 w-full bg-surface overflow-hidden">
          <div className="h-full bg-gold animate-pulse w-full" />
        </div>
      </div>
    )
  }

  if (!me) return <Navigate to="/login" replace />

  const groups = [
    { label: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      label: 'Investigation',
      items: [
        { to: '/cases', label: isAdmin ? 'Case Management' : 'My Cases', icon: FolderOpen },
        { to: '/evidence', label: 'Evidence', icon: Package },
        { to: '/verify', label: 'Verify Evidence', icon: ShieldCheck },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: 'Oversight',
            items: [{ to: '/audit-logs', label: 'Audit Logs', icon: ScrollText }],
          },
        ]
      : []),
    {
      label: 'Account',
      items: [...(isAdmin ? [{ to: '/users', label: 'User Management', icon: Users }] : []), { to: '/profile', label: 'My Profile', icon: CircleUser }],
    },
  ]

  const flat = groups.flatMap((g) => g.items)
  const segs = loc.pathname.split('/').filter(Boolean)
  const base = flat.find((i) => i.to === '/' + segs[0])
  const crumbs: { label: string; to?: string }[] = []
  if (segs.length === 0) crumbs.push({ label: 'Dashboard' })
  else {
    crumbs.push({ label: base?.label ?? 'Page', to: segs.length > 1 ? base?.to : undefined })
    if (segs[1]) crumbs.push({ label: segs[1] })
  }
  const title = crumbs[crumbs.length - 1].label

  const handleLogout = async () => {
    setMenu(false)
    await logout()
    nav('/login')
  }

  return (
    <div className="min-h-screen bg-bg">
      {drawer && <div className="fixed inset-0 z-30 bg-black/70 lg:hidden print:hidden" onClick={() => setDrawer(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 bg-surface border-r border-line flex flex-col transition-all duration-200 w-[264px] print:hidden', drawer ? 'translate-x-0' : '-translate-x-full lg:translate-x-0', collapsed ? 'lg:w-[72px]' : 'lg:w-[256px]')}>
        <div className={cn('h-16 flex items-center justify-between px-4 border-b border-line', collapsed && 'lg:justify-center lg:px-0')}>
          <div className={cn(collapsed && 'lg:hidden')}><Logo /></div>
          {collapsed && <div className="hidden lg:block"><Logo compact /></div>}
          <button className="lg:hidden text-mute" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <div className={cn('px-3 mb-1.5 text-[10px] uppercase tracking-[0.18em] text-mute/60', collapsed && 'lg:hidden')}>{g.label}</div>
              <div className="space-y-0.5">
                {g.items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={'end' in i && i.end} onClick={() => setDrawer(false)} title={i.label}
                    className={({ isActive }) => cn('relative flex items-center gap-3 h-10 rounded-lg px-3 text-sm transition-colors', collapsed && 'lg:justify-center lg:px-0', isActive ? 'bg-gold/10 text-gold' : 'text-mute hover:text-ink hover:bg-panel')}>
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-gold" />}
                        <i.icon size={18} className="shrink-0" />
                        <span className={cn(collapsed && 'lg:hidden')}>{i.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className={cn('p-4 border-t border-line text-[11px] text-mute/70 leading-snug', collapsed && 'lg:hidden')}>Digital Evidence Management System</div>
      </aside>

      <div className={cn('transition-all duration-200 print:pl-0', collapsed ? 'lg:pl-[72px]' : 'lg:pl-[256px]')}>
        <header className="sticky top-0 z-20 h-16 bg-bg/95 backdrop-blur-0 border-b border-line flex items-center gap-3 px-4 sm:px-6 print:hidden">
          <button className="lg:hidden h-9 w-9 grid place-items-center rounded-lg text-mute hover:bg-panel" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20} /></button>
          <button className="hidden lg:grid h-9 w-9 place-items-center rounded-lg text-mute hover:bg-panel hover:text-ink" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="min-w-0 flex-1">
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-mute">
              {crumbs.length > 1 && crumbs.slice(0, -1).map((c) => (
                <span key={c.label} className="flex items-center gap-1.5">
                  {c.to ? <Link to={c.to} className="hover:text-gold">{c.label}</Link> : c.label}
                  <span>/</span>
                </span>
              ))}
              {crumbs.length === 1 && <span>ForensiTrack</span>}
            </nav>
            <h1 className="font-display text-lg truncate tracking-wide">{title}</h1>
          </div>
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-panel">
              <span className="h-8 w-8 rounded-full bg-gold/15 border border-gold/40 text-gold grid place-items-center text-xs font-semibold">{initials(me.name)}</span>
              <span className="hidden sm:block text-left leading-tight">
                <span className="block text-sm">{userName(me.id)}</span>
                <span className="block text-[11px] text-gold">{isAdmin ? 'Administrator' : 'Investigator'}</span>
              </span>
              <ChevronDown size={14} className="text-mute" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="absolute right-0 mt-2 w-60 z-40 rounded-xl border border-line bg-panel p-1.5 shadow-2xl">
                  <div className="px-3 py-2 border-b border-line mb-1">
                    <div className="text-sm">{me.name}</div>
                    <div className="text-xs text-mute truncate">{me.email}</div>
                    <Badge tone="gold" className="mt-2">{isAdmin ? 'Administrator' : 'Investigator'}</Badge>
                  </div>
                  <button onClick={() => { setMenu(false); nav('/profile') }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface"><CircleUser size={16} className="text-mute" />My Profile</button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-bad hover:bg-surface"><LogOut size={16} />Logout</button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="p-4 sm:p-6 max-w-[1400px] w-full min-w-0 mx-auto print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
