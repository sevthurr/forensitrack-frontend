import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Eye, FileDown } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Button, DataTable, FilterSelect, LinkCell, PageHeader, SearchInput, StatusBadge, Mono } from '../components/ui'
import { caseStatuses } from './Cases'
import { fmtD } from '../lib/utils'

export default function Reports() {
  const { visibleCases, userName, evidence, toast } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const rows = useMemo(
    () => visibleCases.filter((c) => {
      const matchesStatus = !status
        ? true
        : status === 'open_all'
        ? (c.status.toLowerCase() === 'open' || c.status.toLowerCase() === 'in_progress')
        : c.status.toLowerCase() === status.toLowerCase()
      const matchesQ = !q || (c.id + (c.caseNumber || '') + c.title).toLowerCase().includes(q.toLowerCase())
      return matchesStatus && matchesQ
    }),
    [visibleCases, q, status],
  )
  return (
    <>
      <PageHeader title="Reports" description="Generate a case summary with evidence inventory, hashes, custody history and notes." />
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput className="flex-1" value={q} onChange={setQ} placeholder="Search by case ID or title…" />
        <FilterSelect label="All statuses" value={status} onChange={setStatus} options={caseStatuses} />
      </div>
      <DataTable
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => nav(`/reports/${c.id}`)}
        columns={[
          { key: 'id', header: 'Case ID', cell: (c) => <LinkCell to={`/reports/${c.id}`}>{c.id}</LinkCell> },
          { key: 't', header: 'Case Title', cell: (c) => <span className="block max-w-[300px] font-medium">{c.title}</span> },
          { key: 'i', header: 'Investigator', hide: 'lg', cell: (c) => userName(c.investigatorId || null) },
          { key: 'e', header: 'Evidence', hide: 'md', cell: (c) => <Mono>{evidence.filter((e) => e.caseId === c.id).length}</Mono> },
          { key: 's', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
          { key: 'd', header: 'Created', hide: 'xl', cell: (c) => <Mono>{fmtD(c.created)}</Mono> },
          { key: 'a', header: 'Actions', cell: (c) => (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => nav(`/reports/${c.id}?print=1`)}><FileDown size={14} />Export PDF</Button>
            </div>
          ) },
        ]}
      />
    </>
  )
}
