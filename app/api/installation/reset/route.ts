import { NextRequest, NextResponse } from 'next/server'
import { API_ORIGIN_COOKIE, INSTALLATION_COOKIE, INSTALLATION_GATE_COOKIE, TENANT_COOKIE } from '@/app/lib/installation-binding'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  for (const name of [INSTALLATION_COOKIE, INSTALLATION_GATE_COOKIE, API_ORIGIN_COOKIE, TENANT_COOKIE, 'token']) {
    response.cookies.set(name, '', { httpOnly: name !== API_ORIGIN_COOKIE, secure, sameSite: 'strict', path: '/', maxAge: 0 })
  }
  return response
}
