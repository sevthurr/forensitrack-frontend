export async function sha256Hex(blob: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 hashing is not available in this browser context.')
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
