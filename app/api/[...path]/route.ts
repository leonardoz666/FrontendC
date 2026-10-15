import { NextRequest } from 'next/server'
import { proxyBackendRequest } from '@/app/lib/backend-proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ path: string[] }> }

async function handler(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxyBackendRequest(request, `/${path.join('/')}`)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
