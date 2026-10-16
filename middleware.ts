import { NextRequest, NextResponse } from 'next/server'

const INSTALLATION_COOKIE = 'controlae_installation'
const INSTALLATION_GATE_COOKIE = 'controlae_installation_gate'

function bytesToBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function hasValidInstallationGate(request: NextRequest): Promise<boolean> {
  const binding = request.cookies.get(INSTALLATION_COOKIE)?.value
  const gate = request.cookies.get(INSTALLATION_GATE_COOKIE)?.value
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const installationRoute = pathname === '/instalacao' || pathname.startsWith('/api/installation/') || pathname.startsWith('/e/')
  if (installationRoute || await hasValidInstallationGate(request)) return NextResponse.next()
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
