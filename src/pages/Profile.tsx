import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { supabase } from '../lib/supabase'
import { api } from '../services/api'
import { Button, Card, Field, Input, MetaCard, PageHeader, SectionTitle, Tabs } from '../components/ui'
import { cn, initials } from '../lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const capFirst = (v: string) => (v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v)

function splitName(fullName?: string): [string, string] {
  if (!fullName) return ['', '']
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return [parts[0] || '', '']
  const last = parts.pop() || ''
  return [parts.join(' '), last]
}

export default function Profile() {
  const { me, isAdmin, renameMe, toast } = useApp()
  const [tab, setTab] = useState('profile')
  const [initFirst, initLast] = splitName(me!.name)
  const [firstName, setFirstName] = useState(initFirst)
  const [lastName, setLastName] = useState(initLast)
  const [email, setEmail] = useState(me!.email)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  const [currPass, setCurrPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!firstName.trim()) er.firstName = 'First name is required'
    if (!lastName.trim()) er.lastName = 'Last name is required'
    if (!EMAIL_RE.test(email.trim())) er.email = 'Enter a valid email address'
    setProfileErrors(er)
    if (Object.keys(er).length) return

    try {
      setSavingProfile(true)
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const trimmedEmail = email.trim()
      await renameMe(fullName, trimmedEmail !== me!.email ? trimmedEmail : undefined)
      toast('Profile updated')
    } catch (err: any) {
      toast(err?.detail || err?.message || 'Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currPass || newPass.length < 8) {
      return toast('Enter your current password and a new password of at least 8 characters', 'error')
    }
    if (newPass !== confirmPass) {
      return toast('New passwords do not match', 'error')
    }

    try {
      setSavingPass(true)
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) {
        toast(error.message || 'Failed to update password', 'error')
        return
      }
      await api.auth.logEvent('PASSWORD_CHANGED').catch(() => {})
      setCurrPass('')
      setNewPass('')
      setConfirmPass('')
      toast('Password updated successfully')
    } catch (err: any) {
      toast(err?.message || 'Failed to update password', 'error')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="My Profile" description="Manage your personal details and account security." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'profile', label: 'Profile' },
          { id: 'security', label: 'Security' },
        ]}
      />

      {tab === 'profile' && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="h-16 w-16 rounded-full bg-gold/15 border border-gold/40 text-gold grid place-items-center text-xl font-semibold font-display">
              {initials(me!.name)}
            </span>
            <div>
              <div className="font-display text-xl">{me!.name}</div>
              <div className="text-sm text-mute mt-0.5">{isAdmin ? 'Administrator' : 'Investigator'}</div>
            </div>
          </div>

          <MetaCard
            items={[
              { label: 'Role', value: isAdmin ? 'Administrator' : 'Investigator' },
              {
                label: 'Account Status',
                value: (
                  <span className="inline-flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', me!.status === 'Active' ? 'bg-ok' : 'bg-bad')} />
                    {me!.status}
                  </span>
                ),
              },
            ]}
          />

          <form onSubmit={saveProfile} className="mt-6 pt-5 border-t border-line space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" error={profileErrors.firstName}>
                <Input
                  value={firstName}
                  maxLength={75}
                  onChange={(e) => setFirstName(capFirst(e.target.value))}
                  disabled={savingProfile}
                />
              </Field>
              <Field label="Last Name" error={profileErrors.lastName}>
                <Input
                  value={lastName}
                  maxLength={75}
                  onChange={(e) => setLastName(capFirst(e.target.value))}
                  disabled={savingProfile}
                />
              </Field>
            </div>
            <Field label="Email" error={profileErrors.email}>
              <Input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} disabled={savingProfile} />
            </Field>
            <Button type="submit" variant="primary" disabled={savingProfile} className="flex items-center gap-2">
              {savingProfile && <Loader2 size={14} className="animate-spin" />}
              {savingProfile ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      )}

      {tab === 'security' && (
        <Card className="p-5 sm:p-6">
          <SectionTitle>Change Password</SectionTitle>
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Current Password">
              <Input type="password" value={currPass} maxLength={128} onChange={(e) => setCurrPass(e.target.value)} placeholder="••••••••" disabled={savingPass} />
            </Field>
            <Field label="New Password">
              <Input type="password" value={newPass} maxLength={128} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••••" disabled={savingPass} />
            </Field>
            <Field label="Confirm New Password">
              <Input type="password" value={confirmPass} maxLength={128} onChange={(e) => setConfirmPass(e.target.value)} placeholder="••••••••" disabled={savingPass} />
            </Field>
            <Button type="submit" variant="primary" disabled={savingPass} className="flex items-center gap-2">
              {savingPass && <Loader2 size={14} className="animate-spin" />}
              {savingPass ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
