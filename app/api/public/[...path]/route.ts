import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const configured = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL)?.trim()
  if (!configured) return NextResponse.json({ error: 'Backend público não configurado' }, { status: 503 })
  const { path } = await context.params
  if (!path.length || path.some(segment => !/^[A-Za-z0-9._-]+$/.test(segment))) return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
  const upstream = new URL(`/public/${path.join('/')}`, configured)
  upstream.search = request.nextUrl.search
  const response = await fetch(upstream, { headers: { accept: request.headers.get('accept') || '*/*', 'user-agent': 'ControlaE-Public-Proxy' }, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  return new NextResponse(response.body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/octet-stream', 'cache-control': response.headers.get('cache-control') || 'no-store' } })
}
