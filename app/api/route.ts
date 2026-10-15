import { NextRequest } from 'next/server'
import { proxyBackendRequest } from '@/app/lib/backend-proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const handler = (request: NextRequest) => proxyBackendRequest(request, '/')

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
