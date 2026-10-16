export type FetchImplementation = (input: string | URL, init?: RequestInit) => Promise<Response>

export function configuredTimeout(rawValue: string | undefined, fallbackMs = 10_000): number {
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : fallbackMs
}

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
  fetchImplementation: FetchImplementation = fetch,
): Promise<Response> {
  const controller = new AbortController()
  const forwardAbort = () => controller.abort()
  if (init.signal?.aborted) forwardAbort()
  else init.signal?.addEventListener('abort', forwardAbort, { once: true })
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetchImplementation(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
    init.signal?.removeEventListener('abort', forwardAbort)
  }
}
