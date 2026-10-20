const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Run the real hook with deterministic React memo slots and Next navigation.
const slots = []
let cursor = 0
let slug = 'paraiso-da-carne'
const calls = []
const nextRouter = {
  back() {}, forward() {}, prefetch() {}, refresh() {},
  push: (...args) => calls.push(['push', ...args]),
  replace: (...args) => calls.push(['replace', ...args]),
}
function useMemo(factory, dependencies) {
  const index = cursor++
  const previous = slots[index]
  if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
    slots[index] = { value: factory(), dependencies }
  }
  return slots[index].value
}
const source = fs.readFileSync(path.join(__dirname, '../app/lib/tenant-router.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exportsObject = {}
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require(name) {
    if (name === 'react') return { useMemo, useCallback: (callback, deps) => useMemo(() => callback, deps) }
    if (name === 'next/navigation') return {
      useRouter: () => nextRouter,
      usePathname: () => '/instalacao',
      useSearchParams: () => new URLSearchParams({ estabelecimento: slug }),
    }
    if (name === './tenant-navigation') return {
      tenantSlugFromPathname: () => null,
      requestedTenantSlug: params => params.get('estabelecimento'),
      tenantForCurrentTab: () => null,
      tenantPageUrl: (href, tenant) => `/e/${tenant}${href}`,
    }
    throw new Error(`Unexpected import: ${name}`)
  },
})
function render() {
  cursor = 0
  return exportsObject.useTenantRouter()
}
const initial = render()
let statusChecks = 1
let previous = initial
for (let i = 0; i < 20; i++) {
  const current = render()
  // InstallationPage's loadStatus depends on this router object.
  if (current !== previous) statusChecks++
  previous = current
}
assert.equal(statusChecks, 1, 'rerenders must not restart the installation status effect')
initial.replace('/login')
assert.deepEqual(calls.pop(), ['replace', '/e/paraiso-da-carne/login', undefined])
slug = 'outro-restaurante'
const changed = render()
assert.notEqual(changed, initial, 'changing tenant must update navigation')
assert.equal(render(), changed)
changed.push('/inicio', { scroll: false })
assert.deepEqual(calls.pop(), ['push', '/e/outro-restaurante/inicio', { scroll: false }])
console.log('✓ router estável em 20 rerenders; navegação atualizada ao trocar estabelecimento')
