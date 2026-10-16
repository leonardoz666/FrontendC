import { NextRequest, NextResponse } from 'next/server'
import { INSTALLATION_COOKIE, openInstallationBinding } from './installation-binding'

const HOP_BY_HOP_HEADERS = ['connection', 'content-length', 'host', 'transfer-encoding']

function forwardedCookie(request: NextRequest): string {
  return request.cookies
    .getAll()
    .filter(cookie => cookie.name === 'token')
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

export async function proxyBackendRequest(request: NextRequest, pathname: string): Promise<Response> {
  try {
    const binding = openInstallationBinding(request.cookies.get(INSTALLATION_COOKIE)?.value)
    if (!binding) return NextResponse.json({ code: 'INSTALLATION_REQUIRED', error: 'Ative este aplicativo antes de continuar' }, { status: 428 })
    const backend = binding.apiUrl
    const incomingUrl = new URL(request.url)
    const target = new URL(pathname.replace(/^\/+/, ''), `${backend}/`)
    target.search = incomingUrl.search

    const headers = new Headers(request.headers)
    for (const name of HOP_BY_HOP_HEADERS) headers.delete(name)
    // O navegador não escolhe o tenant por cabeçalho. O vínculo criptografado
    // da instalação define a API e o estabelecimento encaminhados ao backend.
    headers.delete('x-tenant-slug')
    const cookie = forwardedCookie(request)
    if (cookie) headers.set('cookie', cookie)
    else headers.delete('cookie')
    headers.set('x-tenant-slug', binding.tenantSlug)
    headers.set('x-controlae-installation', binding.installationToken)

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
    responseHeaders.set('cache-control', 'private, no-store, max-age=0')
    responseHeaders.set('vary', 'Cookie, x-tenant-slug')
    return new Response(response.body, { status: response.status, headers: responseHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida'
    return NextResponse.json(
      { error: `Não foi possível conectar ao backend configurado: ${message}` },
      { status: 502 },
    )
  }
}
