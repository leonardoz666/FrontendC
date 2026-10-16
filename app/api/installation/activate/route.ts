import { NextRequest, NextResponse } from 'next/server'
import {
  API_ORIGIN_COOKIE,
  INSTALLATION_COOKIE,
  INSTALLATION_GATE_COOKIE,
  TENANT_COOKIE,
  createInstallationGate,
  normalizeApiUrl,
  sealInstallationBinding,
} from '@/app/lib/installation-binding'

type ActivationResponse = {
  installationToken?: unknown
  estabelecimento?: { slug?: unknown; nome?: unknown }
  error?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { apiUrl?: unknown; code?: unknown }
    if (typeof body.apiUrl !== 'string' || typeof body.code !== 'string' || !body.code.trim()) {
      return NextResponse.json({ error: 'Informe a URL da API e o código de ativação' }, { status: 400 })
    }
    const apiUrl = normalizeApiUrl(body.apiUrl)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    let backendResponse: Response
    try {
      backendResponse = await fetch(`${apiUrl}/installation/activate`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: body.code.trim() }),
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

    const maxAge = 365 * 24 * 60 * 60
    const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
    const response = NextResponse.json({ success: true, estabelecimento: { slug, nome: name } })
    const expiresAt = Date.now() + maxAge * 1000
    const bindingValue = sealInstallationBinding({
      apiUrl,
      installationToken: token,
      tenantSlug: slug,
      establishmentName: name,
      expiresAt,
    })
    response.cookies.set(INSTALLATION_COOKIE, bindingValue, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(INSTALLATION_GATE_COOKIE, createInstallationGate(bindingValue, expiresAt), { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(TENANT_COOKIE, slug, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(API_ORIGIN_COOKIE, apiUrl, { httpOnly: false, secure, sameSite: 'strict', path: '/', maxAge })
    return response
  } catch (error) {
    const message = error instanceof Error && error.name !== 'AbortError'
      ? error.message
      : 'A API não respondeu a tempo. Confirme o endereço e tente novamente.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
