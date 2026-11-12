import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AuditEntry, Case, CaseStatus, CustodyRecord, Evidence, Note, Role, User, Verification } from '../lib/types'
import { checkUserChange } from '../lib/userRules'
import { api, type CaseItem, type EvidenceItem } from '../services/api'
import { supabase } from '../lib/supabase'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

interface Perm {
  ok: boolean
  reason: string
}

interface RegisterInput {
  caseId: string
  file: File
  hash: string
  description: string
  source: string
  collectorId: string
  collectedAt: string
}

interface Ctx {
  users: User[]
  cases: Case[]
  evidence: Evidence[]
  custody: CustodyRecord[]
  verifications: Verification[]
  notes: Note[]
  audit: AuditEntry[]
  me: User | null
  isAdmin: boolean
  loadingAuth: boolean
  loadingCases: boolean
  loadingUsers: boolean
  loadingEvidence: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refreshCases: () => Promise<void>
  refreshUsers: () => Promise<void>
  refreshAudit: () => Promise<void>
  refreshEvidenceCustody: (evidenceId: string) => Promise<void>
  refreshEvidenceVerifications: (evidenceId: string) => Promise<void>
  user: (id: string | null) => User | undefined
  userName: (id: string | null) => string
  canAccessCase: (caseId: string) => boolean
  visibleCases: Case[]
  visibleEvidence: Evidence[]
  visibleAudit: AuditEntry[]
  createCase: (c: { case_number?: string; title: string; description: string; investigatorId?: string; status?: CaseStatus }) => Promise<Case>
  updateCase: (id: string, patch: Partial<Case>, detail?: string) => Promise<void>
  addNote: (caseId: string, content: string) => Promise<void>
  registerEvidence: (i: RegisterInput) => Promise<Evidence>
  verifyEvidence: (evidenceId: string, method: Verification['method'], filename: string, calculatedHash: string) => Promise<Verification>
  getEvidenceFile: (evidenceId: string) => File | undefined
  logEvidenceAccess: (evidenceId: string, kind: 'viewed' | 'downloaded') => void
  transferPermission: (e: Evidence) => Perm
  transferCustody: (evidenceId: string, toId: string, reason: string, remarks: string) => Promise<void>
  saveUser: (u: Partial<User> & { name: string; email: string; role: Role; status: User['status'] }) => Promise<{ ok: boolean; error?: string }>
  renameMe: (name: string, email?: string) => Promise<void>
  toasts: Toast[]
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

const g = globalThis as { __forensiTrackCtx?: React.Context<Ctx | null> }
const AppCtx = (g.__forensiTrackCtx ??= createContext<Ctx | null>(null))
export const useApp = () => {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}

let uid = 1

function mapCaseItem(item: CaseItem): Case {
  return {
    id: item.id,
    caseNumber: item.case_number,
    title: item.title,
    description: item.description || '',
    status: item.status as CaseStatus,
    investigatorId: item.investigator_id ?? undefined,
    created: item.created_at,
    updated: item.updated_at,
  }
}

function normalizeFileType(mime?: string | null): Evidence['type'] {
  if (!mime) return 'Other'
  if (mime === 'Image' || mime === 'Document' || mime === 'Video' || mime === 'Audio' || mime === 'Other') return mime
  const lower = mime.toLowerCase()
  if (lower.startsWith('image/') || lower.includes('image')) return 'Image'
  if (lower.startsWith('video/') || lower.includes('video')) return 'Video'
  if (lower.startsWith('audio/') || lower.includes('audio')) return 'Audio'
  if (lower.includes('pdf') || lower.startsWith('text/') || lower.includes('document') || lower.includes('word') || lower.includes('msword') || lower.includes('officedocument')) return 'Document'
  return 'Other'
}

function mapEvidenceItem(res: EvidenceItem): Evidence {
  const rawDesc = res.source_description || ''
  const sepIdx = rawDesc.indexOf(' — ')
  const source = sepIdx !== -1 ? rawDesc.slice(0, sepIdx) : rawDesc
  const description = sepIdx !== -1 ? rawDesc.slice(sepIdx + 3) : ''

  return {
    id: res.id,
    caseId: res.case_id,
    evidenceNumber: res.evidence_number,
    filename: res.original_filename,
    type: normalizeFileType(res.file_type),
    size: res.file_size ?? 0,
    description,
    source,
    collectorId: res.collected_by,
    collectedAt: res.collected_at,
    registeredAt: res.created_at,
    custodianId: res.current_custodian,
    hash: res.sha256_hash,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [custody, setCustody] = useState<CustodyRecord[]>([])
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [files] = useState<Record<string, File>>({})
  const [me, setMe] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingCases, setLoadingCases] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingEvidence, setLoadingEvidence] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const isLoggingIn = useRef(false)

