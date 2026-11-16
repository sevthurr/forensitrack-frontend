import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Loader2, Mail, Pencil, Plus, Power } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, ConfirmDialog, DataTable, Field, FilterSelect, Input, Modal, ModalActions, PageHeader, SearchInput, Select, Mono } from '../components/ui'
import { cn, fmtD } from '../lib/utils'
import { checkNewUser, checkUserChange } from '../lib/userRules'
import type { Role, User } from '../lib/types'

const capFirst = (v: string) => (v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function splitName(fullName?: string): [string, string] {
  if (!fullName) return ['', '']
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return [parts[0] || '', '']
  const last = parts.pop() || ''
  return [parts.join(' '), last]
}

export function UserForm({ initial, onClose }: { initial?: User; onClose: () => void }) {
  const { saveUser, toast, users, me } = useApp()
  const [pending, setPending] = useState<string | null>(null)
  const isSelf = !!initial && initial.id === me?.id
  const [initFirst, initLast] = splitName(initial?.name)
  const [firstName, setFirstName] = useState(initFirst)
  const [lastName, setLastName] = useState(initLast)
  const [email, setEmail] = useState(initial?.email ?? '')
  const [role, setRole] = useState<Role>(initial?.role ?? 'investigator')
  const [status] = useState<User['status']>(initial?.status ?? 'Active')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!firstName.trim()) er.firstName = 'First name is required'
    if (!lastName.trim()) er.lastName = 'Last name is required'
    const trimmedEmail = email.trim()
    if (!EMAIL_RE.test(trimmedEmail)) er.email = 'Enter a valid email address (e.g. name@domain.com)'
    else if (users.some((u) => (u.email || '').toLowerCase() === trimmedEmail.toLowerCase() && u.id !== initial?.id)) {
      er.email = 'Email already in use'
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const next = { name: fullName, email: trimmedEmail, role, status: initial ? status : ('Active' as User['status']) }
    const chk = initial ? checkUserChange(users, me?.id ?? null, initial, next) : checkNewUser(next)
    if (chk.error) er[initial && initial.role !== role ? 'role' : 'form'] = chk.error
    setErrors(er)
    if (Object.keys(er).length) return
    if (chk.confirm) return setPending(chk.confirm)
    void commit()
  }

  const commit = async () => {
    setSubmitting(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const res = await saveUser({
      id: initial?.id,
      name: fullName,
      email: email.trim(),
      role,
      status: initial ? status : 'Active',
    })
    setSubmitting(false)
    if (!res.ok) {
      setPending(null)
      return setErrors({ form: res.error ?? 'This change is not allowed.' })
    }
    toast(initial ? 'User updated' : `Invitation sent to ${email.trim()}`)
    onClose()
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name" error={errors.firstName}>
            <Input
              value={firstName}
              maxLength={75}
              onChange={(e) => setFirstName(capFirst(e.target.value))}
              placeholder="e.g. Alex"
              disabled={submitting}
            />
          </Field>
          <Field label="Last Name" error={errors.lastName}>
            <Input
              value={lastName}
              maxLength={75}
              onChange={(e) => setLastName(capFirst(e.target.value))}
              placeholder="e.g. Turner"
              disabled={submitting}
            />
          </Field>
        </div>

        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. alex.turner@forensitrack.local"
            disabled={submitting || !!initial}
          />
        </Field>

        <Field label="Role" error={errors.role}>
          <Select disabled={submitting || (isSelf && initial?.role === 'admin')} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="investigator">Investigator</option>
            <option value="admin">Administrator</option>
          </Select>
        </Field>

        {!initial && (
          <p className="text-xs text-mute">
            An invitation email with a single-use password setup link will be sent to this address.
          </p>
        )}
        {isSelf && <p className="text-xs text-mute">You cannot change your own role or deactivate your own account.</p>}
        {errors.form && <p role="alert" className="text-sm text-bad">{errors.form}</p>}

        <ModalActions>
          <Button type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting} className="flex items-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {initial ? 'Save Changes' : 'Send Invitation'}
          </Button>
        </ModalActions>
      </form>
      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} title="Confirm role change" message={pending ?? ''} confirmLabel="Confirm" onConfirm={commit} />
    </>
  )
}

