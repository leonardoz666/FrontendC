const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TAB_TENANT_KEY = 'controlae:tab-tenant'

export const TENANT_HEADER = 'x-controlae-tenant'
export const INSTALLATION_COOKIE_PREFIX = 'controlae_installation_'
export const INSTALLATION_GATE_COOKIE_PREFIX = 'controlae_installation_gate_'
export const API_ORIGIN_COOKIE_PREFIX = 'controlae_api_origin_'
export const AUTH_COOKIE_PREFIX = 'controlae_token_'

export function isTenantSlug(value: string | null | undefined): value is string {
  return Boolean(value && TENANT_SLUG_PATTERN.test(value))
}

export function requestedTenantSlug(searchParams: URLSearchParams): string | null {
  const directSlug = searchParams.get('estabelecimento')?.trim().toLowerCase()
  if (isTenantSlug(directSlug)) return directSlug

  const establishmentLink = searchParams.get('link')
  if (!establishmentLink) return null
  try {
    const match = new URL(establishmentLink).pathname.replace(/\/+$/, '').match(/^\/e\/([^/]+)$/)
    const linkSlug = match?.[1]?.toLowerCase()
    return isTenantSlug(linkSlug) ? linkSlug : null
  } catch {
    return null
  }
}

export function requestedTenantRequiresActivation(
  boundSlug: string | null | undefined,
  requestedSlug: string | null | undefined,
): boolean {
  return Boolean(requestedSlug && requestedSlug !== boundSlug)
}

function tenantCookieName(prefix: string, slug: string): string {
  if (!isTenantSlug(slug)) throw new Error('Slug de estabelecimento inválido')
  return `${prefix}${slug}`
}

export const installationCookieName = (slug: string) => tenantCookieName(INSTALLATION_COOKIE_PREFIX, slug)
export const installationGateCookieName = (slug: string) => tenantCookieName(INSTALLATION_GATE_COOKIE_PREFIX, slug)
export const apiOriginCookieName = (slug: string) => tenantCookieName(API_ORIGIN_COOKIE_PREFIX, slug)
export const authCookieName = (slug: string) => tenantCookieName(AUTH_COOKIE_PREFIX, slug)

export function selectTenantForTab(slug: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage || !isTenantSlug(slug)) return
  window.sessionStorage.setItem(TAB_TENANT_KEY, slug)
}

export function tenantForCurrentTab(): string | null {
  if (typeof window === 'undefined') return null

  const requested = requestedTenantSlug(new URLSearchParams(window.location?.search || ''))
  if (requested) {
    selectTenantForTab(requested)
    return requested
  }

  const stored = window.sessionStorage?.getItem(TAB_TENANT_KEY)?.trim().toLowerCase()
  if (isTenantSlug(stored)) return stored

  const legacyMatch = document.cookie.match(/(?:^|;\s*)controlae_tenant_slug=([^;]+)/)
  const legacySlug = legacyMatch ? decodeURIComponent(legacyMatch[1]).toLowerCase() : undefined
  return isTenantSlug(legacySlug) ? legacySlug : null
}

export function tenantResourceUrl(value: string): string {
  if (typeof window === 'undefined' || (!value.startsWith('/api/') && !value.startsWith('/uploads/'))) return value
  const tenantSlug = tenantForCurrentTab()
  if (!tenantSlug) return value
  const url = new URL(value, window.location.origin)
  url.searchParams.set('estabelecimento', tenantSlug)
  return `${url.pathname}${url.search}`
}
