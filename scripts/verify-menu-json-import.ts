import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { categoryForImportedItem, importCategoryKey } from '../app/lib/menu-json-import'

const exported = categoryForImportedItem({
  nome: 'Acarajé',
  isFood: true,
  categoriaId: 42,
  categoria: { id: 42, nome: 'Comidas', setor: 'COZINHA', ordem: 3 },
})
assert.deepEqual(exported, {
  nome: 'Comidas',
  setor: 'COZINHA',
  imagem: null,
  ordem: 3,
})

const withoutCategory = categoryForImportedItem({ nome: 'Produto antigo', isFood: true })
assert.equal(withoutCategory.nome, 'Produtos importados')
assert.equal(withoutCategory.setor, 'COZINHA')

const drinkWithoutCategory = categoryForImportedItem({ nome: 'Suco', isDrink: true, isFood: false })
assert.equal(drinkWithoutCategory.setor, 'BAR')

assert.equal(importCategoryKey('  Bebídas  '), importCategoryKey('bebidas'))

const productsPage = readFileSync(resolve(process.cwd(), 'app/admin/produtos/page.tsx'), 'utf8')
assert.match(productsPage, /categoryForImportedItem\(/, 'a tela deve resolver a categoria salva no JSON')
assert.match(productsPage, /formData\.append\('categoriaId', String\(importedCategoryId\)\)/, 'todo produto importado deve receber uma categoria')

console.log('✓ importação JSON restaura categorias por nome e nunca deixa produto sem categoria')
