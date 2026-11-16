import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AlertCircle, Check, Copy, Loader2, ShieldCheck } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { supabase } from '../lib/supabase'
import { Button, Card, Field, Input, Logo } from '../components/ui'

type EnrollmentResult =
  | { kind: 'redirect'; to: string }
  | { kind: 'enrolled'; factorId: string; qrCode: string; secret: string }
  | { kind: 'none' }

export default function MfaSetup() {
  const { me, aal, hasVerifiedMfa, loadingAuth, completeMfaLogin, logout, toast } = useApp()
  const nav = useNavigate()

  const [initializing, setInitializing] = useState(true)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enrollmentPromiseRef = useRef<Promise<EnrollmentResult> | null>(null)

  useEffect(() => {
    let active = true

    const runEnrollment = async (): Promise<EnrollmentResult> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { kind: 'none' }

      const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors()
      if (listErr) throw listErr

      const allFactors = factorsData?.all || []
      const verified = (factorsData?.totp || []).find((f) => f.status === 'verified')
      if (verified) {
        return { kind: 'redirect', to: '/mfa-verify' }
      }

      // `factorsData.totp` only contains verified factors; unverified factors live in `factorsData.all`.
      for (const unverified of allFactors.filter(
        (f) => f.factor_type === 'totp' && f.status !== 'verified'
      )) {
        const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: unverified.id })
        if (unenrollErr) throw unenrollErr
      }

      const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'ForensiTrack',
        friendlyName: 'ForensiTrack',
      })
      if (enrollErr) throw enrollErr

      return {
        kind: 'enrolled',
        factorId: enrollData.id,
        qrCode: enrollData.totp.qr_code,
        secret: enrollData.totp.secret,
      }
    }

    const initEnrollment = async () => {
      try {
        if (!enrollmentPromiseRef.current) {
          enrollmentPromiseRef.current = runEnrollment().finally(() => {
            enrollmentPromiseRef.current = null
          })
        }
        const result = await enrollmentPromiseRef.current
        if (!active) return

        if (result.kind === 'redirect') {
          nav(result.to, { replace: true })
          return
        }
        if (result.kind === 'enrolled') {
          setFactorId(result.factorId)
          setQrCode(result.qrCode)
          setSecret(result.secret)
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Unable to initialize Google Authenticator enrollment.')
        }
      } finally {
        if (active) setInitializing(false)
      }
    }

    if (!loadingAuth && me && me.onboardingStatus !== 'invited') {
      void initEnrollment()
    } else if (!loadingAuth) {
      setInitializing(false)
    }

    return () => {
      active = false
    }
  }, [loadingAuth, me, nav])

  if (!loadingAuth && !me) return <Navigate to="/login" replace />
  if (!loadingAuth && me?.onboardingStatus === 'invited') return <Navigate to="/accept-invite" replace />
  if (!loadingAuth && aal === 'aal2' && me?.onboardingStatus === 'completed') return <Navigate to="/" replace />
  if (!loadingAuth && hasVerifiedMfa && aal !== 'aal2') return <Navigate to="/mfa-verify" replace />

  const copySecret = async () => {
    if (!secret) return
    await navigator.clipboard.writeText(secret).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleanCode = code.replace(/\D/g, '')
    if (cleanCode.length !== 6) {
      return setError('Enter the 6-digit verification code from Google Authenticator.')
    }
    if (!factorId) {
      return setError('MFA enrollment session is missing. Please cancel and sign in again.')
    }

    setSubmitting(true)
    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: cleanCode,
      })
      if (verifyErr) {
        setError(verifyErr.message || 'Invalid or expired verification code. Please try again.')
        return
      }

      await completeMfaLogin('enroll')
      toast('Google Authenticator enabled. Welcome to ForensiTrack.')
      nav('/', { replace: true })
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to verify authenticator code.')
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
              Mandatory Security Setup
            </div>
            <h1 className="font-display text-2xl">Set Up Google Authenticator</h1>
            <p className="text-sm text-mute mt-1">
              Scan the QR code with Google Authenticator, then enter the 6-digit code to activate your session.
            </p>
          </div>

          {initializing ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-gold mx-auto" />
              <p className="text-sm text-mute">Preparing authenticator enrollment…</p>
            </div>
          ) : (
            <>
              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {qrCode && (
                <div className="flex justify-center p-4 rounded-lg bg-white border border-line">
                  <img src={qrCode} alt="Google Authenticator QR Code" className="w-44 h-44" />
                </div>
              )}

              {secret && (
                <div className="rounded-lg border border-line bg-surface p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-mute">Manual setup key</span>
                    <button
                      type="button"
                      onClick={() => void copySecret()}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="font-mono text-xs text-ink break-all select-all">{secret}</p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <Field label="6-Digit Verification Code">
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
                  />
                </Field>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={submitting || !factorId}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Verifying…' : 'Verify and Continue'}
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

