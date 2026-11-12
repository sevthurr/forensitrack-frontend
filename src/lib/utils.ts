export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

function parseDate(s: string): Date | null {
  if (!s) return null
  const normalized = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s.trim())
    ? s.trim().replace(' ', 'T') + 'Z'
    : s
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

export const fmtDT = (s: string) => {
  const d = parseDate(s)
  if (!d) return s || '—'
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${datePart} ${timePart}`
}

export const fmtD = (s: string) => {
  const d = parseDate(s)
  if (!d) return s || '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const nowLocalInput = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const nowISO = () => new Date().toISOString()
export const shiftISO = (s: string, ms: number) => {
  const d = parseDate(s) ?? new Date()
  return new Date(d.getTime() + ms).toISOString()
}

export const fmtSize = (b: number) => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = b
  while (v >= 1000 && i < u.length - 1) {
    v /= 1000
    i++
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`
}

export const fileTypeOf = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'heic'].includes(ext)) return 'Image' as const
  if (['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'json', 'eml', 'xml'].includes(ext)) return 'Document' as const
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'Video' as const
  if (['mp3', 'wav', 'flac', 'm4a', 'aac'].includes(ext)) return 'Audio' as const
  return 'Other' as const
}

export const initials = (n: string) =>
  n
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
