import { apiOriginCookieName, tenantForCurrentTab } from './tenant-navigation'

export function getSocketUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const tenantSlug = tenantForCurrentTab()
  if (!tenantSlug) return undefined
  const cookieName = apiOriginCookieName(tenantSlug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
  return match ? decodeURIComponent(match[1]).replace(/\/$/, '') : undefined
}

export async function resolveSocketUrl(): Promise<string | undefined> {
  const cached = getSocketUrl()
  if (cached) return cached

  const tenantSlug = tenantForCurrentTab()
  if (!tenantSlug) return undefined
  try {
    const response = await fetch(`/api/installation/status?estabelecimento=${encodeURIComponent(tenantSlug)}`, {
      cache: 'no-store',
    })
    if (!response.ok) return undefined
    const status = await response.json() as { active?: boolean; apiUrl?: string }
    if (!status.active || !status.apiUrl) return undefined
    const parsed = new URL(status.apiUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}
