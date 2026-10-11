export const PRINTER_AGENT_STORAGE_KEY = 'rei:printer-agent-connection'

export type PrinterAgentConnection = {
  url: string
  token: string
  manual: boolean
}

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
