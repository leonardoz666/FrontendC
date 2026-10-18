import { NextRequest, NextResponse } from 'next/server'
import { installationBindingForTenant, normalizeApiUrl } from './installation-binding'
import { configuredTimeout, fetchWithTimeout } from './fetch-timeout'
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
    const cookie = forwardedCookie(request, requestedSlug)
    const isLogin = pathname === '/auth/login' && request.method.toUpperCase() === 'POST'
    if (!binding && !cookie && !isLogin) {
      return NextResponse.json({ code: 'INSTALLATION_REQUIRED', error: 'Este aparelho ainda não possui uma sessão ou vínculo de acesso' }, { status: 428 })
    }
    const fallbackBackend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL
    if (!binding && !fallbackBackend) {
      return NextResponse.json({ error: 'A URL da API não foi configurada nesta implantação' }, { status: 503 })
    }
    const backend = binding?.apiUrl || normalizeApiUrl(fallbackBackend!)
    const target = new URL(pathname.replace(/^\/+/, ''), `${backend}/`)
    target.search = incomingUrl.search
    target.searchParams.delete('estabelecimento')

    const headers = new Headers(request.headers)
    for (const name of HOP_BY_HOP_HEADERS) headers.delete(name)
    // A aba informa o tenant desejado, mas somente o vínculo criptografado
    // correspondente autoriza a API e o estabelecimento encaminhados.
    headers.delete('x-tenant-slug')
    headers.delete(TENANT_HEADER)
    if (cookie) headers.set('cookie', cookie)
    else headers.delete('cookie')
    headers.set('x-tenant-slug', requestedSlug)
    if (binding) headers.set('x-controlae-installation', binding.installationToken)
    else headers.delete('x-controlae-installation')

    const method = request.method.toUpperCase()
    const response = await fetchWithTimeout(target, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    }, configuredTimeout(process.env.BACKEND_PROXY_TIMEOUT_MS))

    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-length')
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('transfer-encoding')
    isolateBackendAuthCookie(responseHeaders, requestedSlug)
    responseHeaders.set('cache-control', 'private, no-store, max-age=0')
    responseHeaders.set('vary', 'Cookie, x-tenant-slug')
    return new Response(response.body, { status: response.status, headers: responseHeaders })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json(
      { error: timedOut ? 'A API configurada não respondeu a tempo' : 'Não foi possível conectar à API configurada' },
      { status: timedOut ? 504 : 502 },
    )
  }
}
