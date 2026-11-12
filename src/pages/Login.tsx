import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, Field, Input, Logo } from '../components/ui'

export default function Login() {
  const { me, login } = useApp()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (me) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    const er: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address'
    if (!password) er.password = 'Password is required'
    setErrors(er)
    if (Object.keys(er).length) return

    setLoading(true)
    const res = await login(email.trim(), password)
    setLoading(false)

    if (!res.ok) {
      setAuthError(res.error || 'Authentication failed. Please verify your credentials.')
    } else {
      nav('/')
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-bg">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-surface border-r border-line relative overflow-hidden">
        <Logo />
        <div className="max-w-md">
          <p className="font-display text-4xl leading-tight">Every artifact accounted for. Every hand-off on record.</p>
          <p className="text-mute mt-4 text-sm leading-relaxed">
            Register digital evidence, track custody, verify integrity and produce case reports from one controlled workspace.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-mute">
            <li className="flex gap-3">
              <ShieldCheck size={18} className="text-gold shrink-0" />
              SHA-256 integrity references per item
            </li>
            <li className="flex gap-3">
              <ShieldCheck size={18} className="text-gold shrink-0" />
              Immutable chain-of-custody timeline
            </li>
            <li className="flex gap-3">
              <ShieldCheck size={18} className="text-gold shrink-0" />
              Read-only audit trail of every action
            </li>
          </ul>
        </div>
        <p className="font-mono text-xs text-mute/60">Digital Evidence Management System</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>
          <h1 className="font-display text-3xl">Sign in</h1>
          <p className="text-sm text-mute mt-1 mb-6">ForensiTrack — Digital Evidence Management System</p>

          {authError && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                value={email}
                maxLength={254}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@forensitrack.com"
                autoComplete="email"
                disabled={loading}
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={password}
                  maxLength={128}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center text-mute hover:text-ink"
                  tabIndex={-1}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Button type="submit" variant="primary" className="w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
