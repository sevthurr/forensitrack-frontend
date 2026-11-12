import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Check, ChevronDown, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, DataTable, Field, FilterSelect, Input, LinkCell, Modal, ModalActions, PageHeader, SearchInput, StatusBadge, Textarea, Mono } from '../components/ui'
import { cn, fmtD } from '../lib/utils'
import type { Case, CaseStatus } from '../lib/types'

const toTitleCase = (v: string) => v.replace(/\b\w/g, (c) => c.toUpperCase())
const toSentenceCase = (v: string) =>
  v.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, ch) => prefix + ch.toUpperCase())

export const caseStatuses: { value: string; label: string }[] = [
  { value: 'open_all', label: 'All Open (Open & In Progress)' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
]

export function CaseForm({
  initial,
  adminFields,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Case
  adminFields: boolean
  submitLabel: string
  onSubmit: (v: { case_number?: string; title: string; description: string; investigatorId?: string; status?: CaseStatus }) => Promise<void>
  onCancel: () => void
}) {
  const { users, cases } = useApp()
  const investigators = useMemo(
    () => users.filter((u) => u.role === 'investigator' && (u.status === 'Active' || u.id === initial?.investigatorId)),
    [users, initial?.investigatorId],
  )
  const activeCountByInv = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of cases) {
      const s = c.status.toLowerCase()
      if (c.investigatorId && (s === 'open' || s === 'in_progress')) {
        counts[c.investigatorId] = (counts[c.investigatorId] || 0) + 1
      }
    }
    return counts
  }, [cases])

  const [caseNumber, setCaseNumber] = useState(
    initial?.caseNumber || `FT-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, '0')}`
  )
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [investigatorId, setInv] = useState(initial?.investigatorId ?? '')
  const [invSearch, setInvSearch] = useState('')
  const [invOpen, setInvOpen] = useState(false)
  const invBoxRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!invOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (invBoxRef.current && !invBoxRef.current.contains(e.target as Node)) {
        setInvOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [invOpen])

  const selectedInv = investigators.find((u) => u.id === investigatorId)
  const filteredInvestigators = useMemo(() => {
    const q = invSearch.trim().toLowerCase()
    if (!q) return investigators
    return investigators.filter((u) => u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
  }, [investigators, invSearch])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!caseNumber.trim()) er.caseNumber = 'Case number is required'
    if (!title.trim()) er.title = 'Case title is required'
    if (!description.trim()) er.description = 'Description is required'
    setErrors(er)
    if (Object.keys(er).length) return

    try {
      setSubmitting(true)
      await onSubmit({
        case_number: caseNumber.trim(),
        title: title.trim(),
        description: description.trim(),
        investigatorId: investigatorId || undefined,
        status: initial ? initial.status : 'open',
      })
    } catch (err: any) {
      setErrors({ form: err.detail || err.message || 'Failed to save case' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {errors.form && (
        <div className="p-3 rounded-lg border border-bad/30 bg-bad/10 text-bad text-xs">
          {errors.form}
        </div>
      )}

      {adminFields && (
        <Field label="Case Number" error={errors.caseNumber}>
          <Input
            value={caseNumber}
            maxLength={50}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="e.g. FT-2026-001"
            disabled={submitting || !!initial}
          />
        </Field>
      )}

      <Field label="Case Title" error={errors.title}>
        <Input
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(toTitleCase(e.target.value))}
          placeholder="e.g. Insider Data Exfiltration"
          disabled={submitting}
        />
      </Field>

      <Field label="Description" error={errors.description}>
        <Textarea
          value={description}
          maxLength={5000}
          onChange={(e) => setDescription(toSentenceCase(e.target.value))}
          placeholder="Detailed scope and context of the investigation…"
          disabled={submitting}
        />
      </Field>

      {adminFields && (
        <div ref={invBoxRef} className="relative">
          <span className="block text-xs font-medium text-mute mb-1.5">Assigned Investigator</span>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
            <Input
              value={invOpen ? invSearch : selectedInv ? `${selectedInv.name} (${activeCountByInv[selectedInv.id] || 0} active)` : ''}
              onFocus={() => {
                setInvSearch('')
                setInvOpen(true)
              }}
              onChange={(e) => {
                setInvSearch(e.target.value)
                if (!invOpen) setInvOpen(true)
              }}
              placeholder="Unassigned — search investigators by name or email…"
              className="pl-9 pr-14"
              maxLength={150}
              disabled={submitting}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {investigatorId && !submitting && (
                <button
                  type="button"
                  onClick={() => {
                    setInv('')
                    setInvSearch('')
                  }}
                  aria-label="Clear investigator"
                  className="p-1 text-mute hover:text-ink rounded"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setInvOpen((o) => !o)}
                aria-label="Toggle investigator list"
                className="p-1 text-mute hover:text-ink rounded"
                disabled={submitting}
              >
                <ChevronDown size={15} className={cn('transition-transform', invOpen && 'rotate-180')} />
              </button>
            </div>
          </div>

          {invOpen && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-line bg-panel shadow-2xl max-h-56 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  setInv('')
                  setInvSearch('')
                  setInvOpen(false)
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-surface transition-colors',
                  !investigatorId && 'text-gold bg-gold/5',
                )}
              >
                <span>Unassigned</span>
                {!investigatorId && <Check size={14} className="text-gold" />}
              </button>
              {filteredInvestigators.length === 0 ? (
                <div className="px-3 py-3 text-xs text-mute text-center">No matching investigators found</div>
              ) : (
                filteredInvestigators.map((u) => {
                  const count = activeCountByInv[u.id] || 0
                  const isSelected = investigatorId === u.id
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setInv(u.id)
                        setInvSearch('')
                        setInvOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left hover:bg-surface transition-colors',
                        isSelected && 'text-gold bg-gold/5',
                      )}
                    >
                      <span className="truncate font-medium">{u.name}</span>
                      <span className="flex items-center gap-2 shrink-0 text-xs text-mute">
                        <span>{count} {count === 1 ? 'open/in-progress case' : 'open/in-progress cases'}</span>
                        {isSelected && <Check size={14} className="text-gold" />}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
          {errors.investigatorId && <span className="block text-xs text-bad mt-1">{errors.investigatorId}</span>}
        </div>
      )}

      <ModalActions>
        <Button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting} className="flex items-center gap-2">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </ModalActions>
    </form>
  )
}

export default function Cases() {
  const { isAdmin, visibleCases, loadingCases, refreshCases, createCase, toast } = useApp()
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status') || ''
  const qParam = searchParams.get('q') || ''

  const [q, setQ] = useState(qParam)
  const [status, setStatus] = useState(statusParam)
  const [open, setOpen] = useState(false)

  // Sync state if search params change externally (e.g. navigation)
  useEffect(() => {
    setStatus(searchParams.get('status') || '')
    setQ(searchParams.get('q') || '')
  }, [searchParams])

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      if (newStatus) p.set('status', newStatus)
      else p.delete('status')
      return p
    }, { replace: true })
  }

  const handleQueryChange = (newQ: string) => {
    setQ(newQ)
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      if (newQ) p.set('q', newQ)
      else p.delete('q')
      return p
    }, { replace: true })
  }

  const rows = useMemo(() => {
    return visibleCases
      .filter((c) => {
        const matchesStatus = !status
          ? true
          : status === 'open_all'
          ? (c.status.toLowerCase() === 'open' || c.status.toLowerCase() === 'in_progress')
          : c.status.toLowerCase() === status.toLowerCase()
        const query = q.toLowerCase()
        const matchesQuery =
          !q ||
          (c.caseNumber || '').toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
        return matchesStatus && matchesQuery
      })
      .sort((a, b) => b.created.localeCompare(a.created))
  }, [visibleCases, q, status])

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Case Management' : 'My Cases'}
        description={isAdmin ? 'Create, assign and track every investigation.' : 'Investigations assigned to you.'}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => refreshCases()} disabled={loadingCases}>
              <RefreshCw size={14} className={loadingCases ? 'animate-spin' : ''} />
            </Button>
            {isAdmin && (
              <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus size={16} />
                Create Case
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput className="flex-1" value={q} onChange={handleQueryChange} placeholder="Search by case number, title or ID…" />
        <FilterSelect label="All statuses" value={status} onChange={handleStatusChange} options={caseStatuses} />
      </div>

      <DataTable
        loading={loadingCases}
        skeletonRows={5}
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => nav(`/cases/${c.id}`)}
        columns={[
          {
            key: 'id',
            header: 'Case Number',
            cell: (c) => <LinkCell to={`/cases/${c.id}`}>{c.caseNumber || c.id}</LinkCell>,
          },
          {
            key: 't',
            header: 'Case Title',
            cell: (c) => <span className="block max-w-[320px] font-medium">{c.title}</span>,
          },
          {
            key: 's',
            header: 'Status',
            cell: (c) => <StatusBadge status={c.status} />,
          },
          {
            key: 'd',
            header: 'Date Created',
            hide: 'lg',
            cell: (c) => <Mono>{fmtD(c.created)}</Mono>,
          },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Create Case" description="Record a new forensic investigation case in the database.">
        <CaseForm
          adminFields
          submitLabel="Create Case"
          onCancel={() => setOpen(false)}
          onSubmit={async (v) => {
            const c = await createCase(v)
            toast(`Case ${c.caseNumber || c.id} created successfully`)
            setOpen(false)
          }}
        />
      </Modal>
    </>
  )
}
