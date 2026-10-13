const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const source = readFileSync(join(__dirname, '..', 'app', 'admin', 'categorias', 'page.tsx'), 'utf8')

assert.ok(
  source.includes('<option value="">Nenhuma impressora</option>'),
  'a opção vazia deve informar que nenhuma impressora está selecionada'
)
assert.ok(
  !source.includes('Usar impressora do produto ou padrão do caixa'),
  'a opção vazia não deve aparentar uma impressora padrão selecionada'
)
assert.ok(
  source.includes('Nenhuma vinculada'),
  'a tabela deve distinguir categoria sem impressora de uma seleção padrão'
)
assert.ok(
  source.includes("dispositivoId: dispositivoId ? Number(dispositivoId) : null"),
  'o formulário deve continuar enviando null quando nenhuma impressora for escolhida'
)

console.log('4 verificações da impressora da categoria passaram')