  const isAdmin = me?.role === 'admin'

  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = uid++
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  const user = (id: string | null) => users.find((u) => u.id === id)
  const userName = (id: string | null) => {
    if (!id) return 'None'
    if (me && me.id === id) return me.name
    return user(id)?.name ?? id
  }

  const canAccessCase = (caseId: string) => {
    if (!me) return false
    if (isAdmin) return true
    return cases.some((c) => c.id === caseId)
  }

  const visibleCases = cases
  const visibleEvidence = evidence
  const visibleAudit = audit

  // Fetch real cases from FastAPI
  const refreshCases = useCallback(async () => {
    try {
      setLoadingCases(true)
      const res = await api.cases.list()
      const formatted = (res.items || []).map(mapCaseItem)
      setCases(formatted)
    } catch (err: any) {
      console.error('Failed to load cases:', err)
      toast(err.detail || 'Failed to retrieve cases from backend', 'error')
    } finally {
      setLoadingCases(false)
    }
  }, [toast])

  // Fetch real users from FastAPI (administrators can list all users; investigators see themselves)
  const refreshUsers = useCallback(async () => {
    try {
      setLoadingUsers(true)
      const res = await api.users.list()
      const mapped: User[] = (res.items || []).map((u) => ({
        id: u.id,
        name: u.full_name,
        email: u.email || '',
        role: u.role === 'administrator' ? 'admin' : 'investigator',
        status: u.is_active ? 'Active' : 'Inactive',
        created: u.created_at,
      }))
      setUsers(mapped)
    } catch {
      // If forbidden (e.g. investigator role), keep me in users
      if (me) {
        setUsers([me])
      }
    } finally {
      setLoadingUsers(false)
    }
  }, [me])

  const refreshEvidence = useCallback(async () => {
    try {
      setLoadingEvidence(true)
      const res = await api.evidence.list({ limit: 100 })
      setEvidence((res.items || []).map(mapEvidenceItem))
    } catch {
      // Keep existing evidence if fetch fails
    } finally {
      setLoadingEvidence(false)
    }
  }, [])

  const refreshAudit = useCallback(async () => {
    if (!me || me.role !== 'admin') return
    try {
      const res = await api.audit.list({ limit: 200 })
      const mapped: AuditEntry[] = (res.items || []).map((a) => {
        const detailEntries = Object.entries(a.details || {})
        const detailText = detailEntries.length
          ? detailEntries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · ')
          : '—'
        return {
          id: a.id,
          at: a.created_at,
          userId: a.actor_name || a.actor_id,
          action: a.action,
          recordType: a.entity_type,
          recordId: a.entity_id || '—',
          details: detailText,
          rawDetails: a.details || {},
        }
      })
      setAudit(mapped)
    } catch {
      // Ignore if not admin
    }
  }, [me])

