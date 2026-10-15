import { runtimeBackendUrl } from './backend-config'

export function getSocketUrl(): string | undefined {
  const configured = runtimeBackendUrl()
  if (configured) return configured
  if (typeof window === 'undefined') return undefined

  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:4000'
  }

  return undefined
}
