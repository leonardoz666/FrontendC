require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })
const assert = require('node:assert/strict')
const { fetchAllProducts, sectorFromCategory, correctProductSectors } = require('../app/lib/product-catalog')

async function run() {
  const originalFetch = global.fetch
  try {
    const calls = []
    global.fetch = async (url, options) => {
      calls.push({ url, options })
      if (options.method === 'POST' && url === '/api/products/corrigir-setores') {
        return Response.json({ total: 3, updated: 2, failed: 0 })
      }
      const page = Number(new URL(url, 'http://local').searchParams.get('page'))
      const data = page === 1 ? [
        { id: 1, nome: 'Suco', preco: 8, categoria: { nome: 'Bebidas' }, isDrink: false, isFood: true },
        { id: 2, nome: 'Pirão', preco: 25, categoria: { nome: 'Pratos' }, isDrink: false, isFood: true }
      ] : [{ id: 3, nome: 'Café', preco: 5, categoria: { nome: 'Bebidas' }, isDrink: false, isFood: true }]
      return Response.json({ data, meta: { total: 3 } })
    }

    assert.equal((await fetchAllProducts()).length, 3)
    assert.equal(sectorFromCategory('Bebidas')?.isDrink, true)
    assert.equal(sectorFromCategory('Pratos')?.isFood, true)
    assert.equal(sectorFromCategory('Diversos'), null)
    let loadedTotal = 0
    assert.deepEqual(await correctProductSectors(total => { loadedTotal = total }), { updated: 2, failed: 0 })
    assert.equal(loadedTotal, 3)
    const corrections = calls.filter(call => call.options.method === 'POST')
    assert.equal(corrections.length, 1)
    assert.equal(corrections[0].url, '/api/products/corrigir-setores')
    assert.equal(calls.filter(call => call.options.method === 'PUT').length, 0)
    assert.ok(calls.every(call => call.options.credentials === 'include'))

    global.fetch = async url => Response.json({
      data: Number(new URL(url, 'http://local').searchParams.get('page')) === 1 ? [{ id: 1 }] : [],
      meta: { total: 2 }
    })
    await assert.rejects(fetchAllProducts(), /incompleta/)
    console.log('11 verificações do catálogo passaram')
  } finally {
    global.fetch = originalFetch
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
