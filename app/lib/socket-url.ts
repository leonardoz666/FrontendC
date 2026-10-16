export function getSocketUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)controlae_api_origin=([^;]+)/)
  return match ? decodeURIComponent(match[1]).replace(/\/$/, '') : undefined
}
