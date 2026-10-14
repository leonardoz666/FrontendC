import assert from 'node:assert/strict'
import { resolveTableTransferTarget } from '../app/lib/table-transfer'

const tables = [
  { id: 101, numero: 12, status: 'OCUPADA' },
  { id: 208, numero: 15, status: 'LIVRE' },
  { id: 209, numero: 16, status: 'OCUPADA' },
  { id: 210, numero: 17, status: 'FECHAMENTO' }
]

const source = { id: 101, numero: 12 }
const result = resolveTableTransferTarget(tables, source, '15')
assert.equal(result.ok, true, 'uma mesa livre pode receber a transferência')
if (result.ok) {
  assert.equal(result.table.id, 208, 'o número digitado resolve para o ID interno correto')
  assert.equal(result.table.numero, 15, 'a mesa resolvida mantém o número visível ao garçom')
}

for (const input of ['', 'abc', '2,5', '0']) {
  const invalid = resolveTableTransferTarget(tables, source, input)
  assert.deepEqual(invalid, { ok: false, message: 'Digite um número de mesa válido.' })
}

assert.deepEqual(
  resolveTableTransferTarget(tables.filter(table => table.id !== 101), source, '12'),
  { ok: false, message: 'Escolha uma mesa diferente da mesa atual.' }
)
assert.deepEqual(
  resolveTableTransferTarget(tables, source, '99'),
  { ok: false, message: 'Mesa 99 não encontrada.' }
)
assert.deepEqual(
  resolveTableTransferTarget(tables, source, '16'),
  { ok: false, message: 'Mesa 16 já está em atendimento.' }
)
assert.deepEqual(
  resolveTableTransferTarget(tables, source, '17'),
  { ok: false, message: 'Mesa 17 está em fechamento.' }
)

console.log('verify-table-transfer: 11 assertions OK')
