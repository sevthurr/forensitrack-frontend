import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AlertTriangle, CheckCircle2, ShieldCheck, Upload, XCircle } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, Card, DataTable, EmptyState, Field, HashDisplay, Loading, MetaCard, Mono, PageHeader, SectionTitle, Select, StatusBadge, Tabs } from '../components/ui'
import { sha256Hex } from '../lib/sha256'
import { cn, fmtDT, fmtSize } from '../lib/utils'
import type { Verification } from '../lib/types'

type Method = Verification['method']

export default function Verify() {
  const { visibleEvidence, verifications, verifyEvidence, getEvidenceFile, userName, toast } = useApp()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'stored' | 'uploaded'>('stored')
  const [evId, setEvId] = useState(params.get('evidence') ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Verification | null>(null)
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const ev = visibleEvidence.find((e) => e.id === evId)
  const storedFile = ev ? getEvidenceFile(ev.id) : undefined
  const history = verifications.filter((v) => v.evidenceId === evId).sort((a, b) => b.at.localeCompare(a.at))
  const stored = tab === 'stored'
  const subject = stored ? storedFile : file
  const canRun = !!ev && !!subject && !busy

  const reset = () => { setResult(null); setError('') }

  const run = async () => {
    if (!ev || !subject) return
    setBusy(true)
    reset()
    try {
      const hash = await sha256Hex(subject)
      const method: Method = stored ? 'Stored File' : 'Uploaded File'
      const v = await verifyEvidence(ev.id, method, subject instanceof File ? subject.name : ev.filename, hash)
      setResult(v)
    } catch {
      setError('The SHA-256 hash could not be calculated. No verification was recorded.')
      toast('Verification could not be completed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Verify Evidence" description="Confirm that evidence still matches its registered SHA-256 hash." />
      <Tabs value={tab} onChange={(t) => { setTab(t as 'stored' | 'uploaded'); reset() }} tabs={[{ id: 'stored', label: 'Verify Stored File' }, { id: 'uploaded', label: 'Verify Uploaded File' }]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6 space-y-5">
          <Field label="Evidence">
            <Select value={evId} onChange={(e) => { setEvId(e.target.value); reset() }}>
              <option value="">Select evidence…</option>
              {visibleEvidence.map((e) => <option key={e.id} value={e.id}>{e.evidenceNumber || e.id} — {e.filename}</option>)}
            </Select>
          </Field>
          {ev ? (
            <>
              <MetaCard items={[
                { label: 'Evidence ID', value: ev.evidenceNumber || ev.id, mono: true },
                { label: 'Filename', value: ev.filename, mono: true },
                { label: 'Case', value: ev.caseId, mono: true },
                { label: 'File Type', value: ev.type },
              ]} />
              <HashDisplay label="Registered SHA-256" hash={ev.hash} />
            </>
          ) : (
            <p className="text-sm text-mute">Select an evidence item to see its registered hash.</p>
          )}
        </Card>

        <Card className="p-5 sm:p-6 space-y-5">
          {stored ? (
            <div>
              <div className="text-xs font-medium text-mute mb-1.5">Stored Evidence File</div>
              <div className="rounded-lg border border-line bg-surface px-4 py-4 text-sm">
                {!ev ? <span className="text-mute">Select evidence to check file availability.</span>
                  : storedFile ? <span><span className="font-mono text-[13px]">{storedFile.name}</span> <span className="text-mute">· {fmtSize(storedFile.size)}</span></span>
                  : <span className="text-warn">Evidence file unavailable for verification.</span>}
              </div>
            </div>
          ) : (
            <Field label="Comparison File">
              <input ref={ref} type="file" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); reset() }} />
              <button type="button" onClick={() => ref.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files?.[0] ?? null); reset() }}
                className="w-full rounded-lg border border-dashed border-line bg-surface hover:border-gold/60 px-4 py-8 text-center transition-colors">
                <Upload size={22} className="mx-auto text-gold mb-2" />
                {file ? <span className="block text-sm"><span className="font-mono text-[13px]">{file.name}</span> <span className="text-mute">· {fmtSize(file.size)}</span></span> : <span className="block text-sm text-mute">Drop a file here or click to choose</span>}
              </button>
            </Field>
          )}
          <Button variant="primary" className="w-full" onClick={run} disabled={!canRun}><ShieldCheck size={16} />Verify Integrity</Button>
        </Card>
      </div>

      {busy && <Card className="mt-4"><Loading label="Calculating SHA-256…" /></Card>}
      {error && <Card className="mt-4 p-4 border-bad/40 text-sm text-bad">{error}</Card>}
      {result && (
        <Card className={cn('mt-4 p-5 sm:p-6 border-2', result.result === 'Match' ? 'border-ok/50' : 'border-bad/50')}>
          <div className="flex items-start gap-4 mb-5">
            <span className={cn('h-12 w-12 rounded-xl grid place-items-center shrink-0', result.result === 'Match' ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad')}>
              {result.result === 'Match' ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
            </span>
            <div>
              <h2 className={cn('font-display text-2xl', result.result === 'Match' ? 'text-ok' : 'text-bad')}>{result.result === 'Match' ? 'Integrity Verified' : 'Integrity Mismatch Detected'}</h2>
              <p className="text-sm text-mute mt-1">{result.result === 'Match' ? 'The file matches the registered SHA-256 hash.' : 'The file does not match the registered SHA-256 hash.'}</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <HashDisplay label="Registered SHA-256" hash={result.registeredHash} />
            <HashDisplay label="Calculated SHA-256" hash={result.comparisonHash} tone={result.result === 'Match' ? 'ok' : 'bad'} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <span className="text-mute">Verified <Mono>{fmtDT(result.at)}</Mono></span>
            <span className="text-mute">By <span className="text-ink">{userName(result.userId)}</span></span>
            <span className="text-mute">Method <span className="text-ink">{result.method}</span></span>
          </div>
          {result.result === 'Mismatch' && <p className="flex items-center gap-2 text-xs text-bad mt-4"><AlertTriangle size={14} />Escalate to the case administrator and record handling in case notes.</p>}
        </Card>
      )}

      <div className="mt-6">
        <SectionTitle>Verification History</SectionTitle>
        {ev ? (
          <DataTable rows={history} rowKey={(v) => v.id} pageSize={5} columns={[
            { key: 'at', header: 'Timestamp', cell: (v) => <Mono>{fmtDT(v.at)}</Mono> },
            { key: 'u', header: 'Verified By', cell: (v) => userName(v.userId) },
            { key: 'm', header: 'Method', hide: 'md', cell: (v) => v.method },
            { key: 'f', header: 'File', hide: 'lg', cell: (v) => <span className="font-mono text-[13px]">{v.filename}</span> },
            { key: 'h', header: 'Calculated Hash', hide: 'xl', cell: (v) => <span className="font-mono text-xs text-mute">{v.comparisonHash.slice(0, 16)}…</span> },
            { key: 'r', header: 'Result', cell: (v) => <StatusBadge status={v.result} /> },
          ]} empty={<EmptyState title="No verifications yet" description="Results for this item will appear here." />} />
        ) : (
          <Card><EmptyState title="No evidence selected" description="Choose an evidence item to view its verification history." /></Card>
        )}
      </div>
    </>
  )
}
