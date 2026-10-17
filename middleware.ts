import { NextRequest, NextResponse } from 'next/server'
import {
  INSTALLATION_COOKIE_PREFIX,
  INSTALLATION_GATE_COOKIE_PREFIX,
  TENANT_HEADER,
  installationCookieName,
  installationGateCookieName,
  isTenantSlug,
  requestedTenantSlug,
} from './app/lib/tenant-navigation'

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
  const secret = process.env.FRONTEND_INSTALLATION_SECRET?.trim()
  if (!binding || !gate || !secret || secret.length < 32) return false
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
  const requestedSlug = requestedTenantSlug(request.nextUrl.searchParams)
    || request.headers.get(TENANT_HEADER)?.trim().toLowerCase()
  const boundSlugValue = request.cookies.get(TENANT_COOKIE)?.value
  const boundSlug = isTenantSlug(boundSlugValue) ? boundSlugValue : null

  if (pathname === '/instalacao') {
    const tenantToOpen = requestedSlug || boundSlug
    if (!tenantToOpen || !await hasValidInstallationGate(request, tenantToOpen)) return NextResponse.next()

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('estabelecimento', tenantToOpen)
    return NextResponse.redirect(url)
  }

  if (pathname === '/login' && requestedSlug && !await hasValidInstallationGate(request, requestedSlug)) {
    const url = request.nextUrl.clone()
    url.pathname = '/instalacao'
    url.search = ''
    url.searchParams.set('estabelecimento', requestedSlug)
    url.searchParams.set('retorno', '/login')
    return NextResponse.redirect(url)
  }

  const installationRoute = pathname.startsWith('/api/installation/') || pathname.startsWith('/api/public/') || pathname.startsWith('/e/')
  if (installationRoute || await hasValidInstallationGate(request, requestedSlug)) return NextResponse.next()
  if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
    return NextResponse.json({ code: 'INSTALLATION_REQUIRED', error: 'Ative este aplicativo antes de continuar' }, { status: 428 })
  }
  const url = request.nextUrl.clone()
  url.pathname = '/instalacao'
  url.searchParams.set('retorno', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192x192.png|icon-512x512.png|manifest.json|sw.js|workbox-.*).*)'],
}
