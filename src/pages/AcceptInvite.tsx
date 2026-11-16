import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input, Logo } from '../components/ui'

function parseAuthParams(): {
  code: string | null
  accessToken: string | null
  refreshToken: string | null
  errorDesc: string | null
} {
  const search = new URLSearchParams(window.location.search)
  const rawHash = window.location.hash || ''
  // HashRouter URLs can look like "#/accept-invite#access_token=..." or "#access_token=..."
  const hashParts = rawHash.split('#').filter(Boolean)
  const tokenSegment = hashParts.find((p) => p.includes('access_token=') || p.includes('error=')) || ''
  const hashParams = new URLSearchParams(tokenSegment)

  const code = search.get('code')
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const errCode = search.get('error_code') || hashParams.get('error_code')
  const err = search.get('error') || hashParams.get('error')
  const desc = search.get('error_description') || hashParams.get('error_description')

  let errorDesc: string | null = null
  if (err || errCode || desc) {
    errorDesc = desc
      ? decodeURIComponent(desc.replace(/\+/g, ' '))
      : 'This invitation link is invalid, expired, or has already been used.'
  }

  return { code, accessToken, refreshToken, errorDesc }
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function AcceptInvite() {
  const { me, loadingAuth, setupPassword, toast } = useApp()
  const nav = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [inviteUser, setInviteUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const initInviteSession = async () => {
      const { code, accessToken, refreshToken, errorDesc } = parseAuthParams()
      if (errorDesc) {
        if (active) {
          setLinkError(errorDesc)
          setVerifying(false)
        }
        return
      }

      try {
        let session = null as any
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          session = data.session
          window.history.replaceState(null, '', `${window.location.pathname}#/accept-invite`)
        } else if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          session = data.session
          window.history.replaceState(null, '', `${window.location.pathname}#/accept-invite`)
        } else {
          // Only allow resuming if the existing session is an invited user awaiting password setup
          const { data: { session: existing } } = await supabase.auth.getSession()
          session = existing
        }

        if (!session) {
          if (active) {
            setLinkError('No active invitation session was found. Your invitation link may be expired, invalid, or already used.')
          }
          return
        }

        const { api } = await import('../services/api')
        const profile = await api.auth.getMe(session.access_token)
        if (profile.onboarding_status === 'completed') {
          if (active) {
            setLinkError('This invitation link has already been used or is no longer valid. Please sign in with your password.')
          }
          return
        }

        if (active) {
          setInviteUser({
            name: profile.full_name,
            email: session.user?.email || '',
            role: profile.role,
          })
        }
      } catch (err: any) {
        if (active) {
          setLinkError(err?.detail || err?.message || 'This invitation link is invalid, expired, or has already been used.')
        }
      } finally {
        if (active) setVerifying(false)
      }
    }

    void initInviteSession()
    return () => {
      active = false
    }
  }, [])

  if (!verifying && !loadingAuth && me && me.onboardingStatus === 'completed' && !linkError) {
    return <Navigate to="/" replace />
  }

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!allRulesPassed) {
      return setFormError('Please meet all password requirements before continuing.')
    }
    if (password !== confirm) {
      return setFormError('Passwords do not match.')
    }

    setSubmitting(true)
    try {
      // Backend-controlled password setup: updates Supabase Auth password via Admin API,
      // marks onboarding_status = 'password_set', logs ACCOUNT_SETUP_COMPLETED, and
      // terminates the invitation session so the user must sign in to activate.
      await setupPassword(password, confirm)
      toast('Password set successfully. Please sign in with your new password to activate your account.')
      nav('/login', { replace: true })
    } catch (err: any) {
      setFormError(err?.detail || err?.message || 'Failed to complete password setup.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        {verifying || loadingAuth ? (
          <Card className="p-8 text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-gold mx-auto" />
            <p className="text-sm text-mute">Validating your invitation…</p>
          </Card>
        ) : linkError || !inviteUser ? (
          <Card className="p-6 space-y-4 border-bad/40">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-lg bg-bad/10 text-bad grid place-items-center shrink-0">
                <AlertCircle size={20} />
              </span>
              <div>
                <h1 className="font-display text-xl text-ink">Invitation Unavailable</h1>
                <p className="text-sm text-mute mt-1">
                  {linkError || 'This invitation link is invalid, expired, or has already been used.'}
                </p>
              </div>
            </div>
            <p className="text-xs text-mute leading-relaxed">
              Invitation links are single-use and expire automatically. Please contact your ForensiTrack administrator to resend an invitation.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" className="w-full">Return to Sign In</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-6 sm:p-7 space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gold mb-2">
                <ShieldCheck size={14} />
                Account Onboarding
              </div>
              <h1 className="font-display text-2xl">Set Your Password</h1>
              <p className="text-sm text-mute mt-1">
                Complete your ForensiTrack account setup to access your workspace.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface px-4 py-3 text-xs space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-mute">Name</span>
                <span className="text-ink font-medium">{inviteUser.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-mute">Email</span>
                <span className="font-mono text-ink">{inviteUser.email}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-mute">Assigned Role</span>
                <span className="text-gold font-medium">{inviteUser.role === 'administrator' ? 'Administrator' : 'Investigator'}</span>
              </div>
            </div>

            {formError && (
              <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <Field label="New Password">
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    maxLength={128}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pr-10"
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center text-mute hover:text-ink"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm Password">
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    maxLength={128}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="pr-10"
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center text-mute hover:text-ink"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <ul className="space-y-1.5 rounded-lg border border-line bg-well/40 px-3.5 py-2.5 text-xs">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li key={rule.label} className={ok ? 'flex items-center gap-2 text-ok' : 'flex items-center gap-2 text-mute'}>
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>{rule.label}</span>
                    </li>
                  )
                })}
              </ul>

              <Button type="submit" variant="primary" className="w-full flex items-center justify-center gap-2" disabled={submitting}>
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Completing Setup…' : 'Set Password & Continue'}
              </Button>
            </form>

            <div className="pt-2 border-t border-line flex justify-between items-center text-xs text-mute">
              <span>Not {inviteUser.email}?</span>
              <button
                type="button"
                onClick={() => void supabase.auth.signOut().then(() => nav('/login'))}
                className="text-gold hover:underline"
              >
                Sign out
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

