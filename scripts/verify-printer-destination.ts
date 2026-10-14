import assert from 'node:assert/strict'
import { erroDestinoImpressora } from '../app/lib/printer-destination'

assert.equal(erroDestinoImpressora('TCP', '192.168.0.26'), null)
assert.match(erroDestinoImpressora('TCP', 'IMPRESSORA_COZINHA') ?? '', /IP válido/)
assert.equal(erroDestinoImpressora('USB', 'IMPRESSORA_COZINHA'), null)
assert.equal(erroDestinoImpressora('TCP', ''), null)

console.log('✓ TCP aceita IPv4 e rejeita nome de fila Windows')
