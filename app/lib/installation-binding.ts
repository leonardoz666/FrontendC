import crypto from 'crypto'

export const INSTALLATION_COOKIE = 'controlae_installation'
export const INSTALLATION_GATE_COOKIE = 'controlae_installation_gate'
export const API_ORIGIN_COOKIE = 'controlae_api_origin'
export const TENANT_COOKIE = 'controlae_tenant_slug'

export type InstallationBinding = {
  apiUrl: string
  installationToken: string
  tenantSlug: string
  establishmentName: string
  expiresAt: number
}

function secret(): string {
  const value = process.env.FRONTEND_INSTALLATION_SECRET?.trim()
  if (value && value.length >= 32) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_INSTALLATION_SECRET deve ter pelo menos 32 caracteres')
  }
  return 'controlae-frontend-development-only-secret'
}

function key(): Buffer {
  return crypto.createHash('sha256').update(`controlae-frontend-binding\0${secret()}`).digest()
}

export function createInstallationGate(bindingValue: string, expiresAt: number): string {
  const signature = crypto
    .createHmac('sha256', `controlae-frontend-gate\0${secret()}`)
    .update(`${expiresAt}.${bindingValue}`)
    .digest('base64url')
  return `${expiresAt}.${signature}`
}

export function normalizeApiUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('Informe uma URL válida, como https://api.seurestaurante.com.br')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('A URL da API não pode conter usuário, senha, parâmetros ou fragmentos')
  }
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) {
    throw new Error('Use uma URL HTTPS. HTTP é permitido somente no desenvolvimento local.')
  }
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString().replace(/\/$/, '')
}

export function sealInstallationBinding(binding: InstallationBinding): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from('controlae-installation-v1'))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(binding), 'utf8'), cipher.final()])
  return ['ci1', iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.')
}

export function openInstallationBinding(value: string | undefined): InstallationBinding | null {
  if (!value) return null
  try {
    const [version, ivValue, encryptedValue, tagValue, extra] = value.split('.')
    if (version !== 'ci1' || !ivValue || !encryptedValue || !tagValue || extra) return null
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivValue, 'base64url'))
    decipher.setAAD(Buffer.from('controlae-installation-v1'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    const result = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8')) as Partial<InstallationBinding>
    if (typeof result.apiUrl !== 'string' || typeof result.installationToken !== 'string' ||
        typeof result.tenantSlug !== 'string' || typeof result.establishmentName !== 'string' ||
        typeof result.expiresAt !== 'number' || result.expiresAt <= Date.now()) return null
    return { ...result, apiUrl: normalizeApiUrl(result.apiUrl) } as InstallationBinding
  } catch {
    return null
  }
}
