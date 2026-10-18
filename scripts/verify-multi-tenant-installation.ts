import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { INSTALLATION_COOKIE, createInstallationGate, sealInstallationBinding } from '../app/lib/installation-binding'
import { proxyBackendRequest } from '../app/lib/backend-proxy'
import { POST as activateInstallation } from '../app/api/installation/activate/route'
import {
  TENANT_HEADER,
  authCookieName,
  installationCookieName,
  installationGateCookieName,
  operationalPathname,
  tenantPageUrl,
  tenantSlugFromPathname,
} from '../app/lib/tenant-navigation'
import { middleware } from '../middleware'

process.env.FRONTEND_INSTALLATION_SECRET = 'multi-tenant-verification-secret-32-chars'
process.env.BACKEND_URL = 'https://backend.example.com'

const expiresAt = Date.now() + 60_000
const createBinding = (slug: string, name: string) => sealInstallationBinding({
  apiUrl: 'https://backend.example.com',
  establishmentUrl: `https://frontend-c-kappa.vercel.app/e/${slug}`,
  installationToken: `installation-${slug}`,
  tenantSlug: slug,
  establishmentName: name,
  expiresAt,
})

const piraoBinding = createBinding('rei-do-pirao', 'Rei do Pirão')
const carneBinding = createBinding('rei-da-carne-de-sol', 'Rei da Carne de Sol')
const cookies = [
  `${installationCookieName('rei-do-pirao')}=${piraoBinding}`,
  `${installationGateCookieName('rei-do-pirao')}=${createInstallationGate(piraoBinding, expiresAt)}`,
  `${installationCookieName('rei-da-carne-de-sol')}=${carneBinding}`,
  `${installationGateCookieName('rei-da-carne-de-sol')}=${createInstallationGate(carneBinding, expiresAt)}`,
  `${authCookieName('rei-do-pirao')}=token-pirao`,
  `${authCookieName('rei-da-carne-de-sol')}=token-carne`,
].join('; ')

const request = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, {
  headers: { cookie: cookies, ...headers },
})

async function verify() {
  assert.equal(tenantSlugFromPathname('/e/rei-do-pirao/admin/produtos'), 'rei-do-pirao')
  assert.equal(operationalPathname('/e/rei-do-pirao/admin/produtos'), '/admin/produtos')
  assert.equal(
    tenantPageUrl('/admin/produtos?pagina=2', 'rei-do-pirao'),
    '/e/rei-do-pirao/admin/produtos?pagina=2',
    'links operacionais devem manter o estabelecimento visível',
  )
  assert.equal(tenantPageUrl('/', 'rei-do-pirao'), '/e/rei-do-pirao/inicio')
  assert.equal(tenantPageUrl('/api/products', 'rei-do-pirao'), '/api/products', 'rotas técnicas não recebem prefixo')

  const piraoLogin = await middleware(request('https://frontend-c-kappa.vercel.app/e/rei-do-pirao/login'))
  const carneLogin = await middleware(request('https://frontend-c-kappa.vercel.app/e/rei-da-carne-de-sol/login'))
  assert.match(piraoLogin.headers.get('x-middleware-rewrite') || '', /\/login\?estabelecimento=rei-do-pirao$/)
  assert.match(carneLogin.headers.get('x-middleware-rewrite') || '', /\/login\?estabelecimento=rei-da-carne-de-sol$/)

  const piraoProducts = await middleware(request('https://frontend-c-kappa.vercel.app/e/rei-do-pirao/admin/produtos'))
  assert.match(
    piraoProducts.headers.get('x-middleware-rewrite') || '',
    /\/admin\/produtos\?estabelecimento=rei-do-pirao$/,
    'a URL explícita deve resolver a página interna preservando o tenant',
  )

  const piraoHome = await middleware(request('https://frontend-c-kappa.vercel.app/e/rei-do-pirao/inicio'))
  assert.match(piraoHome.headers.get('x-middleware-rewrite') || '', /\/?estabelecimento=rei-do-pirao$/)

  const legacyLogin = await middleware(request('https://frontend-c-kappa.vercel.app/login?estabelecimento=rei-do-pirao'))
  assert.equal(legacyLogin.headers.get('location'), 'https://frontend-c-kappa.vercel.app/e/rei-do-pirao/login')

  const publicMenu = await middleware(request('https://frontend-c-kappa.vercel.app/e/rei-do-pirao/cardapio'))
  assert.equal(publicMenu.headers.get('x-middleware-next'), '1', 'cardápio público não deve ser reescrito')

  const unknown = await middleware(request('https://frontend-c-kappa.vercel.app/login?estabelecimento=novo-restaurante'))
  assert.equal(unknown.status, 307)
  assert.equal(
    unknown.headers.get('location'),
    'https://frontend-c-kappa.vercel.app/instalacao?estabelecimento=novo-restaurante&retorno=%2Flogin',
  )

  globalThis.fetch = async () => new Response(JSON.stringify({
    installationToken: 'installation-rei-da-carne-de-sol',
    estabelecimento: { slug: 'rei-da-carne-de-sol', nome: 'Rei da Carne de Sol' },
  }), { status: 200, headers: { 'content-type': 'application/json' } })
  const migrated = await activateInstallation(new NextRequest(
    'https://frontend-c-kappa.vercel.app/api/installation/activate',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${INSTALLATION_COOKIE}=${piraoBinding}; token=token-pirao`,
      },
      body: JSON.stringify({
        establishmentUrl: 'https://frontend-c-kappa.vercel.app/e/rei-da-carne-de-sol',
        code: 'codigo-de-teste',
      }),
    },
  ))
  const migratedCookies = migrated.headers.get('set-cookie') || ''
  assert.match(migratedCookies, /controlae_installation_rei-do-pirao=/, 'vínculo legado do Pirão deve ser migrado')
  assert.match(migratedCookies, /controlae_token_rei-do-pirao=token-pirao/, 'sessão legada do Pirão deve ser migrada')
  assert.match(migratedCookies, /controlae_installation_rei-da-carne-de-sol=/, 'novo vínculo da Carne de Sol deve ser salvo separadamente')

  const backendCookies: string[] = []
  const backendInstallations: string[] = []
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers)
    backendCookies.push(String(headers.get('cookie')))
    backendInstallations.push(String(headers.get('x-controlae-installation')))
    return new Response('{}', {
      status: 200,
      headers: { 'set-cookie': 'token=novo-token; Path=/; HttpOnly; SameSite=Strict' },
    })
  }

  const proxied = await proxyBackendRequest(request(
    'https://frontend-c-kappa.vercel.app/api/auth/me',
    { [TENANT_HEADER]: 'rei-da-carne-de-sol' },
  ), '/auth/me')
  assert.equal(backendCookies[0], 'token=token-carne', 'proxy não deve enviar a sessão do Pirão')
  assert.equal(backendInstallations[0], 'installation-rei-da-carne-de-sol', 'proxy deve comprovar a instalação do tenant selecionado')
  assert.match(
    proxied.headers.get('set-cookie') || '',
    /^controlae_token_rei-da-carne-de-sol=novo-token/,
    'token devolvido deve permanecer isolado por estabelecimento',
  )

  console.log('OK: vínculos e sessões de dois estabelecimentos permanecem isolados no mesmo navegador')
}

void verify().catch(error => {
  console.error(error)
  process.exit(1)
})
