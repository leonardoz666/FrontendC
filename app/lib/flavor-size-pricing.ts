export type FlavorSizePrice = {
  tamanhoId: number
  sabor: string
  valor: number
}

export type FlavorSizeConfig = {
  version: 1 | 2
  sabores: string[]
  precos: FlavorSizePrice[]
}

function flavorKey(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function parseFlavors(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap(item => {
    if (typeof item !== 'string') return []
    const flavor = item.trim()
    const key = flavorKey(flavor)
    if (!flavor || seen.has(key)) return []
    seen.add(key)
    return [flavor]
  })
}

export function parseFlavorSizeConfig(value?: string | null): FlavorSizeConfig {
  if (!value) return { version: 1, sabores: [], precos: [] }
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) return { version: 1, sabores: parseFlavors(parsed), precos: [] }
    if (!parsed || typeof parsed !== 'object') return { version: 1, sabores: [], precos: [] }
    const record = parsed as Record<string, unknown>
    const sabores = parseFlavors(record.sabores)
    const canonical = new Map(sabores.map(sabor => [flavorKey(sabor), sabor]))
    const precos = Array.isArray(record.precos)
      ? record.precos.flatMap(item => {
          if (!item || typeof item !== 'object') return []
          const price = item as Record<string, unknown>
          const tamanhoId = Number(price.tamanhoId)
          const flavor = typeof price.sabor === 'string' ? canonical.get(flavorKey(price.sabor)) : undefined
          const valor = Number(price.valor)
          return Number.isInteger(tamanhoId) && tamanhoId > 0 && flavor && Number.isFinite(valor) && valor > 0
            ? [{ tamanhoId, sabor: flavor, valor }]
            : []
        })
      : []
    return { version: 2, sabores, precos }
  } catch {
    return { version: 1, sabores: [], precos: [] }
  }
}

export function serializeFlavorSizeConfig(sabores: string[], precos: FlavorSizePrice[]): string {
  if (precos.length === 0) return JSON.stringify(sabores)
  return JSON.stringify({ versao: 2, sabores, precos })
}

export function priceForFlavorSize(
  config: FlavorSizeConfig,
  tamanhoId: number | undefined,
  sabor: string | undefined,
  fallback: number
): number {
  if (config.precos.length === 0 || !tamanhoId || !sabor) return fallback
  return config.precos.find(price =>
    price.tamanhoId === tamanhoId && flavorKey(price.sabor) === flavorKey(sabor)
  )?.valor ?? fallback
}
