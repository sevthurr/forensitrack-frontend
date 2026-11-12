import { triggerDownload } from '../lib/files'

// Single access point for evidence file bytes. Replace the bodies with
// authenticated FastAPI calls (signed URLs from private storage) when the backend is connected.
export interface EvidenceFileSource {
  file?: Blob | null
  url?: string | null
}

export const resolveFileUrl = (src: EvidenceFileSource): { url: string; revoke: () => void } | null => {
  if (src.file) {
    const url = URL.createObjectURL(src.file)
    return { url, revoke: () => URL.revokeObjectURL(url) }
  }
  if (src.url) return { url: src.url, revoke: () => {} }
  return null
}

export const downloadEvidenceFile = (src: EvidenceFileSource, filename: string) => {
  const r = resolveFileUrl(src)
  if (!r) return false
  triggerDownload(r.url, filename)
  setTimeout(r.revoke, 2000)
  return true
}
