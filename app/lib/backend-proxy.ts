import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL_COOKIE, normalizeBackendUrl } from './backend-config'

const FALLBACK_BACKEND_URL = 'https://backendrei.onrender.com'
const HOP_BY_HOP_HEADERS = ['connection', 'content-length', 'host', 'transfer-encoding']

function configuredBackend(request: NextRequest): string {
  const cookieValue = request.cookies.get(BACKEND_URL_COOKIE)?.value
  const raw = cookieValue ? decodeURIComponent(cookieValue) : process.env.NEXT_PUBLIC_API_URL || FALLBACK_BACKEND_URL
  return normalizeBackendUrl(raw)
}

function forwardedCookie(request: NextRequest): string {
  return request.cookies
    .getAll()
    .filter(cookie => cookie.name !== BACKEND_URL_COOKIE)
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

export async function proxyBackendRequest(request: NextRequest, pathname: string): Promise<Response> {
  try {
    const backend = configuredBackend(request)
    const incomingUrl = new URL(request.url)
    const target = new URL(pathname.replace(/^\/+/, ''), `${backend}/`)
    target.search = incomingUrl.search

    const headers = new Headers(request.headers)
    for (const name of HOP_BY_HOP_HEADERS) headers.delete(name)
    const cookie = forwardedCookie(request)
    if (cookie) headers.set('cookie', cookie)
    else headers.delete('cookie')

    const method = request.method.toUpperCase()
    const response = await fetch(target, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    })

    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-length')
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('transfer-encoding')
    return new Response(response.body, { status: response.status, headers: responseHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida'
    return NextResponse.json(
      { error: `Não foi possível conectar ao backend configurado: ${message}` },
      { status: 502 },
    )
  }
}
