const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const provider = fs.readFileSync(path.join(root, 'app/contexts/BrandingContext.tsx'), 'utf8')
const offline = fs.readFileSync(path.join(root, 'app/lib/offline.ts'), 'utf8')
const api = fs.readFileSync(path.join(root, 'app/lib/api.ts'), 'utf8')
const proxy = fs.readFileSync(path.join(root, 'app/lib/backend-proxy.ts'), 'utf8')
const login = fs.readFileSync(path.join(root, 'app/login/page.tsx'), 'utf8')
const sidebar = fs.readFileSync(path.join(root, 'app/components/Sidebar.tsx'), 'utf8')
const theme = fs.readFileSync(path.join(root, 'app/contexts/ThemeContext.tsx'), 'utf8')

const checks = [
  {
    name: 'não inicializa com a marca de um restaurante específico',
    pass: /useState<RestaurantBranding\s*\|\s*null>\(null\)/.test(provider),
  },
  {
    name: 'bloqueia a interface enquanto o tenant está sendo resolvido',
    pass: /if\s*\(carregando\s*\|\|\s*!branding\s*\|\|\s*resolvedTenant\s*!==\s*tenantHint\)/.test(provider),
  },
  {
    name: 'revalida a marca quando o link do estabelecimento muda',
    pass: /useSearchParams/.test(provider) && /tenantHint/.test(provider),
  },
  {
    name: 'não usa Rei do Pirão como fallback universal',
    pass: !/useState\(DEFAULT_BRANDING\)/.test(provider),
  },
  {
    name: 'não atribui cache sem tenant ao Rei do Pirão',
    pass: /__tenant-unresolved__/.test(offline) && !/record\.tenantSlug\s*\|\|\s*['"]rei-do-pirao/.test(offline),
  },
  {
    name: 'isola o cache de sessão pelo tenant atual',
    pass: /authMeCache:\s*\{ tenantSlug: string/.test(api) && /authMeCache\?\.tenantSlug === tenantSlug/.test(api),
  },
  {
    name: 'limpa o cache das telas ao trocar de estabelecimento',
    pass: /queryClient\.clear\(\)/.test(provider) && /resolvedTenant\s*!==\s*tenantHint/.test(provider),
  },
  {
    name: 'impede cache compartilhado nas respostas da API',
    pass: /cache-control['"],\s*['"]private, no-store, max-age=0/.test(proxy) && /vary['"],\s*['"]Cookie, x-tenant-slug/.test(proxy),
  },
  {
    name: 'não aceita tenant injetado pelo navegador no proxy',
    pass: /headers\.delete\(['"]x-tenant-slug['"]\)/.test(proxy) && /headers\.set\(['"]x-tenant-slug['"],\s*tenantSlug\)/.test(proxy),
  },
  {
    name: 'aplica favicon, tipografia e tema da identidade do estabelecimento',
    pass: /faviconUrl/.test(provider) && /--brand-font-family/.test(provider) && /rei-branding-theme/.test(provider),
  },
  {
    name: 'usa imagem personalizada na tela de login',
    pass: /branding\.imagemLoginUrl/.test(login) && /backgroundImage/.test(login),
  },
  {
    name: 'usa a logo compacta na navegação',
    pass: /branding\.logoCompactaUrl\s*\|\|\s*branding\.logoUrl/.test(sidebar),
  },
  {
    name: 'isola a preferência de tema por estabelecimento',
    pass: /rei_tenant_slug/.test(theme) && /tenantThemeStorageKey/.test(theme),
  },
]

let failed = 0
for (const check of checks) {
  if (check.pass) console.log(`OK  ${check.name}`)
  else {
    failed += 1
    console.error(`FALHA  ${check.name}`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} proteção(ões) contra mistura visual de tenant ausente(s).`)
  process.exit(1)
}

console.log('\nIsolamento visual de tenant verificado.')
