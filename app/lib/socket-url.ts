import { apiOriginCookieName, tenantForCurrentTab } from './tenant-navigation'

export function getSocketUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const tenantSlug = tenantForCurrentTab()
  if (!tenantSlug) return undefined
  const cookieName = apiOriginCookieName(tenantSlug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
  return match ? decodeURIComponent(match[1]).replace(/\/$/, '') : undefined
}
