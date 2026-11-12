import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRightLeft, Lock, ShieldCheck } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, Card, CustodyTimeline, DataTable, EmptyState, HashDisplay, MetaCard, Mono, PageHeader, SectionTitle, StatusBadge } from '../components/ui'
import { AccessDenied } from '../components/Layout'
import { TransferModal } from '../components/EvidenceModals'
import { FileViewerModal, OriginalFileCard } from '../components/FileViewer'
import { downloadEvidenceFile } from '../services/evidenceFiles'
import { api } from '../services/api'
import { fmtDT, fmtSize } from '../lib/utils'
import type { CustodyRecord } from '../lib/types'

export default function EvidenceDetail() {
  const { id } = useParams()
  const {
    cases,
    evidence,
    custody,
    verifications,
    canAccessCase,
    userName,
    transferPermission,
    refreshEvidenceCustody,
    refreshEvidenceVerifications,
    refreshAudit,
    toast,
  } = useApp()

  const [transfer, setTransfer] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [fileBlob, setFileBlob] = useState<Blob | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)

  const e = evidence.find((x) => x.id === id)

  useEffect(() => {
    setFileBlob(null)
    if (!e?.id) return
    void refreshEvidenceCustody(e.id)
    void refreshEvidenceVerifications(e.id)
  }, [e?.id, refreshEvidenceCustody, refreshEvidenceVerifications])

  if (!e) {
    return (
      <EmptyState
        title="Evidence not found"
        description={`No evidence with ID ${id}.`}
        action={<Link to="/evidence"><Button>Back to evidence</Button></Link>}
      />
    )
  }
  if (!canAccessCase(e.caseId)) return <AccessDenied />

  const linkedCase = cases.find((c) => c.id === e.caseId)
  const caseLabel = linkedCase ? `${linkedCase.caseNumber} — ${linkedCase.title}` : e.caseId

  const initialCustody: CustodyRecord = {
    id: `initial-${e.id}`,
    evidenceId: e.id,
    fromId: null,
    toId: e.collectorId,
    at: e.collectedAt,
    reason: e.source ? `Collected from ${e.source}` : 'Initial evidence collection',
    remarks: `Registered in system on ${fmtDT(e.registeredAt)}`,
  }

  const transfers = custody
    .filter((c) => c.evidenceId === e.id)
    .sort((a, b) => a.at.localeCompare(b.at))

  const records: CustodyRecord[] = [initialCustody, ...transfers]
  const vers = verifications.filter((v) => v.evidenceId === e.id).sort((a, b) => b.at.localeCompare(a.at))
  const perm = transferPermission(e)
  const source = { file: fileBlob }

  const view = async () => {
    if (fileBlob) {
      setViewing(true)
      return
    }
    setLoadingFile(true)
    try {
      const blob = await api.evidence.preview(e.id)
      setFileBlob(blob)
      setViewing(true)
      void refreshAudit()
    } catch (err: any) {
      toast(err?.detail || 'Failed to load file preview.', 'error')
    } finally {
      setLoadingFile(false)
    }
  }

  const download = async () => {
    setLoadingFile(true)
    try {
      const blob = await api.evidence.download(e.id)
      if (downloadEvidenceFile({ file: blob }, e.filename)) {
        void refreshAudit()
      } else {
        toast('File unavailable.', 'error')
      }
    } catch (err: any) {
      toast(err?.detail || 'Failed to download evidence file.', 'error')
    } finally {
      setLoadingFile(false)
    }
  }

  return (
    <>
      <PageHeader
        title={e.filename}
        description={e.evidenceNumber ? `${e.evidenceNumber} · ${e.id}` : e.id}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/verify?evidence=${e.id}`}>
              <Button variant="primary" size="sm" className="whitespace-nowrap">
                <ShieldCheck size={15} />Verify
              </Button>
            </Link>
            <Button size="sm" className="whitespace-nowrap" disabled={!perm.ok} onClick={() => setTransfer(true)}>
              <ArrowRightLeft size={15} />Transfer Custody
            </Button>
          </div>
        }
      />
      {!perm.ok && (
        <p className="text-xs text-mute -mt-3 mb-5 flex items-center gap-1.5">
          <Lock size={12} />Transfer unavailable: {perm.reason}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <SectionTitle>Evidence Record</SectionTitle>
            </div>
            <MetaCard
              items={[
                { label: 'Evidence Number', value: e.evidenceNumber || '—', mono: true },
                {
                  label: 'Associated Case',
                  value: (
                    <Link to={`/cases/${e.caseId}`} className="font-mono text-[13px] text-gold hover:underline">
                      {caseLabel}
                    </Link>
                  ),
                },
                { label: 'Original Filename', value: e.filename, mono: true },
                { label: 'File Type', value: e.type },
                { label: 'File Size', value: fmtSize(e.size), mono: true },
                { label: 'Source', value: e.source || '—' },
                { label: 'Collector', value: userName(e.collectorId) },
                { label: 'Current Custodian', value: <span className="text-gold font-medium">{userName(e.custodianId)}</span> },
                { label: 'Collection Timestamp', value: fmtDT(e.collectedAt), mono: true },
                { label: 'Registration Timestamp', value: fmtDT(e.registeredAt), mono: true },
              ]}
            />
            <div className="mt-5 pt-4 border-t border-line">
              <div className="text-xs uppercase tracking-wider text-mute mb-1">Description</div>
              <p className="text-sm text-ink">{e.description || '—'}</p>
            </div>
            <div className="mt-5">
              <HashDisplay label="Registered SHA-256 Hash" hash={e.hash} />
              <p className="flex items-center gap-1.5 text-xs text-mute/70 mt-2">
                <Lock size={12} />Original evidence information and the registered hash are read-only.
              </p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle>Original Evidence File</SectionTitle>
            <div className="mt-3">
              <OriginalFileCard
                filename={e.filename}
                fileType={e.type}
                size={e.size}
                available={true}
                loading={loadingFile}
                onView={() => void view()}
                onDownload={() => void download()}
              />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 sm:p-6">
            <SectionTitle>Chain of Custody</SectionTitle>
            <div className="mt-4">
              <CustodyTimeline records={records} />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle>Verification History</SectionTitle>
            <div className="mt-3">
              <DataTable
                rows={vers}
                rowKey={(v) => v.id}
                pageSize={5}
                columns={[
                  { key: 'at', header: 'Timestamp', cell: (v) => <Mono>{fmtDT(v.at)}</Mono> },
                  { key: 'u', header: 'Verified By', cell: (v) => userName(v.userId) },
                  { key: 'm', header: 'Method', hide: 'md', cell: (v) => v.method },
                  { key: 'r', header: 'Result', cell: (v) => <StatusBadge status={v.result} /> },
                ]}
                empty={<EmptyState title="Not yet verified" description="Run an integrity check from the Verify Evidence page." />}
              />
            </div>
          </Card>
        </div>
      </div>

      <FileViewerModal
        open={viewing}
        onClose={() => setViewing(false)}
        filename={e.filename}
        fileType={e.type}
        size={e.size}
        source={source}
        onDownload={() => void download()}
      />
      <TransferModal open={transfer} onClose={() => setTransfer(false)} evidence={e} />
    </>
  )
}
