import assert from 'node:assert/strict'
import {
  parseFlavorSizeConfig,
  priceForFlavorSize,
  serializeFlavorSizeConfig
} from '../app/lib/flavor-size-pricing'

const precos = [
  { tamanhoId: 10, sabor: 'Carne de Sol', valor: 45 },
  { tamanhoId: 20, sabor: 'Carne de Sol', valor: 70 },
  { tamanhoId: 10, sabor: 'Frango', valor: 35 },
  { tamanhoId: 20, sabor: 'Frango', valor: 55 }
]
const salvo = serializeFlavorSizeConfig(['Carne de Sol', 'Frango'], precos)
const configuracao = parseFlavorSizeConfig(salvo)

assert.deepEqual(configuracao.sabores, ['Carne de Sol', 'Frango'])
assert.equal(configuracao.precos.length, 4)
assert.equal(priceForFlavorSize(configuracao, 10, 'Carne de Sol', 1), 45)
assert.equal(priceForFlavorSize(configuracao, 20, 'Carne de Sol', 1), 70)
assert.equal(priceForFlavorSize(configuracao, 20, 'Frango', 1), 55)
assert.equal(priceForFlavorSize(configuracao, undefined, undefined, 55), 55)

const legado = parseFlavorSizeConfig(JSON.stringify(['Carne de Sol', 'Frango']))
assert.deepEqual(legado.sabores, ['Carne de Sol', 'Frango'])
assert.equal(priceForFlavorSize(legado, 10, 'Frango', 42), 42)

console.log('verify-flavor-size-pricing: 8 assertions OK')
