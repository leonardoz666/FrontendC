const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const TAB_TENANT_KEY = 'controlae:tab-tenant'
const TENANT_PATH_PATTERN = /^\/e\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(.*))?$/

export const TENANT_HEADER = 'x-controlae-tenant'
export const LOGIN_PATH = '/login'
export const INSTALLATION_COOKIE_PREFIX = 'controlae_installation_'
export const INSTALLATION_GATE_COOKIE_PREFIX = 'controlae_installation_gate_'
export const API_ORIGIN_COOKIE_PREFIX = 'controlae_api_origin_'
export const AUTH_COOKIE_PREFIX = 'controlae_token_'

export function isTenantSlug(value: string | null | undefined): value is string {
  return Boolean(value && TENANT_SLUG_PATTERN.test(value))
}

export function tenantSlugFromPathname(pathname: string | null | undefined): string | null {
  const match = pathname?.match(TENANT_PATH_PATTERN)
  return isTenantSlug(match?.[1]) ? match[1] : null
}

/**
 * Traduz a URL pública tenant-aware para a rota que o App Router já implementa.
 * `/inicio` representa a página operacional `/`; `/e/<slug>` continua reservado
 * para o link de entrada/ativação do estabelecimento.
 */
export function operationalPathname(pathname: string): string {
  const match = pathname.match(TENANT_PATH_PATTERN)
  if (!match || match[2] === undefined) return pathname
  const suffix = `/${match[2]}`.replace(/\/{2,}/g, '/')
  return suffix === '/inicio' ? '/' : suffix
}

export function requestedTenantSlug(searchParams: URLSearchParams, pathname?: string | null): string | null {
  const pathSlug = tenantSlugFromPathname(pathname)
  if (pathSlug) return pathSlug

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

  const requested = requestedTenantSlug(
    new URLSearchParams(window.location?.search || ''),
    window.location?.pathname,
  )
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

/**
 * Interface única para URLs de páginas autenticadas. Rotas técnicas e páginas
 * públicas conservam o endereço original; páginas operacionais carregam o slug
 * no caminho para que favoritos, novas abas e capturas sejam autoexplicativos.
 */
export function tenantPageUrl(value: string, explicitSlug?: string | null): string {
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//') || value.startsWith('#')) return value

  const hashIndex = value.indexOf('#')
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value
  const queryIndex = withoutHash.indexOf('?')
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : ''
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (
    normalizedPathname.startsWith('/e/')
    || normalizedPathname === '/instalacao'
    || normalizedPathname.startsWith('/api/')
    || normalizedPathname === '/api'
    || normalizedPathname.startsWith('/uploads/')
    || normalizedPathname.startsWith('/_next/')
    || normalizedPathname === '/offline'
  ) return value

  const slug = explicitSlug || (typeof window === 'undefined' ? null : tenantForCurrentTab())
  if (!isTenantSlug(slug)) return value
  const tenantPath = normalizedPathname === '/' ? `/e/${slug}/inicio` : `/e/${slug}${normalizedPathname}`
  return `${tenantPath}${query}${hash}`
}

export function tenantResourceUrl(value: string): string {
  if (typeof window === 'undefined' || (!value.startsWith('/api/') && !value.startsWith('/uploads/'))) return value
  const tenantSlug = tenantForCurrentTab()
  if (!tenantSlug) return value
  const url = new URL(value, window.location.origin)
  url.searchParams.set('estabelecimento', tenantSlug)
  return `${url.pathname}${url.search}`
}
