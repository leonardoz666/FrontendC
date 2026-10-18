import { NextRequest, NextResponse } from 'next/server'
import { installationBindingForTenant } from '@/app/lib/installation-binding'
import { tenantPageUrl } from '@/app/lib/tenant-navigation'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await context.params
  const slug = rawSlug.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.redirect(new URL('/instalacao?erro=estabelecimento-invalido', request.url))
  }

  const binding = installationBindingForTenant(request.cookies, slug)
  if (binding) {
    return NextResponse.redirect(new URL(tenantPageUrl('/login', slug), request.url))
  }
  const destination = new URL(`/acesso/${slug}`, request.url)
  const response = NextResponse.redirect(destination)
  response.headers.set('cache-control', 'private, no-store, max-age=0')
  return response
}
