import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, FileDown } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, EmptyState, Logo } from '../components/ui'
import { AccessDenied } from '../components/Layout'
import { fmtDT, fmtSize, nowISO } from '../lib/utils'

const h2 = 'font-display text-lg tracking-wide text-[#8a6d12] border-b border-[#d9d4c3] pb-1 mb-3 mt-8'
const th = 'text-left text-[11px] uppercase tracking-wider text-neutral-500 py-2 pr-3 font-medium'
const td = 'py-2 pr-3 align-top border-t border-neutral-200'

export default function ReportPreview() {
  const { id } = useParams()
  const { cases, evidence, custody, notes, me, userName, canAccessCase } = useApp()
  const [params] = useSearchParams()
  const autoPrint = params.get('print') === '1'
  useEffect(() => {
    if (!autoPrint) return
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [autoPrint])
  const c = cases.find((x) => x.id === id)
  if (!c) return <EmptyState title="Case not found" />
  if (!canAccessCase(c.id)) return <AccessDenied />
  const ev = evidence.filter((e) => e.caseId === c.id).sort((a, b) => a.id.localeCompare(b.id))
  const ids = new Set(ev.map((e) => e.id))
  const cust = custody.filter((x) => ids.has(x.evidenceId)).sort((a, b) => a.at.localeCompare(b.at))
  const cn = notes.filter((n) => n.caseId === c.id).sort((a, b) => a.at.localeCompare(b.at))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <Link to="/reports"><Button variant="ghost"><ArrowLeft size={16} />Back to reports</Button></Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-mute hidden sm:block">Opens the print dialog — choose “Save as PDF”.</span>
          <Button variant="primary" onClick={() => window.print()}><FileDown size={16} />Export PDF</Button>
        </div>
      </div>

      <article className="bg-white text-neutral-900 rounded-xl print:rounded-none p-6 sm:p-10 max-w-4xl mx-auto text-sm leading-relaxed">
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#D4AF37] pb-4">
          <div className="text-neutral-900 [&_span]:!text-neutral-900 [&_svg]:text-[#8a6d12]"><Logo /></div>
          <div className="text-right">
            <div className="font-display text-xl">Case Summary Report</div>
            <div className="font-mono text-xs text-neutral-500">{c.id}</div>
          </div>
        </header>

        <h2 className={h2}>Case Information</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {[['Case ID', c.id], ['Status', c.status], ['Title', c.title], ['Assigned Investigator', userName(c.investigatorId || null)], ['Created', fmtDT(c.created)], ['Last Updated', fmtDT(c.updated)]].map(([k, v]) => (
            <div key={k}><dt className="text-[11px] uppercase tracking-wider text-neutral-500">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <p className="mt-3 text-neutral-700">{c.description}</p>

        <h2 className={h2}>Evidence Inventory ({ev.length})</h2>
        {ev.length === 0 ? <p className="text-neutral-500">No evidence registered.</p> : (
          <div className="space-y-4">
            {ev.map((e) => (
              <div key={e.id} className="break-inside-avoid rounded-lg border border-neutral-200 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">{e.evidenceNumber || e.id}</span>
                  <span className="text-xs text-neutral-500">{e.type} · {fmtSize(e.size)}</span>
                </div>
                <div className="font-mono text-xs mt-1">{e.filename}</div>
                <div className="font-mono text-[11px] break-all mt-2 bg-neutral-100 rounded px-2 py-1.5">SHA-256: {e.hash}</div>
                <div className="text-xs text-neutral-600 mt-2 grid sm:grid-cols-3 gap-1">
                  <span>Collected: <span className="font-mono">{fmtDT(e.collectedAt)}</span></span>
                  <span>Registered: <span className="font-mono">{fmtDT(e.registeredAt)}</span></span>
                  <span>Custodian: {userName(e.custodianId)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className={h2}>Custody Transfer History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr><th className={th}>Evidence</th><th className={th}>From</th><th className={th}>To</th><th className={th}>Timestamp</th><th className={th}>Reason</th></tr></thead>
            <tbody>
              {cust.map((r) => (
                <tr key={r.id}>
                  <td className={td + ' font-mono'}>{r.evidenceId}</td>
                  <td className={td}>{r.fromId ? userName(r.fromId) : 'Initial collection'}</td>
                  <td className={td}>{userName(r.toId)}</td>
                  <td className={td + ' font-mono whitespace-nowrap'}>{fmtDT(r.at)}</td>
                  <td className={td}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className={h2}>Case Notes</h2>
        {cn.length === 0 ? <p className="text-neutral-500">No notes recorded.</p> : cn.map((n) => (
          <div key={n.id} className="mb-3 break-inside-avoid">
            <div className="text-xs text-neutral-500"><span className="font-medium text-neutral-800">{userName(n.authorId)}</span> · <span className="font-mono">{fmtDT(n.at)}</span></div>
            <p>{n.content}</p>
          </div>
        ))}

        <footer className="mt-10 pt-4 border-t border-neutral-300 text-xs text-neutral-500 flex flex-wrap justify-between gap-2">
          <span>Generated: <span className="font-mono">{fmtDT(nowISO())}</span> · By: {me?.name}</span>
          <span>ForensiTrack · Digital Evidence Management System</span>
        </footer>
      </article>
    </>
  )
}
