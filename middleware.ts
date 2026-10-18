import { NextRequest, NextResponse } from 'next/server'
import {
  INSTALLATION_COOKIE_PREFIX,
  INSTALLATION_GATE_COOKIE_PREFIX,
  TENANT_HEADER,
  authCookieName,
  installationCookieName,
  installationGateCookieName,
  isTenantSlug,
  operationalPathname,
  requestedTenantSlug,
  tenantPageUrl,
  tenantSlugFromPathname,
} from './app/lib/tenant-navigation'
import { resolveInstallationSecret } from './app/lib/installation-secret'

const INSTALLATION_COOKIE = 'controlae_installation'
const INSTALLATION_GATE_COOKIE = 'controlae_installation_gate'
const TENANT_COOKIE = 'controlae_tenant_slug'

function bytesToBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function validInstallationGate(binding: string | undefined, gate: string | undefined): Promise<boolean> {
  const secret = resolveInstallationSecret()
  if (!binding || !gate || !secret) return false
  const [expiresValue, signature, extra] = gate.split('.')
  const expiresAt = Number(expiresValue)
  if (!expiresValue || !signature || extra || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`controlae-frontend-gate\0${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = bytesToBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(`${expiresAt}.${binding}`)))
  if (expected.length !== signature.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index)
  return difference === 0
}

async function hasValidInstallationGate(request: NextRequest, tenantSlug?: string | null): Promise<boolean> {
  if (tenantSlug && isTenantSlug(tenantSlug)) {
    const tenantBinding = request.cookies.get(installationCookieName(tenantSlug))?.value
    const tenantGate = request.cookies.get(installationGateCookieName(tenantSlug))?.value
    if (await validInstallationGate(tenantBinding, tenantGate)) return true

    const legacySlug = request.cookies.get(TENANT_COOKIE)?.value
    if (legacySlug !== tenantSlug) return false
    return validInstallationGate(
      request.cookies.get(INSTALLATION_COOKIE)?.value,
      request.cookies.get(INSTALLATION_GATE_COOKIE)?.value,
    )
  }

  if (await validInstallationGate(
    request.cookies.get(INSTALLATION_COOKIE)?.value,
    request.cookies.get(INSTALLATION_GATE_COOKIE)?.value,
  )) return true

  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith(INSTALLATION_COOKIE_PREFIX)) continue
    const slug = cookie.name.slice(INSTALLATION_COOKIE_PREFIX.length)
    if (!isTenantSlug(slug)) continue
    const gate = request.cookies.get(`${INSTALLATION_GATE_COOKIE_PREFIX}${slug}`)?.value
    if (await validInstallationGate(cookie.value, gate)) return true
  }
  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const pathTenantSlug = tenantSlugFromPathname(pathname)
  const publicTenantRoute = Boolean(pathTenantSlug && /^\/e\/[^/]+\/(?:cardapio|vagas)(?:\/|$)/.test(pathname))
  const internalPathname = publicTenantRoute ? pathname : operationalPathname(pathname)
  const prefixedOperationalRoute = Boolean(pathTenantSlug && internalPathname !== pathname)
  const requestedSlug = requestedTenantSlug(request.nextUrl.searchParams, pathname)
    || request.headers.get(TENANT_HEADER)?.trim().toLowerCase()
  const boundSlugValue = request.cookies.get(TENANT_COOKIE)?.value
  const boundSlug = isTenantSlug(boundSlugValue) ? boundSlugValue : null
  const hasTenantSession = Boolean(requestedSlug && request.cookies.get(authCookieName(requestedSlug))?.value)

  if (internalPathname === '/instalacao') {
    const tenantToOpen = requestedSlug || boundSlug
    if (!tenantToOpen || !await hasValidInstallationGate(request, tenantToOpen)) return NextResponse.next()

    return NextResponse.redirect(new URL(tenantPageUrl('/login', tenantToOpen), request.url))
  }

  if (internalPathname === '/login' && requestedSlug && pathTenantSlug) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('estabelecimento', requestedSlug)
    return NextResponse.rewrite(url)
  }

  if (internalPathname === '/login' && requestedSlug) {
    return NextResponse.redirect(new URL(tenantPageUrl('/login', requestedSlug), request.url))
  }

  const installationRoute = internalPathname === '/offline'
    || pathname.startsWith('/api/installation/')
    || pathname.startsWith('/api/public/')
    || pathname.startsWith('/api/device-access/')
    || pathname.startsWith('/acesso/')
    || pathname === '/api/auth/login'
    || publicTenantRoute
    || (pathTenantSlug && !prefixedOperationalRoute)
  if (installationRoute) return NextResponse.next()

  if (prefixedOperationalRoute && requestedSlug && (hasTenantSession || await hasValidInstallationGate(request, requestedSlug))) {
    const url = request.nextUrl.clone()
    url.pathname = internalPathname
    url.searchParams.set('estabelecimento', requestedSlug)
    return NextResponse.rewrite(url)
  }

  if (internalPathname.startsWith('/api/') || internalPathname.startsWith('/uploads/')) {
    if (hasTenantSession || await hasValidInstallationGate(request, requestedSlug)) return NextResponse.next()
    return NextResponse.json({ code: 'INSTALLATION_REQUIRED', error: 'Ative este aplicativo antes de continuar' }, { status: 428 })
  }

  const tenantToOpen = requestedSlug || boundSlug
  if (tenantToOpen && (request.cookies.get(authCookieName(tenantToOpen))?.value || await hasValidInstallationGate(request, tenantToOpen))) {
    const canonicalSearch = new URLSearchParams(request.nextUrl.searchParams)
    canonicalSearch.delete('estabelecimento')
    const query = canonicalSearch.toString()
    const canonicalPath = tenantPageUrl(`${internalPathname}${query ? `?${query}` : ''}`, tenantToOpen)
    return NextResponse.redirect(new URL(canonicalPath, request.url))
  }

  const url = request.nextUrl.clone()
  url.pathname = '/instalacao'
  url.searchParams.set('retorno', internalPathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192x192.png|icon-512x512.png|manifest.json|sw.js|workbox-.*).*)'],
}
