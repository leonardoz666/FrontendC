import { NextRequest, NextResponse } from 'next/server'
import { tenantPageUrl } from '@/app/lib/tenant-navigation'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await context.params
  const slug = rawSlug.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.redirect(new URL('/instalacao?erro=estabelecimento-invalido', request.url))
  }

  const configuredApiUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL
  if (!configuredApiUrl) {
    return NextResponse.redirect(new URL(`/instalacao?link=${encodeURIComponent(`${request.nextUrl.origin}/e/${slug}`)}&erro=api-indisponivel`, request.url))
  }

  try {
    const response = await fetch(`${configuredApiUrl.replace(/\/+$/, '')}/installation/establishments/${encodeURIComponent(slug)}/status`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (response.ok) {
      const status = await response.json() as { activated?: boolean; available?: boolean }
      if (status.activated && status.available) {
        return NextResponse.redirect(new URL(tenantPageUrl('/login', slug), request.url))
      }
    }
  } catch {
    // A tela de ativação explica a indisponibilidade sem expor detalhes da API.
  }

  const destination = new URL('/instalacao', request.url)
  destination.searchParams.set('link', `${request.nextUrl.origin}/e/${slug}`)
  const response = NextResponse.redirect(destination)
  response.headers.set('cache-control', 'private, no-store, max-age=0')
  return response
}
