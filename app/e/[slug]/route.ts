import { NextRequest, NextResponse } from 'next/server'
import { INSTALLATION_COOKIE, openInstallationBinding } from '@/app/lib/installation-binding'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await context.params
  const slug = rawSlug.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.redirect(new URL('/instalacao?erro=estabelecimento-invalido', request.url))
  }

  const establishmentUrl = `${request.nextUrl.origin}/e/${slug}`
  const binding = openInstallationBinding(request.cookies.get(INSTALLATION_COOKIE)?.value)
  if (binding?.tenantSlug === slug) {
    return NextResponse.redirect(new URL(`/login?estabelecimento=${encodeURIComponent(slug)}`, request.url))
  }
  const destination = new URL('/instalacao', request.url)
  destination.searchParams.set('link', establishmentUrl)
  const response = NextResponse.redirect(destination)
  response.headers.set('cache-control', 'private, no-store, max-age=0')
  return response
}
