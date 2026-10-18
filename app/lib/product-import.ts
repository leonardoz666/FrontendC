import type { Categoria } from '@/components/ProductCard'
import { apiFetch, ApiError } from './api'
import { categoryForImportedItem, importCategoryKey } from './menu-json-import'
import { fetchAllProducts } from './product-catalog'

type ImportedProduct = Record<string, unknown> & { nome?: unknown }

function importedItems(text: string): ImportedProduct[] {
  const parsed: unknown = JSON.parse(text)
  const source = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items) ? (parsed as { items: unknown[] }).items : []
  return source.filter((item): item is ImportedProduct => Boolean(item && typeof item === 'object' && typeof (item as ImportedProduct).nome === 'string' && String((item as ImportedProduct).nome).trim()))
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  if (typeof value !== 'string' || !value.trim()) return []
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [] } catch { return [] }
}

export async function importProductCatalog(input: { text: string; categories: Categoria[]; selectedCategoryId?: number }): Promise<{ added: number; updated: number; failed: number }> {
  const items = importedItems(input.text)
  if (!items.length) throw new Error('Arquivo inválido ou vazio')
  const existingProducts = await fetchAllProducts()
  const existingByName = new Map(existingProducts.map(product => [product.nome.toLowerCase(), product.id]))
  const selectedCategory = input.categories.find(category => category.id === input.selectedCategoryId)
  const categoryIdsByName = new Map(input.categories.map(category => [importCategoryKey(category.nome), category.id]))
  const categoriesById = new Map(input.categories.map(category => [category.id, category]))
  const reactivatedCategoryIds = new Set<number>()

  const ensureCategory = async (item: unknown): Promise<number> => {
    const descriptor = categoryForImportedItem(item, selectedCategory ? { id: selectedCategory.id, nome: selectedCategory.nome, setor: selectedCategory.setor ?? 'COZINHA', imagem: selectedCategory.imagem, ordem: selectedCategory.ordem } : undefined)
    const key = importCategoryKey(descriptor.nome)
    const existingId = categoryIdsByName.get(key)
    if (existingId !== undefined) {
      const existing = categoriesById.get(existingId)
      if (existing?.ativo === false && !reactivatedCategoryIds.has(existingId)) {
        await apiFetch(`/categories/${existingId}/ativo`, { method: 'PATCH', body: { ativo: true } })
        reactivatedCategoryIds.add(existingId)
      }
      return existingId
    }
    const created = await apiFetch<Categoria>('/categories', { method: 'POST', body: { nome: descriptor.nome, setor: descriptor.setor, imagem: descriptor.imagem, ordem: descriptor.ordem } })
    categoryIdsByName.set(key, created.id)
    categoriesById.set(created.id, created)
    return created.id
  }

  let added = 0
  let updated = 0
  let failed = 0
  for (const item of items) {
    try {
      const name = String(item.nome).trim()
      const existingId = existingByName.get(name.toLowerCase())
      const categoryId = await ensureCategory(item)
      const formData = new FormData()
      const rawPrice = item.preco
      const price = typeof rawPrice === 'number' ? rawPrice : typeof rawPrice === 'string' ? Number(rawPrice.replace(',', '.')) || 0 : 0
      formData.append('nome', name)
      formData.append('preco', String(price))
      formData.append('categoriaId', String(categoryId))
      formData.append('ativo', 'true')
      formData.append('tipo', typeof item.tipo === 'string' ? item.tipo : 'COMUM')
      if (item.tipoTamanhoId) formData.append('tipoTamanhoId', String(item.tipoTamanhoId))
      if (typeof item.foto === 'string' && item.foto) formData.append('foto', item.foto)
      formData.append('tipoOpcao', typeof item.tipoOpcao === 'string' ? item.tipoOpcao : item.temOpcaoTamanho ? 'tamanho_pg' : 'padrao')
      formData.append('sabores', typeof item.sabores === 'string' ? item.sabores : JSON.stringify(item.sabores ?? []))
      formData.append('observacoes', JSON.stringify(stringList(item.observacoes)))
      formData.append('isDrink', String(Boolean(item.isDrink)))
      formData.append('isFood', String(item.isFood === undefined ? true : Boolean(item.isFood)))
      formData.append('favorito', String(Boolean(item.favorito)))
      formData.append('permitirObservacao', String(item.permitirObservacao === undefined ? true : Boolean(item.permitirObservacao)))
      formData.append('permiteGeloLimao', String(Boolean(item.permiteGeloLimao)))
      const saved = await apiFetch<{ id: number }>(existingId ? `/products/${existingId}` : '/products', { method: existingId ? 'PUT' : 'POST', body: formData })
      if (existingId) updated += 1
      else { added += 1; existingByName.set(name.toLowerCase(), saved.id) }
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) throw error
      console.error(error)
      failed += 1
    }
  }
  return { added, updated, failed }
}
