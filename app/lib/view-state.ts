import { tenantForCurrentTab } from './tenant-navigation'

type UrlValue = string | number | null | undefined

export function readUrlViewState<T extends Record<string, string>>(defaults: T): T {
  if (typeof window === 'undefined') return defaults

  const params = new URLSearchParams(window.location.search)
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, params.get(key) ?? fallback])
  ) as T
}

export function replaceUrlViewState(values: Record<string, UrlValue>): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
  })
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

function tenantDraftKey(scope: string): string {
  return `controlae:draft:${tenantForCurrentTab() ?? 'sem-estabelecimento'}:${scope}`
}

function tenantPreferenceKey(scope: string): string {
  return `controlae:preference:${tenantForCurrentTab() ?? 'sem-estabelecimento'}:${scope}`
}

export function readTenantDraft<T>(scope: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(tenantDraftKey(scope))
    return stored ? JSON.parse(stored) as T : null
  } catch {
    return null
  }
}

export function writeTenantDraft<T>(scope: string, value: T): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(tenantDraftKey(scope), JSON.stringify(value))
}

export function clearTenantDraft(scope: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(tenantDraftKey(scope))
}

export function readTenantPreference<T>(scope: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(tenantPreferenceKey(scope))
    return stored ? JSON.parse(stored) as T : null
  } catch {
    return null
  }
}

export function writeTenantPreference<T>(scope: string, value: T): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(tenantPreferenceKey(scope), JSON.stringify(value))
}