  // Restore authenticated session on mount and load profile
  const initUserSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMe(null)
        setLoadingAuth(false)
        return
      }

      const profile = await api.auth.getMe(session.access_token)
      if (!profile.is_active) {
        await supabase.auth.signOut().catch(() => {})
        setMe(null)
        setLoadingAuth(false)
        toast('Account is inactive. Please contact an administrator.', 'error')
        return
      }

      const currentUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: session.user.email || '',
        role: profile.role === 'administrator' ? 'admin' : 'investigator',
        status: profile.is_active ? 'Active' : 'Inactive',
        created: profile.created_at,
      }
      setMe(currentUser)
    } catch (err: any) {
      console.warn('Session initialization error:', err)
      setMe(null)
    } finally {
      setLoadingAuth(false)
    }
  }, [toast])

  useEffect(() => {
    initUserSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setMe(null)
        setCases([])
        setUsers([])
        setEvidence([])
        setCustody([])
        setVerifications([])
        setNotes([])
        setAudit([])
      } else if (event === 'TOKEN_REFRESHED') {
        initUserSession()
      } else if (event === 'SIGNED_IN') {
        if (!isLoggingIn.current) {
          initUserSession()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initUserSession])

  // Load cases, users, evidence, and audit logs whenever user profile is authenticated
  useEffect(() => {
    if (me) {
      refreshCases()
      refreshUsers()
      refreshEvidence()
      if (me.role === 'admin') {
        refreshAudit()
      }
    }
  }, [me, refreshCases, refreshUsers, refreshEvidence, refreshAudit])

  const login = async (email: string, pass: string): Promise<{ ok: boolean; error?: string }> => {
    isLoggingIn.current = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      })
      if (error) {
        return { ok: false, error: error.message || 'Invalid email or password' }
      }
      if (!data.session) {
        return { ok: false, error: 'Failed to establish an authenticated session' }
      }

      // Verify profile and active status through FastAPI using fresh token
      let profile
      try {
        profile = await api.auth.getMe(data.session.access_token)
      } catch (beErr: any) {
        console.error('FastAPI profile error during login:', beErr)
        await supabase.auth.signOut().catch(() => {})
        return {
          ok: false,
          error: beErr.detail || beErr.message || 'Backend server unavailable. Please make sure FastAPI is running at http://127.0.0.1:8000',
        }
      }

      if (!profile.is_active) {
        await supabase.auth.signOut().catch(() => {})
        return { ok: false, error: 'Your account is deactivated. Contact an administrator.' }
      }

      const currentUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: data.session.user.email || email,
        role: profile.role === 'administrator' ? 'admin' : 'investigator',
        status: profile.is_active ? 'Active' : 'Inactive',
        created: profile.created_at,
      }
      setMe(currentUser)
      await api.auth.logEvent('USER_LOGIN').catch(() => {})
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.detail || err.message || 'Authentication failed' }
    } finally {
      isLoggingIn.current = false
    }
  }

  const logout = async () => {
    await api.auth.logEvent('USER_LOGOUT').catch(() => {})
    await supabase.auth.signOut()
    setMe(null)
    setCases([])
    setUsers([])
  }

  const createCase = async (c: { case_number?: string; title: string; description: string; investigatorId?: string; status?: CaseStatus }): Promise<Case> => {
    const maxCaseNum = cases.reduce((max, item) => {
      const match = (item.caseNumber || '').match(/^CASE-(\d+)$/i)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    const caseNumber = c.case_number || `CASE-${String(maxCaseNum + 1).padStart(3, '0')}`
    const created = await api.cases.create({
      case_number: caseNumber,
      title: c.title,
      description: c.description,
    })

    let assignedId: string | undefined
    if (c.investigatorId) {
      try {
        await api.cases.assignInvestigator(created.id, c.investigatorId)
        assignedId = c.investigatorId
      } catch (err: any) {
        console.warn('Investigator assignment failed:', err)
        toast(err?.detail || err?.message || 'Case created, but investigator assignment failed', 'error')
      }
    }

    const formatted = { ...mapCaseItem(created), investigatorId: assignedId }
    setCases((prev) => [formatted, ...prev])
    await refreshAudit()
    return formatted
  }

  const updateCase = async (id: string, patch: Partial<Case>, _detail?: string): Promise<void> => {
    const existing = cases.find((c) => c.id === id)
    if (patch.title !== undefined || patch.description !== undefined) {
      await api.cases.update(id, {
        title: patch.title,
        description: patch.description,
      })
    }
    if (patch.status) {
      const normStatus = patch.status.toLowerCase().replace(' ', '_') as 'open' | 'in_progress' | 'closed'
      if (['open', 'in_progress', 'closed'].includes(normStatus)) {
        await api.cases.updateStatus(id, normStatus)
      }
    }
    if (patch.investigatorId !== undefined && patch.investigatorId !== existing?.investigatorId) {
      if (existing?.investigatorId) {
        await api.cases.unassignInvestigator(id, existing.investigatorId).catch(() => {})
      }
      if (patch.investigatorId) {
        await api.cases.assignInvestigator(id, patch.investigatorId)
      }
    }
    await refreshCases()
    await refreshAudit()
  }

  const addNote = async (caseId: string, content: string): Promise<void> => {
    const note = await api.cases.addNote(caseId, content)
    setNotes((prev) => [
      ...prev,
      {
        id: note.id,
        caseId: note.case_id,
        authorId: note.author_id,
        at: note.created_at,
        content: note.content,
      },
    ])
  }

  const registerEvidence = async (i: RegisterInput): Promise<Evidence> => {
    const maxEvNum = evidence.reduce((max, item) => {
      const match = (item.evidenceNumber || '').match(/^EV-(\d+)$/i)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    const evidenceNumber = `EV-${String(maxEvNum + 1).padStart(3, '0')}`
    const combinedSourceDesc = [i.source.trim(), i.description.trim()].filter(Boolean).join(' — ')

    const formData = new FormData()
    formData.append('case_id', i.caseId)
    formData.append('evidence_number', evidenceNumber)
    formData.append('collected_by', i.collectorId || me!.id)
    formData.append('collected_at', i.collectedAt || new Date().toISOString())
    formData.append('source_description', combinedSourceDesc)
    formData.append('file', i.file)

    const res = await api.evidence.register(formData)
    const ev = mapEvidenceItem(res)
    setEvidence((l) => [ev, ...l])
    await refreshAudit()
    return ev
  }

  const verifyEvidence = async (evidenceId: string, method: Verification['method'], filename: string, calculatedHash: string): Promise<Verification> => {
    const res = await api.evidence.verifyStored(evidenceId)
    const v: Verification = {
      id: res.id,
      evidenceId: res.evidence_id,
      at: res.verified_at,
      userId: res.verified_by,
      registeredHash: res.expected_hash,
      comparisonHash: res.calculated_hash,
      filename,
      method,
      result: res.is_valid ? 'Match' : 'Mismatch',
    }
    setVerifications((l) => [v, ...l])
    return v
  }

  const getEvidenceFile = (evidenceId: string) => files[evidenceId]

  const logEvidenceAccess = (_evidenceId: string, _kind: 'viewed' | 'downloaded') => {
    // Audit events are logged securely server-side by FastAPI
  }

  const refreshEvidenceCustody = useCallback(async (evidenceId: string) => {
    try {
      const transfers = await api.custody.getEvidenceCustody(evidenceId)
      const mapped: CustodyRecord[] = (transfers || []).map((t) => ({
        id: t.id,
        evidenceId: t.evidence_id,
        fromId: t.from_custodian,
        toId: t.to_custodian,
        at: t.transferred_at,
        reason: t.transfer_reason,
        remarks: t.transferred_by_name ? `Authorized by ${t.transferred_by_name}` : '',
      }))
      setCustody((prev) => [...prev.filter((c) => c.evidenceId !== evidenceId), ...mapped])
    } catch {
      // Ignore
    }
  }, [])

  const refreshEvidenceVerifications = useCallback(async (evidenceId: string) => {
    try {
      const items = await api.evidence.getVerificationHistory(evidenceId)
      const mapped: Verification[] = (items || []).map((v: any) => ({
        id: v.id,
        evidenceId: v.evidence_id,
        at: v.verified_at,
        userId: v.verified_by,
        registeredHash: v.registered_hash ?? v.expected_hash ?? '',
        comparisonHash: v.computed_hash ?? v.calculated_hash ?? '',
        filename: '',
        method: v.verification_method === 'upload' ? 'Uploaded File' : 'Stored File',
        result: v.is_match ?? v.is_valid ? 'Match' : 'Mismatch',
      }))
      setVerifications((prev) => [...prev.filter((v) => v.evidenceId !== evidenceId), ...mapped])
    } catch {
      // Ignore
    }
  }, [])

  const transferPermission = (e: Evidence): Perm => {
    if (!me) return { ok: false, reason: 'Not signed in.' }
    if (!canAccessCase(e.caseId)) return { ok: false, reason: 'You do not have access to this case.' }
    if (e.custodianId === me.id) return { ok: true, reason: '' }
    const cust = user(e.custodianId)
    const custodianName = cust?.name || userName(e.custodianId)
    if (isAdmin && cust?.status === 'Inactive') return { ok: true, reason: '' }
    if (isAdmin) return { ok: false, reason: `Administrators may transfer only evidence they hold or evidence held by an inactive account. Current custodian: ${custodianName}.` }
    return { ok: false, reason: `Only the current custodian (${custodianName}) can transfer this evidence.` }
  }

  const transferCustody = async (evidenceId: string, toId: string, reason: string, remarks: string): Promise<void> => {
    await api.custody.transfer({
      evidence_id: evidenceId,
      to_custodian: toId,
      transfer_reason: remarks.trim() ? `${reason.trim()} — ${remarks.trim()}` : reason.trim(),
    })
    setEvidence((l) => l.map((e) => (e.id === evidenceId ? { ...e, custodianId: toId } : e)))
    await refreshEvidenceCustody(evidenceId)
    await refreshAudit()
  }

  const saveUser = async (u: Partial<User> & { name: string; email: string; role: Role; status: User['status'] }): Promise<{ ok: boolean; error?: string }> => {
    try {
      if (u.id) {
        const prev = users.find((x) => x.id === u.id)
        const chk = checkUserChange(users, me?.id ?? null, prev, u)
        if (chk.error) return { ok: false, error: chk.error }

        await api.users.update(u.id, {
          full_name: u.name,
          role: u.role === 'admin' ? 'administrator' : 'investigator',
        })
        if (prev && prev.status !== u.status) {
          await api.users.updateStatus(u.id, u.status === 'Active')
        }
      } else {
        await api.users.create({
          email: u.email,
          full_name: u.name,
          role: u.role === 'admin' ? 'administrator' : 'investigator',
        })
      }
      await refreshUsers()
      await refreshAudit()
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.detail || err?.message || 'Failed to save user' }
    }
  }

  const renameMe = async (name: string, email?: string): Promise<void> => {
    await api.users.updateProfileMe({ full_name: name, ...(email ? { email } : {}) })
    if (me) {
      setMe({ ...me, name, ...(email ? { email } : {}) })
    }
    await refreshUsers()
    await refreshAudit()
  }

  const value: Ctx = {
    users,
    cases,
    evidence,
    custody,
    verifications,
    notes,
    audit,
    me,
    isAdmin: !!isAdmin,
    loadingAuth,
    loadingCases,
    loadingUsers,
    loadingEvidence,
    login,
    logout,
    refreshCases,
    refreshUsers,
    refreshAudit,
    refreshEvidenceCustody,
    refreshEvidenceVerifications,
    user,
    userName,
    canAccessCase,
    visibleCases,
    visibleEvidence,
    visibleAudit,
    createCase,
    updateCase,
    addNote,
    registerEvidence,
    verifyEvidence,
    getEvidenceFile,
    logEvidenceAccess,
    transferPermission,
    transferCustody,
    saveUser,
    renameMe,
    toasts,
    toast,
    dismissToast,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
