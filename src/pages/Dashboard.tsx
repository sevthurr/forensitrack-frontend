import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Briefcase, FolderCheck, FolderOpenDot, Package, ArrowRightLeft, FilePlus2, ShieldCheck, ShieldAlert, StickyNote, FolderPlus, UserCog, Eye, PenLine, AlertCircle, RefreshCw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Badge, Button, Card, DataTable, KpiCard, LinkCell, Mono, PageHeader, SectionTitle, EmptyState, ChartSkeleton, ActivitySkeleton } from '../components/ui'
import { fmtDT, fmtD } from '../lib/utils'
import { api, type DashboardStats, type EvidenceItem } from '../services/api'

const pieColors = ['#D4AF37', '#F5F5F5', '#A1A1AA', '#71717A', '#3F3F46']
const barFill = ['#F5F5F5', '#D4AF37', '#52525B']

const actionIcon: Record<string, typeof Eye> = {
  'Case Created': FolderPlus,
  'Case Updated': PenLine,
  'Evidence Registered': FilePlus2,
  'Evidence Viewed': Eye,
  'Evidence Verified': ShieldCheck,
  'Verification Mismatch': ShieldAlert,
  'Custody Transferred': ArrowRightLeft,
  'Case Note Added': StickyNote,
  'User Account Updated': UserCog,
  'User Created': UserCog,
}

