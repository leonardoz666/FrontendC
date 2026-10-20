const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

async function main() {
  const slots = []
  let cursor = 0
  let dirty = true
  let pending = []
  let requests = 0
  const replace = () => {}
  const react = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) slots[index] = { value: initial }
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true }
      }]
    },
    useCallback(callback, deps) {
      const index = cursor++
      if (!slots[index] || deps.some((v, i) => !Object.is(v, slots[index].deps[i]))) slots[index] = { value: callback, deps }
      return slots[index].value
    },
    useEffect(callback, deps) {
      const index = cursor++
      if (!slots[index] || deps.some((v, i) => !Object.is(v, slots[index].deps[i]))) {
        slots[index] = { deps }
        pending.push(callback)
      }
    },
  }
  const moduleExports = {}
  const source = fs.readFileSync(path.join(__dirname, '../app/instalacao/page.tsx'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, {
    exports: moduleExports, URLSearchParams,
    window: { location: { search: '?estabelecimento=teste', origin: 'https://app.example' } },
    document: { documentElement: { classList: { remove() {} }, dataset: {}, style: {} } },
    fetch: async () => { requests++; return { status: 404 } },
    require(name) {
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
      // A new router wrapper must not restart the status request.
      if (name.endsWith('/tenant-router')) return { useTenantRouter: () => ({ replace, refresh() {} }) }
      if (name.endsWith('/tenant-navigation')) return { requestedTenantSlug: p => p.get('estabelecimento') }
      return new Proxy({}, { get: (_, key) => key })
    },
  })
  for (let i = 0; i < 20; i++) {
    cursor = 0; dirty = false
    moduleExports.default()
    const effects = pending; pending = []
    effects.forEach(effect => effect())
    await new Promise(resolve => setImmediate(resolve))
    if (!dirty) break
  }
  assert.equal(requests, 1, 'status must be checked once even when the router wrapper changes on render')
  assert.equal(dirty, false, 'installation page must settle instead of continuously rerendering')
  console.log('✓ tela de instalação estabiliza com uma única consulta de configuração')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
