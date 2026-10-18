import { NextRequest, NextResponse } from 'next/server'
import {
  TENANT_COOKIE,
  apiOriginCookieName,
  createInstallationGate,
  installationCookieName,
  installationGateCookieName,
  normalizeApiUrl,
  sealInstallationBinding,
} from '@/app/lib/installation-binding'
import { isTenantSlug } from '@/app/lib/tenant-navigation'

type RedeemResponse = {
  deviceToken?: unknown
  expiresAt?: unknown
  estabelecimento?: { slug?: unknown; nome?: unknown }
  usuario?: { id?: unknown; nome?: unknown; role?: unknown }
  error?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { slug?: unknown; invite?: unknown; deviceName?: unknown }
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
    const invite = typeof body.invite === 'string' ? body.invite.trim() : ''
    if (!isTenantSlug(slug) || !invite) return NextResponse.json({ error: 'Link de acesso inválido' }, { status: 400 })

    const configuredApiUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL
    if (!configuredApiUrl) return NextResponse.json({ error: 'A URL da API não foi configurada' }, { status: 503 })
    const apiUrl = normalizeApiUrl(configuredApiUrl)
    const backendResponse = await fetch(`${apiUrl}/installation/device/redeem`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, invite, deviceName: typeof body.deviceName === 'string' ? body.deviceName : undefined }),
      cache: 'no-store',
      redirect: 'error',
    })
    const result = await backendResponse.json().catch(() => ({})) as RedeemResponse
    if (!backendResponse.ok) {
      return NextResponse.json({ error: typeof result.error === 'string' ? result.error : 'Não foi possível liberar este aparelho' }, { status: backendResponse.status })
    }
    if (typeof result.deviceToken !== 'string' || typeof result.expiresAt !== 'number' ||
        result.estabelecimento?.slug !== slug || typeof result.estabelecimento.nome !== 'string') {
      return NextResponse.json({ error: 'A API respondeu com um vínculo inválido' }, { status: 502 })
    }

    const expiresAt = result.expiresAt
    const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))
    const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
    const establishmentUrl = `${request.nextUrl.origin}/e/${slug}`
    const bindingValue = sealInstallationBinding({
      apiUrl,
      establishmentUrl,
      installationToken: result.deviceToken,
      tenantSlug: slug,
      establishmentName: result.estabelecimento.nome,
      expiresAt,
    })
    const response = NextResponse.json({ success: true, estabelecimento: result.estabelecimento, usuario: result.usuario })
    response.cookies.set(installationCookieName(slug), bindingValue, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(installationGateCookieName(slug), createInstallationGate(bindingValue, expiresAt), { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(TENANT_COOKIE, slug, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge, priority: 'high' })
    response.cookies.set(apiOriginCookieName(slug), apiUrl, { httpOnly: false, secure, sameSite: 'strict', path: '/', maxAge })
    return response
  } catch {
    return NextResponse.json({ error: 'Não foi possível conectar à API' }, { status: 502 })
  }
}