export default function Dashboard() {
  const { me, isAdmin } = useApp()
  const nav = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentEvidence, setRecentEvidence] = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsData, evidenceRes] = await Promise.all([
        api.dashboard.getStats(),
        api.evidence.list({ limit: 5 }).catch(() => ({ total: 0, items: [] })),
      ])
      setStats(statsData)
      setRecentEvidence(evidenceRes.items || [])
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError(err.detail || err.message || 'Failed to connect to ForensiTrack API')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const statusData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Open', value: stats.open_cases },
      { name: 'In Progress', value: stats.in_progress_cases },
      { name: 'Closed', value: stats.closed_cases },
    ]
  }, [stats])

  const typeData = useMemo(() => {
    if (!stats || !stats.evidence_by_type) return []
    return stats.evidence_by_type.map((t) => ({
      name: t.file_type || 'Other',
      value: t.count,
    }))
  }, [stats])

  const tip = { background: '#1F1F1F', border: '1px solid #2E2E2E', borderRadius: 8, color: '#F5F5F5', fontSize: 12 }
  const isInitialLoading = loading && !stats

  if (error && !stats) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="h-12 w-12 rounded-xl bg-bad/10 text-bad grid place-items-center mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="font-display text-xl mb-2">Unable to Load Dashboard</h2>
        <p className="text-sm text-mute mb-6">{error}</p>
        <Button onClick={fetchDashboardData} variant="primary" className="flex items-center gap-2">
          <RefreshCw size={16} />
          Retry Request
        </Button>
      </div>
    )
  }

  const openCasesCount = (stats?.open_cases || 0) + (stats?.in_progress_cases || 0)
  const totalCasesCount = stats?.total_cases || 0
  const totalEvidenceCount = stats?.total_evidence || 0
  const closedCasesCount = stats?.closed_cases || 0
  const activity = stats?.recent_activity || []

  return (
    <>
      <PageHeader
        title={isAdmin ? 'System Overview' : 'My Overview'}
        description={isAdmin ? 'System-wide view of cases, evidence and recent activity.' : `Assigned-case view for ${me?.name}.`}
        actions={
          <Button size="sm" onClick={fetchDashboardData} className="flex items-center gap-1.5" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Briefcase}
          label="Total Cases"
          value={totalCasesCount}
          description={isAdmin ? 'All cases in the system' : 'Cases assigned to you'}
          loading={isInitialLoading}
          to="/cases"
        />
        <KpiCard
          icon={Package}
          label="Evidence Records"
          value={totalEvidenceCount}
          description="Registered items with hash references"
          loading={isInitialLoading}
          to="/evidence"
        />
        <KpiCard
          icon={FolderOpenDot}
          label="Open Cases"
          value={openCasesCount}
          description="Open or in-progress investigations"
          loading={isInitialLoading}
          to="/cases?status=open_all"
        />
        <KpiCard
          icon={FolderCheck}
          label="Closed Cases"
          value={closedCasesCount}
          description="Investigations completed"
          loading={isInitialLoading}
          to="/cases?status=closed"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5 mt-4">
        <Card className="p-5 lg:col-span-3">
          <SectionTitle>Cases by Status</SectionTitle>
          <div className="h-64">
            {isInitialLoading ? (
              <ChartSkeleton type="bar" />
            ) : totalCasesCount === 0 ? (
              <EmptyState title="No case records found" description="Create an investigation case to populate status analytics." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} stroke="#2E2E2E" />
                  <XAxis dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#A1A1AA', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" name="Cases" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={barFill[i % barFill.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Evidence by File Type</SectionTitle>
          <div className="h-44">
            {isInitialLoading ? (
              <ChartSkeleton type="pie" />
            ) : typeData.length === 0 || typeData.every((d) => d.value === 0) ? (
              <EmptyState title="No evidence registered" description="Upload evidence artifacts to analyze file distributions." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={2}
                    stroke="#1F1F1F"
                    strokeWidth={2}
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tip} itemStyle={{ color: '#F5F5F5' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {!isInitialLoading && typeData.length > 0 && (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
              {typeData.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-mute">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: pieColors[i % pieColors.length] }} />
                  {d.name}
                  <span className="ml-auto font-mono text-ink">{d.value}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5 mt-4">
        <div className="xl:col-span-3 min-w-0">
          <SectionTitle action={<Link to="/evidence"><Button size="sm">View All</Button></Link>}>
            Recent Evidence
          </SectionTitle>
          <DataTable
            paginate={false}
            loading={isInitialLoading}
            skeletonRows={4}
            rows={recentEvidence}
            rowKey={(e) => e.id}
            onRowClick={(e) => nav(`/evidence/${e.id}`)}
            columns={[
              { key: 'id', header: 'Evidence ID', cell: (e) => <LinkCell to={`/evidence/${e.id}`}>{e.evidence_number || e.id}</LinkCell> },
              { key: 'f', header: 'Filename', cell: (e) => <span className="block max-w-[200px] truncate">{e.original_filename}</span> },
              { key: 'c', header: 'Case ID', hide: 'sm', cell: (e) => <Mono>{e.case_id.slice(0, 8)}…</Mono> },
              { key: 't', header: 'Type', cell: (e) => <Badge tone="neutral">{e.file_type || 'File'}</Badge> },
              { key: 'd', header: 'Registered', hide: 'md', cell: (e) => <Mono>{fmtD(e.created_at)}</Mono> },
            ]}
          />
        </div>

        <div className="xl:col-span-2 min-w-0">
          <SectionTitle>Recent Activity</SectionTitle>
          <Card className="p-2">
            {isInitialLoading ? (
              <ActivitySkeleton count={5} />
            ) : activity.length === 0 ? (
              <EmptyState title="No recent activity" description="Security actions and audit logs will record automatically." />
            ) : (
              activity.map((a) => {
                const Icon = actionIcon[a.action] ?? Eye
                const bad = a.action.includes('Mismatch') || a.action.includes('Deactivated')
                return (
                  <div key={a.id} className="flex gap-3 p-3 rounded-lg hover:bg-white/[0.02]">
                    <span className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center ${bad ? 'bg-bad/10 text-bad' : 'bg-gold/10 text-gold'}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm flex flex-wrap items-center gap-2">
                        {a.action}
                        {bad && <Badge tone="bad">Alert</Badge>}
                      </div>
                      <p className="text-xs text-mute truncate">
                        {a.actor_name || 'System'} · {a.entity_type} {a.entity_id ? `(${String(a.entity_id).slice(0, 8)})` : ''}
                      </p>
                      <p className="font-mono text-[11px] text-mute/70">{fmtDT(a.created_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
