import { useEffect, useState } from 'react'
import { Download, File as FileIcon, FileImage, FileText, FileVideo, FileAudio, Eye } from 'lucide-react'
import { Button, Modal } from './ui'
import { previewKind } from '../lib/files'
import { resolveFileUrl, type EvidenceFileSource } from '../services/evidenceFiles'
import { fmtSize } from '../lib/utils'
import type { FileType } from '../lib/types'

export const fileIconFor = (t: FileType | string | undefined | null) => {
  const map: Record<string, typeof FileIcon> = {
    Image: FileImage,
    Document: FileText,
    Video: FileVideo,
    Audio: FileAudio,
    Other: FileIcon,
  }
  if (t && map[t]) return map[t]
  const lower = (t || '').toLowerCase()
  if (lower.includes('image')) return FileImage
  if (lower.includes('pdf') || lower.includes('document') || lower.includes('text') || lower.includes('word')) return FileText
  if (lower.includes('video')) return FileVideo
  if (lower.includes('audio')) return FileAudio
  return FileIcon
}

interface Props {
  open: boolean
  onClose: () => void
  filename: string
  fileType: FileType
  size: number
  source: EvidenceFileSource
  onDownload: () => void
}

export function FileViewerModal({ open, onClose, filename, fileType, size, source, onDownload }: Props) {
  return (
    <Modal open={open} onClose={onClose} wide="xl" title={filename}>
      {open && <Body filename={filename} fileType={fileType} size={size} source={source} onDownload={onDownload} onClose={onClose} />}
    </Modal>
  )
}

function Body({ filename, fileType, size, source, onDownload, onClose }: Omit<Props, 'open'>) {
  const kind = previewKind(filename)
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const r = resolveFileUrl(source)
    if (!r) return
    setUrl(r.url)
    if (kind === 'text') {
      const read = source.file ? source.file.text() : fetch(r.url).then((x) => x.text())
      read.then(setText).catch(() => setFailed(true))
    }
    return () => r.revoke()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.file, source.url, kind])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute mb-3">
        <span>Type: <span className="text-ink">{fileType}</span></span>
        <span>Size: <span className="font-mono text-ink">{fmtSize(size)}</span></span>
      </div>
      <div className="rounded-lg border border-line bg-bg min-h-[260px] max-h-[62vh] overflow-auto grid place-items-center">
        {!url || failed ? (
          <p className="text-sm text-mute py-16">File unavailable.</p>
        ) : kind === 'image' ? (
          <img src={url} alt={filename} className="max-w-full max-h-[60vh] object-contain" onError={() => setFailed(true)} />
        ) : kind === 'pdf' ? (
          <iframe src={url} title={filename} className="w-full h-[60vh] bg-white" />
        ) : kind === 'video' ? (
          <video src={url} controls className="max-w-full max-h-[60vh]" onError={() => setFailed(true)} />
        ) : kind === 'text' ? (
          <pre className="w-full self-start p-4 text-xs font-mono whitespace-pre-wrap break-words text-ink">{text ?? 'Loading…'}</pre>
        ) : (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-mute">Preview is unavailable for this file type.</p>
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-4 border-t border-line">
        <Button onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={onDownload} disabled={!url}><Download size={16} />Download</Button>
      </div>
    </div>
  )
}

export function OriginalFileCard({ filename, fileType, size, available, loading, onView, onDownload }: { filename: string; fileType: FileType; size: number; available: boolean; loading?: boolean; onView: () => void; onDownload: () => void }) {
  const Icon = fileIconFor(fileType)
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-4">
        <span className="h-11 w-11 shrink-0 rounded-lg bg-gold/10 text-gold grid place-items-center"><Icon size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[13px] break-all">{filename}</div>
          <div className="text-xs text-mute mt-1">{fileType} · <span className="font-mono">{fmtSize(size)}</span></div>
          {!available && <p className="text-xs text-mute mt-2">File unavailable.</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Button variant="primary" disabled={!available || loading} onClick={onView}><Eye size={16} />{loading ? 'Loading…' : 'View File'}</Button>
        <Button disabled={!available || loading} onClick={onDownload}><Download size={16} />Download</Button>
      </div>
    </div>
  )
}
