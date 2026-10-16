import assert from 'node:assert/strict'
import { apiFetch } from '../app/lib/api'

const storage = new Map<string, string>([['controlae:tab-tenant', 'rei-do-pirao']])
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    location: { pathname: '/', search: '', origin: 'https://frontend.example.com', replace() {} },
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  },
})
Object.defineProperty(globalThis, 'document', { configurable: true, value: { cookie: '' } })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })

let releaseOldSession!: (response: Response) => void
const oldSessionResponse = new Promise<Response>(resolve => { releaseOldSession = resolve })
const calls: string[] = []

globalThis.fetch = async input => {
  const url = String(input)
  calls.push(url)
  if (url === '/api/auth/me' && calls.filter(call => call === url).length === 1) return oldSessionResponse
  if (url === '/api/auth/logout') return new Response(JSON.stringify({ success: true }), { status: 200 })
  if (url === '/api/auth/me') return new Response(JSON.stringify({ user: null }), { status: 200 })
  throw new Error(`Requisição inesperada: ${url}`)
}

async function verify() {
  const sessionStartedBeforeLogout = apiFetch<{ user: { name: string } | null }>('/auth/me', { redirectOn401: false })
  await new Promise(resolve => setTimeout(resolve, 0))
  await apiFetch('/auth/logout', { method: 'POST' })

  releaseOldSession(new Response(JSON.stringify({ user: { name: 'Sessão antiga' } }), { status: 200 }))
  await sessionStartedBeforeLogout

  const callsBeforeLoginPage = calls.length
  const loginPageSession = await apiFetch<{ user: { name: string } | null }>('/auth/me', { redirectOn401: false })

  assert.equal(calls.length, callsBeforeLoginPage + 1, 'a tela de login deve consultar o servidor depois do logout')
  assert.equal(loginPageSession.user, null, 'a sessão encerrada não pode reaparecer do cache')
  console.log('OK: respostas de sessão anteriores ao logout não repovoam o cache')
}

void verify().catch(error => {
  console.error(error)
  process.exit(1)
})
