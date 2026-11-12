import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FilePlus2, Lock, Pencil, RotateCcw, Send } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, Card, ConfirmDialog, DataTable, EmptyState, Field, LinkCell, MetaCard, Modal, Mono, PageHeader, SectionTitle, StatusBadge, Tabs, Textarea } from '../components/ui'
import { AccessDenied } from '../components/Layout'
import { RegisterEvidenceModal } from '../components/EvidenceModals'
import { CaseForm } from './Cases'
import { fmtDT, initials } from '../lib/utils'

export default function CaseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { cases, evidence, custody, notes, isAdmin, canAccessCase, userName, updateCase, addNote, toast } = useApp()
  const [tab, setTab] = useState('overview')
  const [edit, setEdit] = useState(false)
  const [reg, setReg] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [note, setNote] = useState('')
  const c = cases.find((x) => x.id === id)
  if (!c) return <EmptyState title="Case not found" description={`No case with ID ${id}.`} action={<Link to="/cases"><Button>Back to cases</Button></Link>} />
  if (!canAccessCase(c.id)) return <AccessDenied />

  const ev = evidence.filter((e) => e.caseId === c.id)
  const evIds = new Set(ev.map((e) => e.id))
  const cust = custody.filter((x) => evIds.has(x.evidenceId)).sort((a, b) => b.at.localeCompare(a.at))
  const cn = notes.filter((n) => n.caseId === c.id).sort((a, b) => a.at.localeCompare(b.at))
  const closed = c.status.toLowerCase() === 'closed'
  const isOpen = c.status.toLowerCase() === 'open'

  return (
    <>
      <PageHeader title={c.title} description={c.caseNumber || c.id} actions={<>
        {isAdmin && <Button onClick={() => setEdit(true)}><Pencil size={15} />Edit Case</Button>}
        {!isAdmin && isOpen && (
          <Button
            variant="primary"
            onClick={async () => {
              await updateCase(c.id, { status: 'in_progress' })
              toast('Case status updated to In Progress')
            }}
          >
            Start Investigation
          </Button>
        )}
        {isAdmin && (closed
          ? <Button onClick={() => setConfirm(true)}><RotateCcw size={15} />Reopen Case</Button>
          : <Button variant="danger" onClick={() => setConfirm(true)}><Lock size={15} />Close Case</Button>)}
      </>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'evidence', label: 'Evidence', count: ev.length },
        { id: 'custody', label: 'Custody History', count: cust.length },
        { id: 'notes', label: 'Case Notes', count: cn.length },
      ]} />

      {tab === 'overview' && (
        <Card className="p-5 sm:p-6">
          <MetaCard cols={3} items={[
            { label: 'Case ID', value: c.id, mono: true },
            { label: 'Status', value: <StatusBadge status={c.status} /> },
            { label: 'Assigned Investigator', value: userName(c.investigatorId || null) },
            { label: 'Created', value: fmtDT(c.created), mono: true },
            { label: 'Last Updated', value: fmtDT(c.updated), mono: true },
            { label: 'Evidence Items', value: ev.length },
          ]} />
          <div className="mt-5 pt-5 border-t border-line">
            <div className="text-xs uppercase tracking-wider text-mute mb-1">Description</div>
            <p className="text-sm leading-relaxed max-w-3xl">{c.description}</p>
          </div>
          {!isAdmin && <p className="text-xs text-mute/70 mt-5">Closing, reopening and reassigning cases is limited to administrators.</p>}
        </Card>
      )}

      {tab === 'evidence' && (
        <>
          <SectionTitle action={<Button variant="primary" onClick={() => setReg(true)}><FilePlus2 size={16} />Register Evidence</Button>}>Linked Evidence</SectionTitle>
          <DataTable
            rows={ev}
            rowKey={(e) => e.id}
            pageSize={6}
            onRowClick={(e) => nav(`/evidence/${e.id}`)}
            columns={[
              { key: 'id', header: 'Evidence ID', cell: (e) => <LinkCell to={`/evidence/${e.id}`}>{e.evidenceNumber || e.id}</LinkCell> },
              { key: 'f', header: 'Filename', cell: (e) => <span className="block max-w-[240px] truncate font-medium">{e.filename}</span> },
              { key: 't', header: 'Type', hide: 'md', cell: (e) => e.type },
              { key: 'o', header: 'Collector', hide: 'sm', cell: (e) => userName(e.collectorId) },
            ]}
            empty={<EmptyState title="No evidence registered" description="Register the first item for this case." />}
          />
        </>
      )}

      {tab === 'custody' && (
        <DataTable
          rows={cust}
          rowKey={(r) => r.id}
          pageSize={8}
          onRowClick={(r) => nav(`/evidence/${r.evidenceId}`)}
          columns={[
            { key: 'e', header: 'Evidence ID', cell: (r) => <LinkCell to={`/evidence/${r.evidenceId}`}>{r.evidenceId}</LinkCell> },
            { key: 'f', header: 'Sender', cell: (r) => (r.fromId ? userName(r.fromId) : <span className="text-mute">Initial collection</span>) },
            { key: 't', header: 'Receiver', cell: (r) => userName(r.toId) },
            { key: 'at', header: 'Timestamp', hide: 'sm', cell: (r) => <Mono>{fmtDT(r.at)}</Mono> },
            { key: 'r', header: 'Reason', hide: 'md', cell: (r) => r.reason },
          ]}
        />
      )}

      {tab === 'notes' && (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3 order-2 lg:order-1">
            {cn.length === 0 && <Card><EmptyState title="No notes yet" /></Card>}
            {cn.map((n) => (
              <Card key={n.id} className="p-4 flex gap-3">
                <span className="h-8 w-8 shrink-0 rounded-full bg-gold/15 text-gold grid place-items-center text-xs font-semibold">{initials(userName(n.authorId))}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3"><span className="text-sm font-medium">{userName(n.authorId)}</span><span className="font-mono text-xs text-mute">{fmtDT(n.at)}</span></div>
                  <p className="text-sm text-mute mt-1 leading-relaxed">{n.content}</p>
                </div>
              </Card>
            ))}
          </div>
          <Card className="lg:col-span-2 p-5 h-fit order-1 lg:order-2">
            <SectionTitle>Add Note</SectionTitle>
            <form onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return toast('Enter a note first', 'error'); addNote(c.id, note.trim()); setNote(''); toast('Note added') }} className="space-y-3">
              <Field label="Note"><Textarea value={note} maxLength={10000} onChange={(e) => setNote(e.target.value)} placeholder="Findings, decisions, follow-ups…" /></Field>
              <Button type="submit" variant="primary" className="w-full"><Send size={15} />Add Note</Button>
            </form>
          </Card>
        </div>
      )}

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit Case" description={isAdmin ? undefined : 'You can edit the title and description of assigned cases.'}>
        <CaseForm initial={c} adminFields={isAdmin} submitLabel="Save Changes" onCancel={() => setEdit(false)}
          onSubmit={async (v) => { await updateCase(c.id, isAdmin ? v : { title: v.title, description: v.description }); toast('Case updated'); setEdit(false) }} />
      </Modal>
      <RegisterEvidenceModal open={reg} onClose={() => setReg(false)} fixedCaseId={c.id} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} danger={!closed} title={closed ? 'Reopen case?' : 'Close case?'}
        message={closed ? `${c.id} will return to In Progress.` : `${c.id} will be marked Closed. It can be reopened later by an administrator.`}
        confirmLabel={closed ? 'Reopen Case' : 'Close Case'}
        onConfirm={() => { updateCase(c.id, { status: closed ? 'In Progress' : 'Closed' }, closed ? 'Case reopened (In Progress).' : 'Case closed.'); toast(closed ? 'Case reopened' : 'Case closed') }} />
    </>
  )
}
