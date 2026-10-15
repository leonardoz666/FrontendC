import { NextRequest } from 'next/server'
import { proxyBackendRequest } from '@/app/lib/backend-proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyBackendRequest(request, `/uploads/${path.join('/')}`)
}
