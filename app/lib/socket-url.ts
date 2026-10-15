export function getSocketUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  if (typeof window === 'undefined') return undefined

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:4000'
  }

  return undefined
}
