import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Info, Inbox, Loader2, Search, X, XCircle, Fingerprint, Shield } from 'lucide-react'
import { cn, fmtDT } from '../lib/utils'
import { useApp } from '../store/AppContext'
import type { CustodyRecord } from '../lib/types'

/* ---------- Buttons ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }
export function Button({ variant = 'secondary', size = 'md', className, ...p }: BtnProps) {
  const v = {
    primary: 'bg-gold text-black hover:bg-gold-hover font-semibold',
    secondary: 'bg-panel border border-line text-ink hover:border-gold/60 hover:bg-[#262626]',
    ghost: 'text-mute hover:text-ink hover:bg-panel',
    danger: 'bg-bad/10 border border-bad/40 text-bad hover:bg-bad/20',
  }[variant]
  return (
    <button
      {...p}
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap', size === 'sm' ? 'h-8 px-3' : 'h-10 px-4', v, className)}
    />
  )
}

/* ---------- Form controls ---------- */
const ctl = 'w-full rounded-lg bg-surface border border-line px-3 text-sm text-ink placeholder:text-mute/60 focus:border-gold focus:outline-none focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed'
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(ctl, 'h-10', p.className)} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn(ctl, 'py-2 min-h-[88px] resize-y', p.className)} />
export const Select = ({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cn(ctl, 'h-10 appearance-none pr-8 bg-[length:12px] bg-no-repeat bg-[position:right_12px_center]', p.className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23A1A1AA' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
    {children}
  </select>
)
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-mute mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-mute/70 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-bad mt-1">{error}</span>}
    </label>
  )
}
export function SearchInput({ value, onChange, placeholder, className, maxLength = 200 }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string; maxLength?: number }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
      <Input value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  )
}
export function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="sm:w-auto sm:min-w-[160px]">
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )
}

/* ---------- Badges ---------- */
const tones = {
  gold: 'bg-gold/10 text-gold border-gold/30',
  ok: 'bg-ok/10 text-ok border-ok/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
  bad: 'bg-bad/10 text-bad border-bad/30',
  neutral: 'bg-white/5 text-ink border-line',
  muted: 'bg-white/5 text-mute border-line',
}
export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone], className)}>{children}</span>
}
const statusTone: Record<string, keyof typeof tones> = {
  Open: 'neutral', 'In Progress': 'gold', 'Under Review': 'warn', Closed: 'muted',
  Verified: 'ok', Match: 'ok', Mismatch: 'bad', Pending: 'warn', Active: 'ok', Inactive: 'muted',
}
export const StatusBadge = ({ status }: { status: string }) => {
  const norm = (status || '').toLowerCase()
  const display = norm === 'in_progress' ? 'In Progress' : norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : 'Unknown'
  const tone = statusTone[display] ?? statusTone[status] ?? (norm === 'in_progress' ? 'gold' : norm === 'closed' ? 'muted' : 'neutral')
  return (
    <Badge tone={tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {display}
    </Badge>
  )
}

/* ---------- Layout bits ---------- */
export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cn('rounded-xl border border-line bg-panel', className)}>{children}</div>
}
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="font-display text-lg tracking-wide text-ink">{children}</h2>
      {action}
    </div>
  )
}
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl tracking-wide [overflow-wrap:anywhere]">{title}</h1>
        {description && <p className="text-sm text-mute mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 [&>a]:max-sm:flex-1 [&>button]:max-sm:flex-1">{actions}</div>}
    </div>
  )
}
/* ---------- Skeletons ---------- */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-white/[0.06] border border-white/[0.02]', className)}
      {...props}
    />
  )
}

export function ChartSkeleton({ type = 'bar' }: { type?: 'bar' | 'pie' }) {
  if (type === 'pie') {
    return (
      <div className="h-44 flex flex-col items-center justify-center gap-3">
        <div className="h-28 w-28 rounded-full border-4 border-dashed border-white/10 animate-spin [animation-duration:8s] flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-surface" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    )
  }
  return (
    <div className="h-64 flex items-end justify-between gap-4 p-4">
      <Skeleton className="h-[40%] flex-1" />
      <Skeleton className="h-[75%] flex-1" />
      <Skeleton className="h-[25%] flex-1" />
      <Skeleton className="h-[55%] flex-1" />
    </div>
  )
}