export default function UsersPage() {
  const { users, me, saveUser, resendInvite, toast, loadingUsers } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [add, setAdd] = useState(false)
  const [edit, setEdit] = useState<User | null>(null)
  const [toggle, setToggle] = useState<User | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const handleResend = async (u: User) => {
    setResendingId(u.id)
    const res = await resendInvite(u.id)
    setResendingId(null)
    toast(res.ok ? `Invitation resent to ${u.email || u.name}` : res.error ?? 'Failed to resend invitation', res.ok ? 'success' : 'error')
  }

  const getUserDisplayStatus = (u: User): 'Inactive' | 'Pending Invite' | 'Active' => {
    if (u.status === 'Inactive') return 'Inactive'
    if (u.onboardingStatus && u.onboardingStatus !== 'completed') return 'Pending Invite'
    return 'Active'
  }

  const rows = useMemo(
    () =>
      users.filter((u) => {
        const matchesRole = !roleFilter || u.role === roleFilter
        const matchesStatus = !statusFilter || getUserDisplayStatus(u) === statusFilter
        const matchesQuery = !q || (u.name + (u.email || '')).toLowerCase().includes(q.toLowerCase())
        return matchesRole && matchesStatus && matchesQuery
      }),
    [users, q, roleFilter, statusFilter],
  )

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administrator and Investigator accounts."
        actions={<Button variant="primary" onClick={() => setAdd(true)}><Plus size={16} />Invite User</Button>}
      />
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput className="flex-1 sm:max-w-md" value={q} onChange={setQ} placeholder="Search by name or email…" />
        <FilterSelect
          label="All roles"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'admin', label: 'Administrator' },
            { value: 'investigator', label: 'Investigator' },
          ]}
        />
        <FilterSelect
          label="All statuses"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'Pending Invite', label: 'Pending Invite' },
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </div>
      <DataTable
        loading={loadingUsers}
        skeletonRows={4}
        rows={rows}
        rowKey={(u) => u.id}
        onRowClick={(u) => nav(`/users/${u.id}`)}
        columns={[
          { key: 'n', header: 'Name', cell: (u) => <span className="font-medium">{u.name}</span> },
          { key: 'e', header: 'Email', hide: 'md', cell: (u) => <Mono>{u.email || '—'}</Mono> },
          { key: 'r', header: 'Role', hide: 'sm', cell: (u) => <span className="text-sm text-ink">{u.role === 'admin' ? 'Administrator' : 'Investigator'}</span> },
          {
            key: 's',
            header: 'Account Status',
            cell: (u) => {
              const displayStatus = getUserDisplayStatus(u)
              const dotClass =
                displayStatus === 'Inactive' ? 'bg-bad' : displayStatus === 'Pending Invite' ? 'bg-gold' : 'bg-ok'
              return (
                <span className="inline-flex items-center gap-2 text-sm text-ink">
                  <span className={cn('h-2 w-2 rounded-full', dotClass)} />
                  {displayStatus}
                </span>
              )
            },
          },
          { key: 'd', header: 'Created', hide: 'lg', cell: (u) => <Mono>{fmtD(u.created)}</Mono> },
          {
            key: 'a',
            header: 'Actions',
            cell: (u) => (
              <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {u.onboardingStatus !== 'completed' && u.status === 'Active' && (
                  <Button
                    size="sm"
                    disabled={resendingId === u.id}
                    onClick={() => void handleResend(u)}
                  >
                    {resendingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                    Resend Invite
                  </Button>
                )}
                <Button size="sm" onClick={() => setEdit(u)}><Pencil size={13} />Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={u.id === me?.id && u.status === 'Active'}
                  title={u.id === me?.id ? 'You cannot deactivate your own account' : undefined}
                  onClick={() => setToggle(u)}
                >
                  <Power size={13} />{u.status === 'Active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ),
          },
        ]}
      />
      <Modal open={add} onClose={() => setAdd(false)} title="Invite User"><UserForm onClose={() => setAdd(false)} /></Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit User">{edit && <UserForm initial={edit} onClose={() => setEdit(null)} />}</Modal>
      <ConfirmDialog
        open={!!toggle}
        onClose={() => setToggle(null)}
        danger={toggle?.status === 'Active'}
        title={toggle?.status === 'Active' ? 'Deactivate account?' : 'Activate account?'}
        message={toggle ? `${toggle.name} will ${toggle.status === 'Active' ? 'no longer be able to sign in or receive custody' : 'regain access to the system'}.` : ''}
        confirmLabel={toggle?.status === 'Active' ? 'Deactivate' : 'Activate'}
        onConfirm={async () => {
          if (toggle) {
            const res = await saveUser({ ...toggle, status: toggle.status === 'Active' ? 'Inactive' : 'Active' })
            toast(res.ok ? 'Account status updated' : res.error ?? 'Not allowed', res.ok ? 'success' : 'error')
          }
        }}
      />
    </>
  )
}
