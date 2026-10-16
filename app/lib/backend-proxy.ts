import { NextRequest, NextResponse } from 'next/server'
import { installationBindingForTenant } from './installation-binding'
import { TENANT_HEADER, authCookieName, isTenantSlug, requestedTenantSlug } from './tenant-navigation'

const HOP_BY_HOP_HEADERS = ['connection', 'content-length', 'host', 'transfer-encoding']

function forwardedCookie(request: NextRequest, tenantSlug: string): string {
  const tenantToken = request.cookies.get(authCookieName(tenantSlug))?.value
  const legacyToken = request.cookies.get('controlae_tenant_slug')?.value === tenantSlug
    ? request.cookies.get('token')?.value
    : undefined
  const token = tenantToken || legacyToken
  return token ? `token=${token}` : ''
}

function isolateBackendAuthCookie(headers: Headers, tenantSlug: string): void {
  const setCookie = headers.get('set-cookie')
  if (!setCookie) return
  headers.set('set-cookie', setCookie.replace(/(^|,\s*)token=/gi, `$1${authCookieName(tenantSlug)}=`))
}

export async function proxyBackendRequest(request: NextRequest, pathname: string): Promise<Response> {
  try {
    const incomingUrl = new URL(request.url)
    const requestedSlug = request.headers.get(TENANT_HEADER)?.trim().toLowerCase()
      || requestedTenantSlug(incomingUrl.searchParams)
    if (!isTenantSlug(requestedSlug)) {
      return NextResponse.json({ code: 'TENANT_REQUIRED', error: 'Abra o link específico do estabelecimento' }, { status: 400 })
    }
    const binding = installationBindingForTenant(request.cookies, requestedSlug)
    if (!binding) return NextResponse.json({ code: 'INSTALLATION_REQUIRED', error: 'Ative este aplicativo antes de continuar' }, { status: 428 })
    const backend = binding.apiUrl
    const target = new URL(pathname.replace(/^\/+/, ''), `${backend}/`)
    target.search = incomingUrl.search
    target.searchParams.delete('estabelecimento')

    const headers = new Headers(request.headers)
    for (const name of HOP_BY_HOP_HEADERS) headers.delete(name)
    // A aba informa o tenant desejado, mas somente o vínculo criptografado
    // correspondente autoriza a API e o estabelecimento encaminhados.
    headers.delete('x-tenant-slug')
    headers.delete(TENANT_HEADER)
    const cookie = forwardedCookie(request, requestedSlug)
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
    isolateBackendAuthCookie(responseHeaders, requestedSlug)
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
