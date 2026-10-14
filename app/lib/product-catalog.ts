import type { Produto } from '../components/ProductCard'
import { apiFetch } from './api'
import type { Paginated } from './pagination'

export async function fetchAllProducts(): Promise<Produto[]> {
  const all: Produto[] = []
  for (let page = 1; page <= 50; page += 1) {
    const result = await apiFetch<Paginated<Produto>>(`/products?page=${page}&pageSize=100&ativo=all`)
    if (!Array.isArray(result?.data) || !Number.isInteger(result.meta?.total) || result.meta.total < 0) {
      throw new Error('Resposta inválida ao listar produtos')
    }
    all.push(...result.data)
    if (all.length >= result.meta.total) return all
    if (result.data.length === 0) break
  }
  throw new Error('A listagem de produtos está incompleta')
}

export function sectorFromCategory(name: string): { isDrink: boolean; isFood: boolean } | null {
  const category = name.toLowerCase()
  const drinks = ['bebida', 'drink', 'cerveja', 'refrigerante', 'suco', 'água', 'vinho', 'dose', 'bar']
  const foods = ['prato', 'entrada', 'comida', 'lanche', 'sobremesa', 'porção', 'petisco', 'hambúrguer', 'pizza', 'salada', 'cozinha']
  if (drinks.some(word => category.includes(word))) return { isDrink: true, isFood: false }
  if (foods.some(word => category.includes(word))) return { isDrink: false, isFood: true }
  return null
}

export async function correctProductSectors(onLoaded?: (total: number) => void): Promise<{ updated: number; failed: number }> {
  const result = await apiFetch<{ total: number; updated: number; failed: number }>('/products/corrigir-setores', {
    method: 'POST'
  })
  onLoaded?.(result.total)
  return { updated: result.updated, failed: result.failed }
}
