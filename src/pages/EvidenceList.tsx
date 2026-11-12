import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { FilePlus2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, DataTable, FilterSelect, LinkCell, PageHeader, SearchInput, Mono } from '../components/ui'
import { RegisterEvidenceModal } from '../components/EvidenceModals'
import { fmtD } from '../lib/utils'

export default function EvidenceList() {
  const { visibleEvidence, visibleCases, userName, loadingEvidence } = useApp()
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [caseId, setCaseId] = useState(searchParams.get('caseId') || '')
  const [type, setType] = useState(searchParams.get('type') || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQ(searchParams.get('q') || '')
    setCaseId(searchParams.get('caseId') || '')
    setType(searchParams.get('type') || '')
  }, [searchParams])

  const updateParam = (key: string, val: string) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      if (val) p.set(key, val)
      else p.delete(key)
      return p
    }, { replace: true })
  }

  const handleQChange = (val: string) => {
    setQ(val)
    updateParam('q', val)
  }

  const handleCaseIdChange = (val: string) => {
    setCaseId(val)
    updateParam('caseId', val)
  }

  const handleTypeChange = (val: string) => {
    setType(val)
    updateParam('type', val)
  }

  const caseMap = useMemo(() => new Map(visibleCases.map((c) => [c.id, c])), [visibleCases])

  const rows = useMemo(
    () =>
      visibleEvidence
        .filter((e) => {
          if (caseId && e.caseId !== caseId) return false
          if (type && e.type !== type) return false
          if (!q) return true
          const cNum = caseMap.get(e.caseId)?.caseNumber || ''
          return `${e.evidenceNumber || ''} ${e.id} ${e.filename} ${cNum}`.toLowerCase().includes(q.toLowerCase())
        })
        .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
    [visibleEvidence, caseMap, q, caseId, type],
  )
  return (
    <>
      <PageHeader title="Evidence" description="Registered digital evidence and chain of custody." actions={<Button variant="primary" onClick={() => setOpen(true)}><FilePlus2 size={16} />Register Evidence</Button>} />
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <SearchInput className="flex-1" value={q} onChange={handleQChange} placeholder="Search by evidence ID, case ID, or filename…" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FilterSelect label="All cases" value={caseId} onChange={handleCaseIdChange} options={visibleCases.map((c) => ({ value: c.id, label: c.caseNumber || c.id }))} />
          <FilterSelect label="All file types" value={type} onChange={handleTypeChange} options={['Image', 'Document', 'Video', 'Audio', 'Other'].map((t) => ({ value: t, label: t }))} />
        </div>
      </div>
      <DataTable
        loading={loadingEvidence}
        skeletonRows={5}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={(e) => nav(`/evidence/${e.id}`)}
        columns={[
          { key: 'id', header: 'Evidence ID', cell: (e) => <LinkCell to={`/evidence/${e.id}`}>{e.evidenceNumber || e.id}</LinkCell> },
          { key: 'f', header: 'Filename', cell: (e) => <span className="block max-w-[220px] truncate font-medium">{e.filename}</span> },
          { key: 'c', header: 'Case ID', hide: 'sm', cell: (e) => <Mono>{caseMap.get(e.caseId)?.caseNumber || e.caseId}</Mono> },
          { key: 't', header: 'File Type', hide: 'lg', cell: (e) => e.type },
          { key: 'o', header: 'Collector', hide: 'xl', cell: (e) => userName(e.collectorId) },
          { key: 'd', header: 'Registered', hide: 'md', cell: (e) => <Mono>{fmtD(e.registeredAt)}</Mono> },
        ]}
      />
      <RegisterEvidenceModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
