export const BACKEND_URL_COOKIE = 'rei_backend_url'
export const BACKEND_URL_STORAGE_KEY = 'rei-backend-url'

export function normalizeBackendUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Informe o endereço do backend')

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Endereço inválido. Use uma URL completa, começando com https://')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('O endereço deve começar com http:// ou https://')
  }
  if (url.username || url.password) {
    throw new Error('Não coloque usuário ou senha no endereço do backend')
  }
  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/$/, '')
}

export function readConfiguredBackendUrl(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(BACKEND_URL_STORAGE_KEY)
    return value ? normalizeBackendUrl(value) : null
  } catch {
    return null
  }
}

export function writeBackendCookie(value: string | null): void {
  if (typeof document === 'undefined') return
  if (!value) {
    document.cookie = `${BACKEND_URL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    return
  }
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${BACKEND_URL_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
}

export function saveBackendUrl(value: string): string {
  const normalized = normalizeBackendUrl(value)
  if (typeof window !== 'undefined') window.localStorage.setItem(BACKEND_URL_STORAGE_KEY, normalized)
  writeBackendCookie(normalized)
  return normalized
}

export function clearBackendUrl(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(BACKEND_URL_STORAGE_KEY)
  writeBackendCookie(null)
}

/** Remove estado que pertence ao backend anterior sem apagar tema nem a URL escolhida. */
export async function clearBackendBoundBrowserState(): Promise<void> {
  if (typeof window === 'undefined') return

  const localKeys: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key && (
      key.startsWith('rei.sidebar.visibility:') ||
      key.startsWith('dsh:pageSize:') ||
      key === 'rei.sidebar.collapsed' ||
      key === 'rei.sidebar.groups'
    )) localKeys.push(key)
  }
  localKeys.forEach(key => window.localStorage.removeItem(key))

  if ('caches' in window) {
    const names = await window.caches.keys()
    const backendCacheFragments = ['static-image-assets', 'next-image', 'apis', 'cross-origin']
    await Promise.all(names
      .filter(name => backendCacheFragments.some(fragment => name.includes(fragment)))
      .map(name => window.caches.delete(name)))
  }
}

export async function clearBackendSession(): Promise<void> {
  const response = await fetch('/api/runtime-config/reset-session', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Não foi possível encerrar a sessão do backend anterior')
}

export function runtimeBackendUrl(): string | undefined {
  return readConfiguredBackendUrl() ?? process.env.NEXT_PUBLIC_API_URL
}
