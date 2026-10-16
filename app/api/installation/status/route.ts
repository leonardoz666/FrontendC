import { NextRequest, NextResponse } from 'next/server'
import { INSTALLATION_COOKIE, TENANT_COOKIE, installationBindingForTenant, openInstallationBinding } from '@/app/lib/installation-binding'
import { TENANT_HEADER, isTenantSlug, requestedTenantSlug } from '@/app/lib/tenant-navigation'

export async function GET(request: NextRequest) {
  const requested = requestedTenantSlug(request.nextUrl.searchParams)
    || request.headers.get(TENANT_HEADER)?.trim().toLowerCase()
    || request.cookies.get(TENANT_COOKIE)?.value
  const binding = isTenantSlug(requested)
    ? installationBindingForTenant(request.cookies, requested)
    : openInstallationBinding(request.cookies.get(INSTALLATION_COOKIE)?.value)
  if (!binding) return NextResponse.json({ active: false }, { status: 404 })
  return NextResponse.json({
    active: true,
    establishmentUrl: binding.establishmentUrl,
    tenantSlug: binding.tenantSlug,
    establishmentName: binding.establishmentName,
  })
}
