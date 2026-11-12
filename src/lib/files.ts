export type PreviewKind = 'image' | 'pdf' | 'text' | 'video' | 'none'

const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

export const previewKind = (filename: string): PreviewKind => {
  const e = ext(filename)
  if (['jpg', 'jpeg', 'png', 'webp'].includes(e)) return 'image'
  if (e === 'pdf') return 'pdf'
  if (e === 'txt') return 'text'
  if (['mp4', 'webm'].includes(e)) return 'video'
  return 'none'
}

export const triggerDownload = (href: string, filename: string) => {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
