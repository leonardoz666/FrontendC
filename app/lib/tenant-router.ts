'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  requestedTenantSlug,
  tenantForCurrentTab,
  tenantPageUrl,
  tenantSlugFromPathname,
} from './tenant-navigation'

export function useActiveTenantSlug(): string | null {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return tenantSlugFromPathname(pathname)
    || requestedTenantSlug(searchParams, pathname)
    || tenantForCurrentTab()
}

/**
 * Mesmo contrato de navegação usado pelas telas, com a regra multi-tenant
 * encapsulada: todo push/replace de página conserva o slug na URL pública.
 */
export function useTenantRouter() {
  const router = useRouter()
  const tenantSlug = useActiveTenantSlug()

  const push = useCallback((href: string, options?: Parameters<typeof router.push>[1]) => {
    router.push(tenantPageUrl(href, tenantSlug), options)
  }, [router, tenantSlug])

  const replace = useCallback((href: string, options?: Parameters<typeof router.replace>[1]) => {
    router.replace(tenantPageUrl(href, tenantSlug), options)
  }, [router, tenantSlug])

  return {
    back: router.back,
    forward: router.forward,
    prefetch: router.prefetch,
    refresh: router.refresh,
    push,
    replace,
  }
}
