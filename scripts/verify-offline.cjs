require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })
const assert = require('node:assert/strict')
const { indexedDB, IDBKeyRange } = require('fake-indexeddb')

global.indexedDB = indexedDB
global.IDBKeyRange = IDBKeyRange
global.window = new EventTarget()
global.document = { cookie: 'controlae_tenant_slug=tenant-a' }
Object.defineProperty(global, 'navigator', {
  configurable: true,
  value: { onLine: true },
})

const originalFetch = global.fetch

async function main() {
  const offline = require('../app/lib/offline')

  assert.equal(offline.isCacheableApiGet('/api/tables'), true)
  assert.equal(offline.isCacheableApiGet('/api/categories?page=1&pageSize=100'), true)
  assert.equal(offline.isCacheableApiGet('/api/admin/users'), false)
  assert.equal(offline.isQueueableApiMutation('POST', '/api/orders'), true)
  assert.equal(offline.isQueueableApiMutation('POST', '/api/tables/10/open'), true)
  assert.equal(offline.isQueueableApiMutation('POST', '/api/tables/10/close'), false)
  assert.equal(offline.isQueueableApiMutation('DELETE', '/api/orders/items/1'), false)

  await offline.cacheApiPayload('/api/tables', [{ id: 10, numero: 10, status: 'LIVRE' }])
  assert.deepEqual(await offline.readCachedApiPayload('/api/tables'), [{ id: 10, numero: 10, status: 'LIVRE' }])
  assert.deepEqual(
    await offline.readCachedApiPayload('/api/tables/10'),
    { id: 10, numero: 10, status: 'LIVRE', comandas: [] },
    'mesa individual deve poder nascer do mapa armazenado',
  )

  const openHeaders = new Headers({ 'Idempotency-Key': 'controlae-offline-open-0001' })
  const orderHeaders = new Headers({
    'Content-Type': 'application/json',
    'Idempotency-Key': 'controlae-offline-order-0001',
  })
  await offline.queueApiMutation({
    path: '/api/tables/10/open',
    method: 'POST',
    body: undefined,
    headers: openHeaders,
  })
  await new Promise(resolve => setTimeout(resolve, 2))
  await offline.queueApiMutation({
    path: '/api/orders',
    method: 'POST',
    body: { mesaId: 10, itens: [{ produtoId: 1, quantidade: 2 }] },
    headers: orderHeaders,
    metadata: {
      mesaId: 10,
      itens: [{ id: -1, nome: 'Abará', quantidade: 2, preco: 10, observacao: null, status: 'AGUARDANDO SINCRONIZAÇÃO', horario: '12:00' }],
    },
  })

  const queued = await offline.listOfflineMutations()
  assert.deepEqual(queued.map(item => item.path), ['/api/tables/10/open', '/api/orders'])
  assert.equal((await offline.listOfflineOrderItems(10))[0].nome, 'Abará')

  const delivered = []
  global.fetch = async (path, options) => {
    delivered.push({ path, idempotencyKey: new Headers(options.headers).get('Idempotency-Key') })
    return Response.json({ success: true })
  }
  await offline.syncOfflineQueue()
  assert.deepEqual(delivered, [
    { path: '/api/tables/10/open', idempotencyKey: 'controlae-offline-open-0001' },
    { path: '/api/orders', idempotencyKey: 'controlae-offline-order-0001' },
  ])
  assert.equal((await offline.listOfflineMutations()).length, 0)

  await offline.clearOfflineData()
  await offline.cacheApiPayload('/api/tables', [{ id: 20, numero: 20, status: 'OCUPADA' }])
  global.navigator.onLine = false
  global.fetch = async () => { throw new Error('fetch não deveria ser chamado sem conexão') }
  const { apiFetch } = require('../app/lib/api')
  assert.deepEqual(await apiFetch('/tables'), [{ id: 20, numero: 20, status: 'OCUPADA' }])
  const offlineOrder = await apiFetch('/orders', {
    method: 'POST',
    body: { mesaId: 20, itens: [{ produtoId: 1, quantidade: 1 }] },
  })
  assert.equal(offline.isOfflineQueuedResult(offlineOrder), true)
  const apiQueue = await offline.listOfflineMutations()
  assert.equal(apiQueue.length, 1)
  assert.match(apiQueue[0].headers['Idempotency-Key'], /^controlae-/)

  global.navigator.onLine = true
  global.fetch = async () => Response.json({ error: 'Produto indisponível' }, { status: 409 })
  await offline.syncOfflineQueue()
  const failedStatus = await offline.getOfflineStatus()
  assert.equal(failedStatus.failed, 1)
  assert.match(failedStatus.lastError, /Produto indisponível/)
  await offline.discardOfflineMutation(failedStatus.failedMutationId)
  assert.equal((await offline.getOfflineStatus()).pending, 0)

  await offline.clearOfflineData()
  global.document = { cookie: 'controlae_tenant_slug=tenant-a' }
  await offline.cacheApiPayload('/api/tables', [{ id: 31 }])
  await offline.queueApiMutation({ path: '/api/orders', method: 'POST', body: { mesaId: 31 }, headers: new Headers() })
  global.document.cookie = 'controlae_tenant_slug=tenant-b'
  await offline.cacheApiPayload('/api/tables', [{ id: 41 }])
  await offline.queueApiMutation({ path: '/api/orders', method: 'POST', body: { mesaId: 41 }, headers: new Headers() })
  await offline.clearOfflineData()
  assert.equal(await offline.readCachedApiPayload('/api/tables'), undefined, 'logout deve limpar somente o cache do tenant atual')
  assert.equal((await offline.listOfflineMutations()).length, 0, 'logout deve limpar somente a fila do tenant atual')
  global.document.cookie = 'controlae_tenant_slug=tenant-a'
  assert.deepEqual(await offline.readCachedApiPayload('/api/tables'), [{ id: 31 }], 'cache de outro tenant deve permanecer')
  assert.equal((await offline.listOfflineMutations()).length, 1, 'fila de outro tenant deve permanecer')
  await offline.clearOfflineData()
  console.log('28 verificações do modo offline passaram')
}

main()
  .finally(() => { global.fetch = originalFetch })
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })

