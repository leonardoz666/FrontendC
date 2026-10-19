const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const frontendModules = fs.readFileSync(path.join(root, 'app/lib/modules.ts'), 'utf8')
const navigation = fs.readFileSync(path.join(root, 'app/lib/navigation.ts'), 'utf8')
const layout = fs.readFileSync(path.join(root, 'app/components/MainLayout.tsx'), 'utf8')
const backendModulePath = path.join(root, '../BackendC/src/lib/module-catalog.ts')

function moduleKeys(source) {
  const block = source.match(/export const MODULE_KEYS = \[([\s\S]*?)\] as const/)
  assert(block, 'MODULE_KEYS precisa existir')
  return [...block[1].matchAll(/'([A-Z_]+)'/g)].map(match => match[1])
}

if (fs.existsSync(backendModulePath)) {
  const backendModules = fs.readFileSync(backendModulePath, 'utf8')
  assert.deepEqual(moduleKeys(frontendModules), moduleKeys(backendModules), 'frontend e backend devem compartilhar o mesmo catálogo de módulos')
} else {
  console.warn('Catálogo do backend não está disponível neste checkout; paridade entre repositórios não verificada.')
}

const navBlock = navigation.slice(navigation.indexOf('export const NAV_GROUPS'), navigation.indexOf('/** Atalhos globais'))
const items = [...navBlock.matchAll(/href:\s*'([^']+)'([\s\S]*?)\}/g)].map(match => ({ href: match[1], body: match[2] }))
const uncovered = items.filter(item => item.href !== '/' && !/module:\s*'[A-Z_]+'/.test(item.body)).map(item => item.href)
assert.deepEqual(uncovered, [], `rotas da navegação sem módulo: ${uncovered.join(', ')}`)

for (const prefix of ['/mesas-abertas', '/admin/historico', '/admin/dispositivos', '/admin/estoque/registro']) {
  assert(navigation.includes(`prefix: '${prefix}'`), `rota auxiliar sem cobertura de módulo: ${prefix}`)
}

assert(/moduleForPathname\(pathname\)/.test(layout), 'layout precisa resolver o módulo da URL direta')
assert(/isModuleRouteBlocked/.test(layout), 'layout precisa bloquear módulo desativado')
assert(/!isModuleRouteBlocked\s*&&\s*children/.test(layout), 'conteúdo não pode renderizar quando o módulo está desativado')

console.log(`${items.length - 1} rotas da navegação e 4 rotas auxiliares possuem módulo explícito.`)
