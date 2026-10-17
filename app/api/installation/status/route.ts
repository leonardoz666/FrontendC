import { NextRequest, NextResponse } from 'next/server'
import { INSTALLATION_COOKIE, TENANT_COOKIE, installationBindingForTenant, openInstallationBinding } from '@/app/lib/installation-binding'
import { TENANT_HEADER, apiOriginCookieName, isTenantSlug, requestedTenantSlug } from '@/app/lib/tenant-navigation'

export async function GET(request: NextRequest) {
  const requested = requestedTenantSlug(request.nextUrl.searchParams)
    || request.headers.get(TENANT_HEADER)?.trim().toLowerCase()
    || request.cookies.get(TENANT_COOKIE)?.value
  const binding = isTenantSlug(requested)
    ? installationBindingForTenant(request.cookies, requested)
    : openInstallationBinding(request.cookies.get(INSTALLATION_COOKIE)?.value)
  if (!binding) return NextResponse.json({ active: false }, { status: 404 })
  const response = NextResponse.json({
    active: true,
    apiUrl: binding.apiUrl,
    establishmentUrl: binding.establishmentUrl,
    tenantSlug: binding.tenantSlug,
    establishmentName: binding.establishmentName,
  })
  const maxAge = Math.max(1, Math.floor((binding.expiresAt - Date.now()) / 1000))
  response.cookies.set(apiOriginCookieName(binding.tenantSlug), binding.apiUrl, {
    httpOnly: false,
    secure: request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    sameSite: 'strict',
    path: '/',
    maxAge,
  })
  return response
}
