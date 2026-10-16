export const PRINTER_AGENT_STORAGE_KEY = 'controlae:printer-agent-connection'

export type PrinterAgentConnection = {
  url: string
  token: string
  manual: boolean
}

export type PrinterAgentAddressSpace = 'loopback' | 'local'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function normalizePrinterAgentUrl(value: string): string {
  const text = value.trim()
  if (!text) throw new Error('Informe o endereço do agente')

  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    throw new Error('Endereço inválido. Use, por exemplo, http://127.0.0.1:4100')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('O endereço do agente deve começar com http:// ou https://')
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== '/')) {
    throw new Error('Informe somente o endereço base do agente, sem caminho, usuário ou parâmetros')
  }

  return parsed.origin
}

export function printerAgentAddressSpace(url: string): PrinterAgentAddressSpace {
  const hostname = new URL(normalizePrinterAgentUrl(url)).hostname.toLowerCase()
  return hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.')
    ? 'loopback'
    : 'local'
}

export async function printerAgentPermissionState(url: string): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null
  const addressSpace = printerAgentAddressSpace(url)
  const names = addressSpace === 'loopback'
    ? ['loopback-network', 'local-network-access']
    : ['local-network', 'local-network-access']

  for (const name of names) {
    try {
      const status = await navigator.permissions.query({ name } as PermissionDescriptor)
      return status.state
    } catch {
      // Navegadores sem a permissão nova ainda podem acessar o agente via CORS.
    }
  }
  return null
}

export function printerAgentFetchOptions(url: string, options: RequestInit = {}): RequestInit {
  return {
    ...options,
    // Ainda não faz parte dos tipos estáveis do TypeScript, mas é suportado
    // pelo Chrome atual e dispara a permissão correta de rede local/loopback.
    targetAddressSpace: printerAgentAddressSpace(url),
  } as RequestInit
}

export function loadPrinterAgentConnection(
  storage: StorageLike,
  defaults: Omit<PrinterAgentConnection, 'manual'>,
): PrinterAgentConnection {
  const fallback = { ...defaults, manual: false }
  try {
    const raw = storage.getItem(PRINTER_AGENT_STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw) as Partial<PrinterAgentConnection>
    return {
      url: normalizePrinterAgentUrl(String(saved.url ?? '')),
      token: String(saved.token ?? ''),
      manual: true,
    }
  } catch {
    storage.removeItem(PRINTER_AGENT_STORAGE_KEY)
    return fallback
  }
}

export function savePrinterAgentConnection(storage: StorageLike, input: Pick<PrinterAgentConnection, 'url' | 'token'>): PrinterAgentConnection {
  const connection = {
    url: normalizePrinterAgentUrl(input.url),
    token: input.token.trim(),
    manual: true,
  }
  storage.setItem(PRINTER_AGENT_STORAGE_KEY, JSON.stringify({ url: connection.url, token: connection.token }))
  return connection
}

export function resetPrinterAgentConnection(
  storage: StorageLike,
  defaults: Omit<PrinterAgentConnection, 'manual'>,
): PrinterAgentConnection {
  storage.removeItem(PRINTER_AGENT_STORAGE_KEY)
  return { ...defaults, manual: false }
}
