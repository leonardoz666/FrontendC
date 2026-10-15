require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })
const assert = require('node:assert/strict')

const originalFetch = global.fetch

async function main() {
  const { apiFetch, ApiError, invalidateAuthMeCache } = require('../app/lib/api')
  const { isQueueableApiMutation } = require('../app/lib/offline')

  assert.equal(isQueueableApiMutation('POST', '/api/orders'), true)
  assert.equal(isQueueableApiMutation('POST', '/api/tables/10/open'), true)
  assert.equal(isQueueableApiMutation('POST', '/api/tables/10/reopen'), true)
  assert.equal(isQueueableApiMutation('POST', '/api/tables/10/request-bill'), true)
  assert.equal(isQueueableApiMutation('POST', '/api/tables/10/print-partial'), true)
  assert.equal(isQueueableApiMutation('POST', '/api/tables/10/payment'), false)
  assert.equal(isQueueableApiMutation('POST', '/api/caixa/movimentos'), false)
  assert.equal(isQueueableApiMutation('DELETE', '/api/orders/1'), false)

  let calls = 0
  global.fetch = async () => {
    calls += 1
    if (calls < 3) {
      return new Response('', { status: 503, headers: { 'retry-after': '0' } })
    }
    return Response.json({ user: { id: 1, role: 'GARCOM' } })
  }
  const recovered = await apiFetch('/auth/me', { redirectOn401: false })
  assert.equal(recovered.user.id, 1)
  assert.equal(calls, 3, 'GET transitório deve tentar novamente')

  invalidateAuthMeCache()
  calls = 0
  global.fetch = async () => {
    calls += 1
    await new Promise(resolve => setTimeout(resolve, 10))
    return Response.json({ user: { id: 2, role: 'CAIXA' } })
  }
  const [first, second] = await Promise.all([
    apiFetch('/auth/me', { redirectOn401: false }),
    apiFetch('/auth/me', { redirectOn401: false })
  ])
  assert.equal(calls, 1, 'chamadas simultâneas a /auth/me devem compartilhar a mesma requisição')
  assert.deepEqual(first, second)
  await apiFetch('/auth/me', { redirectOn401: false })
  assert.equal(calls, 1, 'resultado de /auth/me deve usar o cache curto')

  invalidateAuthMeCache()
  calls = 0
  global.fetch = async () => {
    calls += 1
    return new Response('', { status: 503, headers: { 'retry-after': '0' } })
  }
  await assert.rejects(
    apiFetch('/auth/me', { redirectOn401: false }),
    error => error instanceof ApiError && error.status === 503 && /temporariamente indisponível/.test(error.message)
  )
  assert.equal(calls, 4, 'tentativas devem ser limitadas')

  invalidateAuthMeCache()
  calls = 0
  global.fetch = async () => {
    calls += 1
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const expiredSession = await apiFetch('/auth/me', { redirectOn401: false })
  assert.deepEqual(expiredSession, { user: null }, 'sessão expirada em /auth/me deve ser um estado normal')
  assert.equal(calls, 1, '401 de /auth/me não deve repetir nem lançar ApiError')

  console.log('18 verificações da API passaram')
}

main()
  .finally(() => { global.fetch = originalFetch })
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
