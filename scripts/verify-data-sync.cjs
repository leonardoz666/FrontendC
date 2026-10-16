require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })
const assert = require('node:assert/strict')

const {
  DATA_CHANGED_EVENT,
  isMutationMethod,
  publishLocalDataChange,
  shouldPublishApiMutation,
  subscribeLocalDataChanges,
} = require('../app/lib/data-sync')
const { createQueryClient } = require('../app/lib/queryClient')

assert.equal(isMutationMethod('POST'), true)
assert.equal(isMutationMethod('PUT'), true)
assert.equal(isMutationMethod('patch'), true)
assert.equal(isMutationMethod('delete'), true)
assert.equal(isMutationMethod('GET'), false)
assert.equal(shouldPublishApiMutation('PATCH', '/api/categories/1'), true)
assert.equal(shouldPublishApiMutation('POST', '/api/auth/logout'), false)

const target = new EventTarget()
const received = []
const unsubscribe = subscribeLocalDataChanges(target, detail => received.push(detail))
publishLocalDataChange(target, { method: 'PATCH', path: '/categories/1' })
unsubscribe()
publishLocalDataChange(target, { method: 'DELETE', path: '/categories/2' })
assert.equal(DATA_CHANGED_EVENT, 'controlae:data-changed')
assert.deepEqual(received, [{ method: 'PATCH', path: '/categories/1' }])

const queryClient = createQueryClient()
assert.equal(queryClient.getDefaultOptions().queries.refetchOnWindowFocus, true)
assert.equal(queryClient.getDefaultOptions().queries.refetchOnReconnect, true)

console.log('11 verificações da sincronização de dados passaram')
