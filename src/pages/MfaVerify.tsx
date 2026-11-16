import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input, Logo } from '../components/ui'

export default function MfaVerify() {
  const { me, aal, hasVerifiedMfa, loadingAuth, completeMfaLogin, logout } = useApp()
  const nav = useNavigate()

  const [checking, setChecking] = useState(true)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState<number>(0)

  useEffect(() => {
    let active = true

    const loadFactor = async () => {
      try {
        const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors()
        if (listErr) throw listErr
        const verified = (factorsData?.totp || []).find((f) => f.status === 'verified')
        if (!verified) {
          if (active) nav('/mfa-setup', { replace: true })
          return
        }
        if (active) setFactorId(verified.id)
      } catch (err: any) {
        if (active) setError(err?.message || 'Unable to load MFA factor.')
      } finally {
        if (active) setChecking(false)
      }
    }

    if (!loadingAuth && me && me.onboardingStatus !== 'invited') {
      void loadFactor()
    } else if (!loadingAuth) {
      setChecking(false)
    }

    return () => {
      active = false
    }
  }, [loadingAuth, me, nav])

  if (!loadingAuth && !me) return <Navigate to="/login" replace />
  if (!loadingAuth && me?.onboardingStatus === 'invited') return <Navigate to="/accept-invite" replace />
  if (!loadingAuth && aal === 'aal2' && me?.onboardingStatus === 'completed') return <Navigate to="/" replace />
  if (!loadingAuth && !checking && !hasVerifiedMfa && !factorId) return <Navigate to="/mfa-setup" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const now = Date.now()
    if (now < cooldownUntil) {
      const secs = Math.ceil((cooldownUntil - now) / 1000)
      return setError(`Too many invalid attempts. Please wait ${secs}s before trying again.`)
    }

    const cleanCode = code.replace(/\D/g, '')
    if (cleanCode.length !== 6) {
      return setError('Enter the 6-digit verification code from Google Authenticator.')
    }
    if (!factorId) {
      return setError('No verified authenticator found. Please sign in again.')
    }

    setSubmitting(true)
    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: cleanCode,
      })
      if (verifyErr) {
        const nextAttempts = failedAttempts + 1
        setFailedAttempts(nextAttempts)
        if (nextAttempts >= 5) {
          setCooldownUntil(Date.now() + 30_000)
        }
        setError(verifyErr.message || 'Invalid or expired verification code.')
        return
      }

      await completeMfaLogin('verify')
      nav('/', { replace: true })
    } catch (err: any) {
      setError(err?.detail || err?.message || 'MFA verification failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelToLogin = async () => {
    await logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        <Card className="p-6 sm:p-7 space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-gold mb-2">
              <ShieldCheck size={14} />
              Two-Factor Authentication
            </div>
            <h1 className="font-display text-2xl">Verify Your Identity</h1>
            <p className="text-sm text-mute mt-1">
              Enter the 6-digit code from Google Authenticator to continue to ForensiTrack.
            </p>
          </div>

          {checking ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-gold mx-auto" />
              <p className="text-sm text-mute">Checking authenticator status…</p>
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <Field label="6-Digit Authenticator Code">
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="font-mono text-center text-lg tracking-[0.35em]"
                    disabled={submitting || !factorId}
                    autoFocus
                  />
                </Field>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={submitting || !factorId}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Verifying…' : 'Verify & Sign In'}
                </Button>
              </form>
            </>
          )}

          <div className="pt-2 border-t border-line text-center">
            <button
              type="button"
              onClick={() => void cancelToLogin()}
              className="text-xs text-mute hover:text-gold transition-colors"
            >
              Cancel and return to Sign In
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

