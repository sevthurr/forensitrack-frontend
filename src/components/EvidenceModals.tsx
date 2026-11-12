import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, Upload, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import type { Case, Evidence } from '../lib/types'
import { Button, Field, Input, Loading, Modal, ModalActions, Select, Textarea } from './ui'
import { cn, fmtSize, nowLocalInput } from '../lib/utils'
import { sha256Hex } from '../lib/sha256'

const toSentenceCase = (v: string) =>
  v.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, ch) => prefix + ch.toUpperCase())

function shortCaseId(c: Case): string {
  return c.caseNumber || `CASE-${c.id.slice(0, 6).toUpperCase()}`
}

export function RegisterEvidenceModal({ open, onClose, fixedCaseId }: { open: boolean; onClose: () => void; fixedCaseId?: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Register Evidence" description="The SHA-256 hash is calculated from the selected file and recorded with the evidence." wide>
      <RegisterForm onClose={onClose} fixedCaseId={fixedCaseId} />
    </Modal>
  )
}

function RegisterForm({ onClose, fixedCaseId }: { onClose: () => void; fixedCaseId?: string }) {
  const { visibleCases, users, me, userName, registerEvidence, toast } = useApp()
  const [caseId, setCaseId] = useState(fixedCaseId ?? '')
  const [caseSearch, setCaseSearch] = useState('')
  const [caseOpen, setCaseOpen] = useState(false)
  const caseBoxRef = useRef<HTMLDivElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('')
  const [collectorId, setCollectorId] = useState(me!.id)
  const [collectedAt, setCollectedAt] = useState(nowLocalInput())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [hash, setHash] = useState('')
  const [hashing, setHashing] = useState(false)
  const [hashError, setHashError] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!caseOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (caseBoxRef.current && !caseBoxRef.current.contains(e.target as Node)) {
        setCaseOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [caseOpen])

  const formatCaseOption = (c: Case) => {
    const inv = c.investigatorId ? userName(c.investigatorId) : 'Unassigned'
    return `${shortCaseId(c)} - ${c.title} - ${inv}`
  }

  const selectedCase = visibleCases.find((c) => c.id === caseId)
  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return visibleCases
    return visibleCases.filter((c) => {
      const inv = c.investigatorId ? userName(c.investigatorId) : 'Unassigned'
      const haystack = `${shortCaseId(c)} ${c.id} ${c.title} ${inv}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [visibleCases, caseSearch, userName])

  const pick = async (f: File | null) => {
    setFile(f)
    setHash('')
    setHashError('')
    if (!f) return
    setHashing(true)
    try {
      const h = await sha256Hex(f)
      setHash(h)
    } catch {
      setHashError('The SHA-256 hash could not be calculated for this file. Registration is not possible.')
    } finally {
      setHashing(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!caseId) er.caseId = 'Select a case'
    if (!file) er.file = 'Choose a file'
    else if (hashing) er.file = 'Hash calculation is still in progress'
    else if (!hash) er.file = hashError || 'The SHA-256 hash is required'
    if (!description.trim()) er.description = 'Description is required'
    if (!source.trim()) er.source = 'Source is required'
    if (!collectedAt) er.collectedAt = 'Collection time is required'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const isoCollectedAt = new Date(collectedAt).toISOString()
      const ev = await registerEvidence({ caseId, file: file!, hash, description: description.trim(), source: source.trim(), collectorId, collectedAt: isoCollectedAt })
      toast(`${ev.evidenceNumber || ev.id} registered`)
      onClose()
    } catch (err: any) {
      setErrors({ file: err?.detail || err?.message || 'Failed to register evidence' })
    } finally {
      setBusy(false)
    }
  }

  if (busy) return <Loading label="Registering evidence…" />

  return (
    <form onSubmit={submit} className="space-y-4">
      <div ref={caseBoxRef} className="relative">
        <span className="block text-xs font-medium text-mute mb-1.5">Associated Case</span>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
          <Input
            value={caseOpen ? caseSearch : selectedCase ? formatCaseOption(selectedCase) : ''}
            onFocus={() => {
              if (fixedCaseId) return
              setCaseSearch('')
              setCaseOpen(true)
            }}
            onChange={(e) => {
              if (fixedCaseId) return
              setCaseSearch(e.target.value)
              if (!caseOpen) setCaseOpen(true)
            }}
            placeholder="Search by case ID, title, or assigned investigator…"
            className="pl-9 pr-14"
            maxLength={150}
            disabled={!!fixedCaseId}
          />
          {!fixedCaseId && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {caseId && (
                <button
                  type="button"
                  onClick={() => {
                    setCaseId('')
                    setCaseSearch('')
                  }}
                  aria-label="Clear selected case"
                  className="p-1 text-mute hover:text-ink rounded"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setCaseOpen((o) => !o)}
                aria-label="Toggle case list"
                className="p-1 text-mute hover:text-ink rounded"
              >
                <ChevronDown size={15} className={cn('transition-transform', caseOpen && 'rotate-180')} />
              </button>
            </div>
          )}
        </div>

        {caseOpen && !fixedCaseId && (
          <div className="absolute z-30 mt-1 w-full rounded-lg border border-line bg-panel shadow-2xl max-h-56 overflow-y-auto py-1">
            {filteredCases.length === 0 ? (
              <div className="px-3 py-3 text-xs text-mute text-center">No matching cases found</div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = caseId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCaseId(c.id)
                      setCaseSearch('')
                      setCaseOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left hover:bg-surface transition-colors',
                      isSelected && 'text-gold bg-gold/5',
                    )}
                  >
                    <span className="truncate">{formatCaseOption(c)}</span>
                    {isSelected && <Check size={14} className="text-gold shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        )}
        {errors.caseId && <span className="block text-xs text-bad mt-1">{errors.caseId}</span>}
      </div>

      <Field label="Evidence File" error={errors.file}>
        <input ref={ref} type="file" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => ref.current?.click()} className="w-full rounded-lg border border-dashed border-line bg-surface hover:border-gold/60 px-4 py-5 text-center transition-colors">
          <Upload size={20} className="mx-auto text-gold mb-1.5" />
          {file ? (
            <span className="block text-sm"><span className="font-mono text-[13px]">{file.name}</span> <span className="text-mute">· {fmtSize(file.size)}</span></span>
          ) : (
            <span className="block text-sm text-mute">Click to choose a file</span>
          )}
        </button>
        {hashing && <span className="block text-xs text-mute mt-1.5">Calculating SHA-256…</span>}
        {hashError && <span className="block text-xs text-bad mt-1.5">{hashError}</span>}
      </Field>
      <Field label="SHA-256 Hash">
        <Input readOnly value={hash} maxLength={64} placeholder="Calculated automatically when a file is selected" className="font-mono text-xs" />
      </Field>
      <Field label="Evidence Description" error={errors.description}>
        <Textarea
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(toSentenceCase(e.target.value))}
          placeholder="What is this item and how was it obtained?"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source" error={errors.source}>
          <Input
            value={source}
            maxLength={250}
            onChange={(e) => setSource(toSentenceCase(e.target.value))}
            placeholder="e.g. Suspect laptop NW-0447"
          />
        </Field>
        <Field label="Collector">
          <Select value={collectorId} onChange={(e) => setCollectorId(e.target.value)}>
            {users.filter((u) => u.status === 'Active').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Collection Date and Time" error={errors.collectedAt}>
        <Input type="datetime-local" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} />
      </Field>
      <ModalActions>
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Register Evidence</Button>
      </ModalActions>
    </form>
  )
}

export function TransferModal({ open, onClose, evidence }: { open: boolean; onClose: () => void; evidence: Evidence }) {
  return (
    <Modal open={open} onClose={onClose} title="Transfer Custody" description="Completed transfers are immutable and recorded in the audit log.">
      <TransferForm evidence={evidence} onClose={onClose} />
    </Modal>
  )
}

function TransferForm({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  const { users, userName, transferCustody, toast } = useApp()
  const [toId, setToId] = useState('')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!toId) er.toId = 'Select a receiving investigator'
    if (!reason.trim()) er.reason = 'Reason is required'
    setErrors(er)
    if (Object.keys(er).length) return
    transferCustody(evidence.id, toId, reason.trim(), remarks.trim())
    toast(`Custody of ${evidence.id} transferred to ${userName(toId)}`)
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Evidence ID"><Input readOnly value={evidence.id} className="font-mono" /></Field>
        <Field label="Current Custodian"><Input readOnly value={userName(evidence.custodianId)} /></Field>
      </div>
      <Field label="Receiving Investigator" error={errors.toId}>
        <Select value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">Select recipient…</option>
          {users.filter((u) => u.status === 'Active' && u.id !== evidence.custodianId).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Administrator' : 'Investigator'})</option>)}
        </Select>
      </Field>
      <Field label="Transfer Reason" error={errors.reason}>
        <Input
          value={reason}
          maxLength={250}
          onChange={(e) => setReason(toSentenceCase(e.target.value))}
          placeholder="e.g. Specialist analysis required"
        />
      </Field>
      <Field label="Remarks">
        <Textarea
          value={remarks}
          maxLength={1000}
          onChange={(e) => setRemarks(toSentenceCase(e.target.value))}
          placeholder="Optional handling notes"
        />
      </Field>
      <ModalActions>
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Confirm Transfer</Button>
      </ModalActions>
    </form>
  )
}
