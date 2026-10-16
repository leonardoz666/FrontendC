import { NextRequest, NextResponse } from 'next/server'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await context.params
  const slug = rawSlug.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.redirect(new URL('/login?erro=estabelecimento-invalido', request.url))
  }

  const response = NextResponse.redirect(new URL(`/login?estabelecimento=${encodeURIComponent(slug)}`, request.url))
  response.cookies.set('controlae_tenant_slug', slug, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
    path: '/'
  })
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  response.headers.set('cache-control', 'private, no-store, max-age=0')
  response.headers.set('vary', 'Cookie')
  return response
}
