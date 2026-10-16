import { NextRequest, NextResponse } from 'next/server'
import {
  TENANT_COOKIE,
  apiOriginCookieName,
  createInstallationGate,
  installationCookieName,
  installationGateCookieName,
  normalizeApiUrl,
  normalizeEstablishmentUrl,
  openInstallationBinding,
  sealInstallationBinding,
  INSTALLATION_COOKIE,
} from '../../../lib/installation-binding'
import { authCookieName } from '../../../lib/tenant-navigation'

type ActivationResponse = {
  installationToken?: unknown
  estabelecimento?: { slug?: unknown; nome?: unknown }
  error?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { establishmentUrl?: unknown; code?: unknown }
    if (typeof body.establishmentUrl !== 'string' || typeof body.code !== 'string' || !body.code.trim()) {
      return NextResponse.json({ error: 'Informe o link do estabelecimento e o código de ativação' }, { status: 400 })
    }
    const establishment = normalizeEstablishmentUrl(body.establishmentUrl)
    const apiUrl = normalizeApiUrl(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backendrei.onrender.com')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let backendResponse: Response
    try {
      backendResponse = await fetch(`${apiUrl}/installation/activate`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: body.code.trim(), slug: establishment.slug }),
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
    const result = await backendResponse.json().catch(() => ({})) as ActivationResponse
    if (!backendResponse.ok) {
      const message = typeof result.error === 'string' ? result.error : 'A API recusou a ativação'
      return NextResponse.json({ error: message }, { status: backendResponse.status })
    }
    const token = result.installationToken
    const slug = result.estabelecimento?.slug
    const name = result.estabelecimento?.nome
    if (typeof token !== 'string' || typeof slug !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'A API respondeu com um vínculo inválido' }, { status: 502 })
    }
    if (slug !== establishment.slug) {
      return NextResponse.json({ error: 'O código não pertence ao link informado' }, { status: 401 })
    }

    const maxAge = 365 * 24 * 60 * 60
    const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
    const response = NextResponse.json({ success: true, estabelecimento: { slug, nome: name } })
    const expiresAt = Date.now() + maxAge * 1000
    const legacyBindingValue = request.cookies.get(INSTALLATION_COOKIE)?.value
    const legacyBinding = openInstallationBinding(legacyBindingValue)
    if (legacyBinding && legacyBindingValue && legacyBinding.tenantSlug !== slug) {
      const legacyMaxAge = Math.max(1, Math.floor((legacyBinding.expiresAt - Date.now()) / 1000))
      response.cookies.set(installationCookieName(legacyBinding.tenantSlug), legacyBindingValue, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: legacyMaxAge, priority: 'high' })
      response.cookies.set(installationGateCookieName(legacyBinding.tenantSlug), createInstallationGate(legacyBindingValue, legacyBinding.expiresAt), { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: legacyMaxAge, priority: 'high' })
      response.cookies.set(apiOriginCookieName(legacyBinding.tenantSlug), legacyBinding.apiUrl, { httpOnly: false, secure, sameSite: 'strict', path: '/', maxAge: legacyMaxAge })
      const legacyAuthToken = request.cookies.get('token')?.value
      if (legacyAuthToken) response.cookies.set(authCookieName(legacyBinding.tenantSlug), legacyAuthToken, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: legacyMaxAge, priority: 'high' })
    }
    const bindingValue = sealInstallationBinding({
      apiUrl,
      establishmentUrl: establishment.url,
      installationToken: token,
      tenantSlug: slug,
      establishmentName: name,
      expiresAt,
    })
    response.cookies.set(installationCookieName(slug), bindingValue, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(installationGateCookieName(slug), createInstallationGate(bindingValue, expiresAt), { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(TENANT_COOKIE, slug, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(apiOriginCookieName(slug), apiUrl, { httpOnly: false, secure, sameSite: 'strict', path: '/', maxAge })
    return response
  } catch (error) {
    const message = error instanceof Error && error.name !== 'AbortError'
      ? error.message
      : 'O servidor não respondeu a tempo. Tente novamente em alguns instantes.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
