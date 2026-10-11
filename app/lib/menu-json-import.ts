export type ImportCategory = {
  nome: string
  setor: 'COZINHA' | 'BAR' | 'SOBREMESA'
  imagem?: string | null
  ordem?: number
}

type ExistingCategory = ImportCategory & { id: number }

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function sector(value: unknown, item: Record<string, unknown>): ImportCategory['setor'] {
  const normalized = text(value).toUpperCase()
  if (normalized === 'BAR' || normalized === 'SOBREMESA' || normalized === 'COZINHA') return normalized
  return item.isDrink === true && item.isFood !== true ? 'BAR' : 'COZINHA'
}

/**
 * Resolve a categoria de um item do backup JSON sem confiar no ID antigo.
 * Depois de um reset os IDs deixam de existir, mas o nome exportado continua
 * sendo uma chave estável para recriar e religar o cardápio.
 */
export function categoryForImportedItem(itemValue: unknown, selected?: ExistingCategory): ImportCategory {
  const item = record(itemValue)
  const embedded = record(item.categoria)
  const embeddedName = text(embedded.nome) || text(item.categoriaNome)

  if (embeddedName) {
    return {
      nome: embeddedName,
      setor: sector(embedded.setor, item),
      imagem: text(embedded.imagem) || null,
      ordem: Number.isInteger(Number(embedded.ordem)) ? Number(embedded.ordem) : 0,
    }
  }

  if (selected) {
    return {
      nome: selected.nome,
      setor: selected.setor,
      imagem: selected.imagem ?? null,
      ordem: selected.ordem ?? 0,
    }
  }

  return {
    nome: 'Produtos importados',
    setor: sector(undefined, item),
    imagem: null,
    ordem: 0,
  }
}

export function importCategoryKey(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR')
}
