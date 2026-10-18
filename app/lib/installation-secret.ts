const DEVELOPMENT_INSTALLATION_SECRET = 'controlae-frontend-development-only-secret'

export function resolveInstallationSecret(): string | null {
  const configured = process.env.FRONTEND_INSTALLATION_SECRET?.trim()
  if (configured && configured.length >= 32) return configured
  return process.env.NODE_ENV === 'production' ? null : DEVELOPMENT_INSTALLATION_SECRET
}
