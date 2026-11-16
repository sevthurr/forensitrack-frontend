import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Loader2, Mail, Pencil, Power, ShieldAlert } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, Card, ConfirmDialog, DataTable, EmptyState, LinkCell, MetaCard, Modal, Mono, PageHeader, StatusBadge, Tabs } from '../components/ui'
import { UserForm } from './Users'
import { cn, fmtD, initials } from '../lib/utils'

export default function UserDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { users, cases, me, saveUser, resendInvite, resetUserMfa, toast } = useApp()
  const [tab, setTab] = useState('active')
  const [edit, setEdit] = useState(false)
  const [toggle, setToggle] = useState(false)
  const [confirmResetMfa, setConfirmResetMfa] = useState(false)
  const [resending, setResending] = useState(false)

  const u = users.find((x) => x.id === id)
  if (!u) {
    return (
      <EmptyState
        title="User not found"
        description={`No user account with ID ${id}.`}
        action={<Link to="/users"><Button>Back to User Management</Button></Link>}
      />
    )
  }

  const userCases = useMemo(
    () =>
      cases
        .filter((c) => c.investigatorId === u.id)
        .sort((a, b) => b.created.localeCompare(a.created)),
    [cases, u.id],
  )

  const activeCases = useMemo(
    () => userCases.filter((c) => c.status.toLowerCase() === 'open' || c.status.toLowerCase() === 'in_progress'),
    [userCases],
  )

  const displayedCases = tab === 'active' ? activeCases : userCases

  return (
    <>
      <div className="mb-4">
        <Link to="/users" className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-gold transition-colors">
          <ArrowLeft size={14} />
          Back to User Management
        </Link>
      </div>

      <PageHeader
        title={u.name}
        description={u.email || 'No email recorded'}
        actions={
          <>
            {u.onboardingStatus !== 'completed' && u.status === 'Active' && (
              <Button
                disabled={resending}
                onClick={async () => {
                  setResending(true)
                  const res = await resendInvite(u.id)
                  setResending(false)
                  toast(res.ok ? `Invitation resent to ${u.email || u.name}` : res.error ?? 'Failed to resend invitation', res.ok ? 'success' : 'error')
                }}
              >
                {resending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Resend Invite
              </Button>
            )}
            <Button onClick={() => setEdit(true)}><Pencil size={15} />Edit User</Button>
            {u.id !== me?.id && (
              <Button onClick={() => setConfirmResetMfa(true)}>
                <ShieldAlert size={15} />
                Reset MFA
              </Button>
            )}
            <Button
              variant={u.status === 'Active' ? 'danger' : 'secondary'}
              disabled={u.id === me?.id && u.status === 'Active'}
              title={u.id === me?.id ? 'You cannot deactivate your own account' : undefined}
              onClick={() => setToggle(true)}
            >
              <Power size={15} />
              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        }
      />

      <Card className="p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="h-14 w-14 rounded-full bg-gold/15 border border-gold/40 text-gold grid place-items-center text-lg font-semibold font-display">
            {initials(u.name)}
          </span>
          <div>
            <div className="font-display text-xl">{u.name}</div>
            <div className="text-sm text-mute mt-0.5">{u.role === 'admin' ? 'Administrator' : 'Investigator'}</div>
          </div>
        </div>
        <MetaCard
          cols={2}
          items={[
            { label: 'Email', value: u.email || '—', mono: true },
            { label: 'Role', value: u.role === 'admin' ? 'Administrator' : 'Investigator' },
            {
              label: 'Account Status',
              value: (
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        u.status === 'Inactive'
                          ? 'bg-bad'
                          : u.onboardingStatus && u.onboardingStatus !== 'completed'
                            ? 'bg-gold'
                            : 'bg-ok',
                      )}
                    />
                    {u.status === 'Inactive'
                      ? 'Inactive'
                      : u.onboardingStatus && u.onboardingStatus !== 'completed'
                        ? 'Pending Invite'
                        : 'Active'}
                  </span>
                  {u.status === 'Active' && u.onboardingStatus === 'password_set' && (
                    <p className="text-xs text-mute">Password set — awaiting first sign-in to activate.</p>
                  )}
                </div>
              ),
            },
            { label: 'Member Since', value: fmtD(u.created), mono: true },
          ]}
        />
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'active', label: 'Cases Currently Held', count: activeCases.length },
          { id: 'history', label: 'Case History', count: userCases.length },
        ]}
      />

      <DataTable
        rows={displayedCases}
        rowKey={(c) => c.id}
        pageSize={8}
        onRowClick={(c) => nav(`/cases/${c.id}`)}
        columns={[
          { key: 'num', header: 'Case Number', cell: (c) => <LinkCell to={`/cases/${c.id}`}>{c.caseNumber || c.id}</LinkCell> },
          { key: 'title', header: 'Case Title', cell: (c) => <span className="block max-w-[320px] font-medium">{c.title}</span> },
          { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
          { key: 'created', header: 'Date Created', hide: 'md', cell: (c) => <Mono>{fmtD(c.created)}</Mono> },
        ]}
        empty={
          <EmptyState
            title={tab === 'active' ? 'No active cases held' : 'No case history'}
            description={
              tab === 'active'
                ? 'This user is not currently handling any open or in-progress cases.'
                : 'No cases have been assigned to this user.'
            }
          />
        }
      />

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit User">
        <UserForm initial={u} onClose={() => setEdit(false)} />
      </Modal>

      <ConfirmDialog
        open={toggle}
        onClose={() => setToggle(false)}
        danger={u.status === 'Active'}
        title={u.status === 'Active' ? 'Deactivate account?' : 'Activate account?'}
        message={`${u.name} will ${u.status === 'Active' ? 'no longer be able to sign in or receive custody' : 'regain access to the system'}.`}
        confirmLabel={u.status === 'Active' ? 'Deactivate' : 'Activate'}
        onConfirm={async () => {
          const res = await saveUser({ ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' })
          toast(res.ok ? 'Account status updated' : res.error ?? 'Not allowed', res.ok ? 'success' : 'error')
        }}
      />

      <ConfirmDialog
        open={confirmResetMfa}
        onClose={() => setConfirmResetMfa(false)}
        danger
        title="Reset user MFA?"
        message={`This removes ${u.name}'s Google Authenticator factor and invalidates their active sessions. They will be required to enroll a new authenticator on their next sign-in.`}
        confirmLabel="Reset MFA"
        onConfirm={async () => {
          const res = await resetUserMfa(u.id)
          toast(res.ok ? `MFA reset for ${u.name}` : res.error ?? 'Failed to reset MFA', res.ok ? 'success' : 'error')
        }}
      />
    </>
  )
}
