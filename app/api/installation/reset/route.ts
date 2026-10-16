import { NextRequest, NextResponse } from 'next/server'
import { API_ORIGIN_COOKIE, INSTALLATION_COOKIE, INSTALLATION_GATE_COOKIE, TENANT_COOKIE, openInstallationBinding } from '@/app/lib/installation-binding'
import {
  TENANT_HEADER,
  apiOriginCookieName,
  authCookieName,
  installationCookieName,
  installationGateCookieName,
  isTenantSlug,
  requestedTenantSlug,
} from '@/app/lib/tenant-navigation'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  const requested = requestedTenantSlug(request.nextUrl.searchParams)
    || request.headers.get(TENANT_HEADER)?.trim().toLowerCase()
  const names = isTenantSlug(requested)
    ? [installationCookieName(requested), installationGateCookieName(requested), apiOriginCookieName(requested), authCookieName(requested)]
    : [INSTALLATION_COOKIE, INSTALLATION_GATE_COOKIE, API_ORIGIN_COOKIE, TENANT_COOKIE, 'token']
  const legacyBinding = openInstallationBinding(request.cookies.get(INSTALLATION_COOKIE)?.value)
  if (isTenantSlug(requested) && legacyBinding?.tenantSlug === requested) {
    names.push(INSTALLATION_COOKIE, INSTALLATION_GATE_COOKIE, API_ORIGIN_COOKIE, 'token')
  }
  for (const name of names) {
    response.cookies.set(name, '', { httpOnly: name !== API_ORIGIN_COOKIE, secure, sameSite: 'strict', path: '/', maxAge: 0 })
  }
  return response
}