export function ActivitySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 items-center">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('p-5 space-y-4', className)}>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </Card>
  )
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  description,
  loading = false,
  to,
  onClick,
}: {
  icon: typeof Info
  label: string
  value: ReactNode
  description: string
  loading?: boolean
  to?: string
  onClick?: () => void
}) {
  const content = (
    <Card
      className={cn(
        'p-5 transition-all duration-150',
        (to || onClick) && 'cursor-pointer hover:border-gold/60 hover:bg-panel/80 hover:-translate-y-0.5'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wider text-mute">{label}</span>
        <span className="h-9 w-9 rounded-lg bg-gold/10 text-gold grid place-items-center">
          <Icon size={18} />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ) : (
        <>
          <div className="font-display text-4xl mt-3">{value}</div>
          <p className="text-xs text-mute mt-1">{description}</p>
        </>
      )}
    </Card>
  )

  if (to) {
    return (
      <Link to={to} className="block no-underline text-inherit focus:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <span className="h-12 w-12 rounded-xl bg-surface border border-line grid place-items-center text-mute mb-3"><Inbox size={22} /></span>
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-mute mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function Loading({ label = 'Processing…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-mute text-sm">
      <Loader2 size={18} className="animate-spin text-gold" /> {label}
    </div>
  )
}
export function MetaCard({ items, cols = 2 }: { items: { label: string; value: ReactNode; mono?: boolean }[]; cols?: 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3')}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs uppercase tracking-wider text-mute mb-1">{i.label}</dt>
          <dd className={cn('text-sm break-words', i.mono && 'font-mono text-[13px]')}>{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-line mb-5 overflow-x-auto">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={cn('px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors', value === t.id ? 'border-gold text-gold' : 'border-transparent text-mute hover:text-ink')}>
          {t.label}
          {t.count !== undefined && <span className="ml-2 text-xs text-mute">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative h-9 w-9 shrink-0 grid place-items-center text-gold">
        <Shield size={36} strokeWidth={1.4} />
        <Fingerprint size={16} strokeWidth={1.6} className="absolute" />
      </span>
      {!compact && <span className="font-display text-xl tracking-wider">Forensi<span className="text-gold">Track</span></span>}
    </div>
  )
}

/* ---------- Hash display ---------- */
export function HashDisplay({ hash, label, tone }: { hash: string; label?: string; tone?: 'ok' | 'bad' }) {
  const { toast } = useApp()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash)
    } catch {
      /* clipboard unavailable in some previews */
    }
    setCopied(true)
    toast('SHA-256 hash copied to clipboard')
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div>
      {label && <div className="text-xs uppercase tracking-wider text-mute mb-1.5">{label}</div>}
      <div className={cn('flex items-center gap-2 rounded-lg border bg-surface px-3 py-2', tone === 'ok' ? 'border-ok/40' : tone === 'bad' ? 'border-bad/40' : 'border-line')}>
        <code className={cn('font-mono text-xs break-all flex-1', tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-ink')}>{hash}</code>
        <button onClick={copy} aria-label="Copy hash" className="shrink-0 h-7 w-7 grid place-items-center rounded-md text-mute hover:text-gold hover:bg-panel">
          {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

/* ---------- Table + pagination ---------- */
export interface Column<T> {
  key: string
  header: ReactNode
  cell: (r: T) => ReactNode
  hide?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}
const hideCls = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

export function Pagination({ page, pages, total, size, onChange }: { page: number; pages: number; total: number; size: number; onChange: (p: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(total, page * size)
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-mute">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></Button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onChange(n)} className={cn('h-8 min-w-8 px-2 rounded-lg text-xs', n === page ? 'bg-gold/15 text-gold border border-gold/40' : 'hover:bg-panel text-mute')}>{n}</button>
        ))}
        <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={14} /></Button>
      </div>
    </div>
  )
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 8,
  empty,
  paginate = true,
  loading = false,
  skeletonRows = 4,
  onRowClick,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (r: T) => string
  pageSize?: number
  empty?: ReactNode
  paginate?: boolean
  loading?: boolean
  skeletonRows?: number
  onRowClick?: (r: T) => void
}) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  useEffect(() => {
    if (page > pages) setPage(1)
  }, [rows.length, pages, page])
  const slice = paginate ? rows.slice((page - 1) * pageSize, page * pageSize) : rows
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              {columns.map((c) => (
                <th key={c.key} className={cn('text-left font-medium text-xs uppercase tracking-wider text-mute px-4 py-3 whitespace-nowrap', c.hide && hideCls[c.hide], c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, rIdx) => (
                <tr key={`skel-${rIdx}`} className="border-b border-line/40 last:border-0">
                  {columns.map((c, cIdx) => (
                    <td key={`skel-c-${cIdx}`} className={cn('px-4 py-3.5 align-middle', c.hide && hideCls[c.hide], c.className)}>
                      <Skeleton className={cn('h-4', cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-48' : 'w-20')} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              slice.map((r) => (
                <tr
                  key={rowKey(r)}
                  onClick={(e) => {
                    // Don't trigger row navigation if user clicked on an interactive element like a button, link, or input
                    const target = e.target as HTMLElement
                    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
                      return
                    }
                    onRowClick?.(r)
                  }}
                  className={cn(
                    'border-b border-line/60 last:border-0 transition-colors',
                    onRowClick
                      ? 'cursor-pointer hover:bg-gold/[0.04] active:bg-gold/[0.08]'
                      : 'hover:bg-white/[0.02]'
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 align-middle', c.hide && hideCls[c.hide], c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (empty ?? <EmptyState title="No records found" description="Try adjusting your search or filters." />)}
      {!loading && paginate && rows.length > 0 && <Pagination page={page} pages={pages} total={rows.length} size={pageSize} onChange={setPage} />}
    </Card>
  )
}

export const Mono = ({ children, gold }: { children: ReactNode; gold?: boolean }) => <span className={cn('font-mono text-[13px]', gold && 'text-gold')}>{children}</span>
export const LinkCell = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="font-mono text-[13px] text-gold hover:underline">{children}</Link>
)

/* ---------- Modals ---------- */
export function Modal({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean | 'xl' }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} className={cn('w-full bg-panel border border-line rounded-t-xl sm:rounded-xl max-h-[92vh] flex flex-col shadow-2xl', wide === 'xl' ? 'sm:max-w-4xl' : wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div>
            <h2 className="font-display text-xl tracking-wide">{title}</h2>
            {description && <p className="text-sm text-mute mt-1">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-lg text-mute hover:text-ink hover:bg-surface"><X size={16} /></button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
export const ModalActions = ({ children }: { children: ReactNode }) => <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-2 border-t border-line">{children}</div>

export function Drawer({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-end bg-black/75 transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      onMouseDown={onClose}
      aria-hidden={!open}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'h-full w-full bg-panel border-l border-line flex flex-col shadow-2xl transition-transform duration-200 ease-out',
          wide ? 'max-w-2xl' : 'max-w-lg',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-line shrink-0">
          <div>
            <h2 className="font-display text-xl tracking-wide">{title}</h2>
            {description && <p className="text-sm text-mute mt-1">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-lg text-mute hover:text-ink hover:bg-surface">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-mute">{message}</p>
      <ModalActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </ModalActions>
    </Modal>
  )
}

/* ---------- Toasts ---------- */
export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  const icon = { success: <CheckCircle2 size={18} className="text-ok" />, error: <XCircle size={18} className="text-bad" />, info: <AlertTriangle size={18} className="text-gold" /> }
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96 print:hidden">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start gap-3 rounded-lg border border-line bg-panel px-4 py-3 shadow-xl">
          {icon[t.tone]}
          <p className="text-sm flex-1">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-mute hover:text-ink"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

/* ---------- Custody timeline ---------- */
export function CustodyTimeline({ records }: { records: CustodyRecord[] }) {
  const { userName } = useApp()
  if (records.length === 0) return <EmptyState title="No custody records" />
  return (
    <ol className="relative ml-2">
      {records.map((r, i) => (
        <li key={r.id} className="relative pl-7 pb-6 last:pb-0">
          {i < records.length - 1 && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" />}
          <span className={cn('absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2', i === records.length - 1 ? 'border-gold bg-gold' : 'border-mute bg-panel')} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium">{r.fromId ? `${userName(r.fromId)} → ${userName(r.toId)}` : `Collected by ${userName(r.toId)}`}</span>
            <span className="font-mono text-xs text-mute">{fmtDT(r.at)}</span>
            {i === records.length - 1 && <Badge tone="gold">Current</Badge>}
          </div>
          <p className="text-sm text-mute mt-0.5">{r.reason}</p>
          {r.remarks && <p className="text-xs text-mute/70 mt-0.5">{r.remarks}</p>}
        </li>
      ))}
    </ol>
  )
}
