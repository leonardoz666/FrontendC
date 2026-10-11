import assert from 'node:assert/strict'
import {
  loadPrinterAgentConnection,
  normalizePrinterAgentUrl,
  PRINTER_AGENT_STORAGE_KEY,
  resetPrinterAgentConnection,
  savePrinterAgentConnection,
} from '../app/lib/printer-agent-config'

const values = new Map<string, string>()
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value) },
  removeItem: (key: string) => { values.delete(key) },
}
const defaults = { url: 'http://127.0.0.1:4100', token: '' }

assert.equal(normalizePrinterAgentUrl(' http://192.168.0.20:4200/ '), 'http://192.168.0.20:4200')
assert.throws(() => normalizePrinterAgentUrl('192.168.0.20:4200'), /inválido/)
assert.throws(() => normalizePrinterAgentUrl('ftp://127.0.0.1'), /http/)
assert.throws(() => normalizePrinterAgentUrl('http://127.0.0.1:4100/printers'), /endereço base/)

assert.deepEqual(loadPrinterAgentConnection(storage, defaults), { ...defaults, manual: false })
const saved = savePrinterAgentConnection(storage, { url: 'http://192.168.0.20:4200/', token: ' segredo ' })
assert.deepEqual(saved, { url: 'http://192.168.0.20:4200', token: 'segredo', manual: true })
assert.deepEqual(loadPrinterAgentConnection(storage, defaults), saved)
assert.ok(values.has(PRINTER_AGENT_STORAGE_KEY))
assert.deepEqual(resetPrinterAgentConnection(storage, defaults), { ...defaults, manual: false })
assert.equal(values.has(PRINTER_AGENT_STORAGE_KEY), false)

console.log('✓ conexão manual do agente é validada e salva neste computador')
