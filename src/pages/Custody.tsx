import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRightLeft, Lock } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, Card, CustodyTimeline, EmptyState, Field, MetaCard, PageHeader, SearchInput, SectionTitle, Select } from '../components/ui'
import { TransferModal } from '../components/EvidenceModals'

export default function Custody() {
  const { visibleEvidence, custody, userName, transferPermission } = useApp()
  const [params] = useSearchParams()
  const [evId, setEvId] = useState(params.get('evidence') ?? '')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const options = useMemo(() => visibleEvidence.filter((e) => !q || (e.id + e.filename).toLowerCase().includes(q.toLowerCase())), [visibleEvidence, q])
  const ev = visibleEvidence.find((e) => e.id === evId)
  const records = ev ? custody.filter((c) => c.evidenceId === ev.id).sort((a, b) => a.at.localeCompare(b.at)) : []
  const perm = ev ? transferPermission(ev) : { ok: false, reason: '' }

  return (
    <>
      <PageHeader title="Chain of Custody" description="Chronological, immutable record of every hand-off." />
      <Card className="p-5 mb-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Search evidence"><SearchInput value={q} onChange={setQ} placeholder="Evidence ID or filename…" /></Field>
          <Field label="Select evidence">
            <Select value={evId} onChange={(e) => setEvId(e.target.value)}>
              <option value="">Select evidence…</option>
              {options.map((e) => <option key={e.id} value={e.id}>{e.id} — {e.filename}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {ev ? (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="p-5 sm:p-6 xl:col-span-2 h-fit">
            <MetaCard items={[
              { label: 'Evidence ID', value: <Link to={`/evidence/${ev.id}`} className="text-gold hover:underline">{ev.id}</Link>, mono: true },
              { label: 'Filename', value: ev.filename, mono: true },
              { label: 'Associated Case', value: <Link to={`/cases/${ev.caseId}`} className="text-gold hover:underline">{ev.caseId}</Link>, mono: true },
              { label: 'Current Custodian', value: <span className="text-gold">{userName(ev.custodianId)}</span> },
              { label: 'Custody Transfers', value: Math.max(0, records.length - 1), mono: true },
            ]} />
            <div className="mt-6 pt-5 border-t border-line">
              <Button variant="primary" className="w-full" disabled={!perm.ok} onClick={() => setOpen(true)}><ArrowRightLeft size={16} />Transfer Custody</Button>
              {!perm.ok && <p className="flex items-start gap-1.5 text-xs text-mute mt-2"><Lock size={12} className="mt-0.5 shrink-0" />{perm.reason}</p>}
            </div>
          </Card>
          <Card className="p-5 sm:p-6 xl:col-span-3">
            <SectionTitle>Custody Timeline</SectionTitle>
            <CustodyTimeline records={records} />
          </Card>
          <TransferModal open={open} onClose={() => setOpen(false)} evidence={ev} />
        </div>
      ) : (
        <Card><EmptyState title="No evidence selected" description="Search or choose an evidence item to see its custody timeline." /></Card>
      )}
    </>
  )
}
