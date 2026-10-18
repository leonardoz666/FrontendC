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
const middleware = fs.readFileSync(path.join(root, 'middleware.ts'), 'utf8')
const installationActivation = fs.readFileSync(path.join(root, 'app/api/installation/activate/route.ts'), 'utf8')
const installationPage = fs.readFileSync(path.join(root, 'app/instalacao/page.tsx'), 'utf8')
const tenantLinkPath = path.join(root, 'app/e/[slug]/route.ts')
const tenantLinkRoute = fs.existsSync(tenantLinkPath) ? fs.readFileSync(tenantLinkPath, 'utf8') : ''

const checks = [
  {
    name: 'usa apenas a marca neutra ControlaÊ durante a instalação',
    pass: /isInstallationPage\s*\?\s*DEFAULT_BRANDING\s*:\s*null/.test(provider) && /nome:\s*['"]ControlaÊ['"]/.test(provider),
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
    name: 'não usa nenhum restaurante como fallback universal',
    pass: !/useState\(DEFAULT_BRANDING\)/.test(provider),
  },
  {
    name: 'não atribui cache sem tenant a um restaurante',
    pass: /__tenant-unresolved__/.test(offline) && /Fila sem estabelecimento identificado/.test(offline) && !/['"]x-tenant-slug['"]:\s*mutation\.tenantSlug\s*\|\|/.test(offline),
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
    name: 'aceita o tenant da aba somente com vínculo criptografado correspondente',
    pass: /TENANT_HEADER/.test(proxy) && /installationBindingForTenant\(request\.cookies, requestedSlug\)/.test(proxy) && /headers\.set\(['"]x-tenant-slug['"],\s*requestedSlug\)/.test(proxy),
  },
  {
    name: 'não libera telas operacionais apenas pela presença de um cookie',
    pass: /hasValidInstallationGate/.test(middleware) && /crypto\.subtle\.sign/.test(middleware) && /createInstallationGate\(bindingValue, expiresAt\)/.test(installationActivation),
  },
  {
    name: 'ativa pelo link do estabelecimento sem pedir URL da API',
    pass: /Link do estabelecimento/.test(installationPage) && !/URL da API/.test(installationPage) && /establishmentUrl/.test(installationActivation) && /BACKEND_URL/.test(installationActivation),
  },
  {
    name: 'mantém a rota individual de cada estabelecimento',
    pass: /SLUG_PATTERN/.test(tenantLinkRoute) && /new URL\(['"]\/instalacao['"]/.test(tenantLinkRoute) && /searchParams\.set\(['"]link['"]/.test(tenantLinkRoute),
  },
  {
    name: 'aplica favicon, tipografia e tema da identidade do estabelecimento',
    pass: /faviconUrl/.test(provider) && /--brand-font-family/.test(provider) && /controlae-branding-theme/.test(provider),
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
    name: 'deriva superfícies e textos da cor configurada para a navegação',
    pass: /--sidebar-surface/.test(provider)
      && /--sidebar-text-muted/.test(provider)
      && /navigationIsDark/.test(provider)
      && /sidebar-field/.test(sidebar)
      && /sidebar-section-trigger/.test(sidebar)
      && /var\(--sidebar-surface-hover\)/.test(sidebar),
  },
  {
    name: 'isola a preferência de tema por estabelecimento',
    pass: /tenantForCurrentTab/.test(theme) && /tenantThemeStorageKey/.test(theme),
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
