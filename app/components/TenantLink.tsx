'use client'

import NextLink from 'next/link'
import { forwardRef, type ComponentProps } from 'react'
import { tenantPageUrl } from '@/app/lib/tenant-navigation'
import { useActiveTenantSlug } from '@/app/lib/tenant-router'

type TenantLinkProps = ComponentProps<typeof NextLink>

const TenantLink = forwardRef<HTMLAnchorElement, TenantLinkProps>(function TenantLink(
  { href, ...props },
  ref,
) {
  const tenantSlug = useActiveTenantSlug()
  const tenantHref = typeof href === 'string'
    ? tenantPageUrl(href, tenantSlug)
    : typeof href.pathname === 'string'
      ? { ...href, pathname: tenantPageUrl(href.pathname, tenantSlug) }
      : href

  return <NextLink ref={ref} href={tenantHref} {...props} />
})

TenantLink.displayName = 'TenantLink'

export default TenantLink
