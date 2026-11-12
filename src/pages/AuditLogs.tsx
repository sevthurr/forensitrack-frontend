import { useEffect, useMemo, useState } from 'react'
import { FilterX, RefreshCw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Badge, Button, DataTable, Drawer, Field, FilterSelect, Input, MetaCard, Mono, PageHeader, SearchInput } from '../components/ui'
import { fmtDT } from '../lib/utils'
import type { AuditEntry } from '../lib/types'

const ACTION_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'security', label: 'Authentication & Security' },
  { value: 'case', label: 'Case Management' },
  { value: 'evidence', label: 'Evidence & Files' },
  { value: 'verification', label: 'Integrity Verification' },
  { value: 'custody', label: 'Chain of Custody' },
  { value: 'user', label: 'User & Profile' },
]

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: 'User Signed In',
  USER_LOGOUT: 'User Signed Out',
  PASSWORD_CHANGED: 'Password Changed',
  CASE_CREATED: 'Case Created',
  CASE_UPDATED: 'Case Updated',
  CASE_STATUS_CHANGED: 'Case Status Changed',
  INVESTIGATOR_ASSIGNED: 'Investigator Assigned',
  INVESTIGATOR_UNASSIGNED: 'Investigator Unassigned',
  CASE_NOTE_ADDED: 'Case Note Added',
  EVIDENCE_REGISTERED: 'Evidence Registered',
  EVIDENCE_PREVIEWED: 'Evidence Previewed',
  EVIDENCE_DOWNLOADED: 'Evidence Downloaded',
  EVIDENCE_VERIFIED_STORED: 'Evidence Verified (Stored)',
  EVIDENCE_VERIFIED_UPLOAD: 'Evidence Verified (Upload)',
  CUSTODY_TRANSFER: 'Custody Transferred',
  USER_CREATED: 'User Created',
  USER_UPDATED: 'User Updated',
  USER_STATUS_CHANGED: 'User Status Changed',
  PROFILE_UPDATED: 'Profile Updated',
}

function getActionCategory(action: string, recordType?: string): string {
  const a = action.toUpperCase()
  const rt = (recordType || '').toUpperCase()
  if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('PASSWORD') || rt === 'AUTH') return 'security'
  if (a.includes('VERIF')) return 'verification'
  if (a.includes('CUSTODY')) return 'custody'
  if (a.includes('EVIDENCE')) return 'evidence'
  if (a.includes('CASE') || a.includes('INVESTIGATOR')) return 'case'
  if (a.includes('USER') || a.includes('PROFILE')) return 'user'
  return 'other'
}

function formatAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function formatDetailKey(key: string): string {
  const known: Record<string, string> = {
    sha256_hash: 'SHA-256 Hash',
    case_id: 'Case ID',
    evidence_id: 'Evidence ID',
    investigator_id: 'Investigator ID',
    collector_id: 'Collector ID',
    custodian_id: 'Custodian ID',
    user_id: 'User ID',
  }
  if (known[key]) return known[key]
  return key
    .split('_')
    .map((w) => (w.toLowerCase() === 'id' ? 'ID' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
}

function actionTone(action: string, recordType?: string): 'bad' | 'ok' | 'gold' | 'neutral' {
  if (action.includes('MISMATCH')) return 'bad'
  if (action.includes('VERIFIED')) return 'ok'
  if (getActionCategory(action, recordType) === 'security') return 'gold'
  return 'neutral'
}

export default function AuditLogs() {
  const { visibleAudit, refreshAudit, userName } = useApp()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  useEffect(() => {
    void refreshAudit()
  }, [refreshAudit])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshAudit()
    setRefreshing(false)
  }

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    return visibleAudit.filter((a) => {
      if (category && getActionCategory(a.action, a.recordType) !== category) return false
      if (from && a.at.slice(0, 10) < from) return false
      if (to && a.at.slice(0, 10) > to) return false
      if (!query) return true
      const actor = userName(a.userId).toLowerCase()
      const actionLabel = formatAction(a.action).toLowerCase()
      const searchable = `${a.id} ${a.recordId} ${a.action} ${actionLabel} ${actor} ${a.recordType} ${a.details}`.toLowerCase()
      return searchable.includes(query)
    })
  }, [visibleAudit, q, category, from, to, userName])

  const dirty = q || category || from || to
  const clear = () => {
    setQ('')
    setCategory('')
    setFrom('')
    setTo('')
  }

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Read-only record of system activity. Entries cannot be edited or deleted."
        actions={
          <Button size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />
      <div className="flex flex-col gap-3 mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <SearchInput value={q} onChange={setQ} placeholder="Search by user, action, or ID…" />
          <FilterSelect label="All actions" value={category} onChange={setCategory} options={ACTION_CATEGORY_OPTIONS} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" /></Field>
          <Button onClick={clear} disabled={!dirty}><FilterX size={15} />Clear filters</Button>
        </div>
      </div>
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        pageSize={10}
        onRowClick={(a) => setSelected(a)}
        columns={[
          { key: 't', header: 'Timestamp', cell: (a) => <Mono>{fmtDT(a.at)}</Mono> },
          { key: 'u', header: 'User', cell: (a) => userName(a.userId) },
          {
            key: 'a',
            header: 'Action',
            cell: (a) => (
              <Badge tone={actionTone(a.action, a.recordType)}>
                {formatAction(a.action)}
              </Badge>
            ),
          },
          { key: 'rt', header: 'Record Type', hide: 'lg', cell: (a) => a.recordType },
          { key: 'ri', header: 'Record ID', hide: 'sm', cell: (a) => <Mono>{a.recordId}</Mono> },
          { key: 'd', header: 'Details', hide: 'md', cell: (a) => <span className="block max-w-[340px] truncate text-mute" title={a.details}>{a.details}</span> },
        ]}
      />
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Audit Log Details"
        description={selected ? `${formatAction(selected.action)} · ${fmtDT(selected.at)}` : undefined}
        wide
      >
        {selected && (
          <div className="space-y-5">
            <MetaCard
              cols={2}
              items={[
                { label: 'Log ID', value: selected.id, mono: true },
                { label: 'Timestamp', value: fmtDT(selected.at), mono: true },
                { label: 'User / Actor', value: userName(selected.userId) },
                {
                  label: 'Action',
                  value: (
                    <Badge tone={actionTone(selected.action, selected.recordType)}>
                      {formatAction(selected.action)}
                    </Badge>
                  ),
                },
                { label: 'Record Type', value: selected.recordType || '—' },
                { label: 'Record ID', value: selected.recordId || '—', mono: true },
              ]}
            />
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-mute mb-2">
                Event Details
              </div>
              {selected.rawDetails && Object.keys(selected.rawDetails).length > 0 ? (
                <div className="rounded-lg border border-line bg-well/40 divide-y divide-line">
                  {Object.entries(selected.rawDetails).map(([key, val]) => {
                    const display =
                      val === null || val === undefined || val === ''
                        ? '—'
                        : typeof val === 'object'
                        ? JSON.stringify(val, null, 2)
                        : String(val)
                    const isMono = key.includes('id') || key.includes('hash') || key.includes('number') || key === 'ip'
                    return (
                      <div key={key} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 px-3.5 py-2.5 text-sm">
                        <div className="text-xs font-medium text-mute">{formatDetailKey(key)}</div>
                        <div className={isMono ? 'font-mono text-xs text-ink break-all whitespace-pre-wrap' : 'text-ink break-words whitespace-pre-wrap'}>
                          {display}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-line bg-well/40 px-3.5 py-3 text-sm text-mute">
                  No additional event details recorded.
                </div>
              )}
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
