import { NextRequest, NextResponse } from 'next/server'
import { INSTALLATION_COOKIE, openInstallationBinding } from '@/app/lib/installation-binding'

export async function GET(request: NextRequest) {
  const binding = openInstallationBinding(request.cookies.get(INSTALLATION_COOKIE)?.value)
  if (!binding) return NextResponse.json({ active: false }, { status: 404 })
  return NextResponse.json({
    active: true,
    establishmentUrl: binding.establishmentUrl,
    tenantSlug: binding.tenantSlug,
    establishmentName: binding.establishmentName,
  })
}
