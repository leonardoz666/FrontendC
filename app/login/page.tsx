'use client'
/* eslint-disable @next/next/no-img-element -- a marca do tenant pode ser uma data URL */

import { useEffect, useState } from 'react'
import { useTenantRouter } from '@/app/lib/tenant-router'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ChefHat } from 'lucide-react'
import { ApiError, apiFetch } from '@/app/lib/api'
import { InlineLoader } from '@/app/components/ui/PageLoader'
import { useBranding } from '@/app/contexts/BrandingContext'

type LoginResponse = { user?: { role?: string } }

type LoginLocation = {
  latitude: number
  longitude: number
  accuracy: number
}

function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') return null
  const code = (error.body as Record<string, unknown>).code
  return typeof code === 'string' ? code : null
}

function requestCurrentLocation(): Promise<LoginLocation> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Este aparelho não oferece localização. O login de garçom não pode ser liberado.'))
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      positionError => {
        if (positionError.code === positionError.PERMISSION_DENIED) {
          reject(new Error('Permita o acesso à localização para entrar como garçom.'))
          return
        }
        if (positionError.code === positionError.TIMEOUT) {
          reject(new Error('Não foi possível confirmar sua localização a tempo. Tente novamente.'))
          return
        }
        reject(new Error('Não foi possível confirmar sua localização. Ative o GPS e tente novamente.'))
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    )
  })
}

function paginaInicial(role?: string): string {
  return role === 'ESTOQUISTA' ? '/admin/estoque' : '/'
}

const LOGIN_IMAGE_POSITIONS = {
  ESQUERDA: 'left center',
  CENTRO: 'center',
  DIREITA: 'right center',
} as const

export default function LoginPage() {
  const { branding } = useBranding()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const establishmentName = branding.nomeExibicao
  const router = useTenantRouter()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      // Short timeout to avoid blocking if backend is down
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

      try {
        const data = await apiFetch<{ user?: { role?: string } }>('/auth/me', {
          signal: controller.signal,
          redirectOn401: false,
        })
        if (!cancelled && data.user) {
          router.replace(paginaInicial(data.user.role))
        }
      } catch {
        // Login continua disponível quando a verificação da sessão falha.
      } finally {
        clearTimeout(timeoutId)
      }
    }

    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLocationStatus('')
    setLoading(true)

    try {
      let data: LoginResponse
      try {
        data = await apiFetch<LoginResponse>('/auth/login', {
          method: 'POST',
          body: { login, senha },
          redirectOn401: false,
        })
      } catch (initialError) {
        if (errorCode(initialError) !== 'WAITER_LOCATION_REQUIRED') throw initialError

        setLocationStatus('Confirmando se você está no restaurante...')
        const location = await requestCurrentLocation()
        data = await apiFetch<LoginResponse>('/auth/login', {
          method: 'POST',
          body: { login, senha, location },
          redirectOn401: false,
        })
      }
      router.push(paginaInicial(data.user?.role))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar ao servidor')
    } finally {
      setLocationStatus('')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full bg-gray-50">
      <section
          className="relative hidden items-center justify-center overflow-hidden bg-orange-600 lg:flex lg:w-1/2"
          style={branding.imagemLoginUrl ? {
            backgroundImage: `url(${branding.imagemLoginUrl})`,
            backgroundPosition: LOGIN_IMAGE_POSITIONS[branding.imagemLoginPosicao],
            backgroundSize: 'cover',
          } : undefined}
        >
        <div className="absolute inset-0 z-10 bg-black/10" aria-hidden="true" />
        <div className="relative z-20 p-12 text-center text-white">
          <div className="mb-8 flex justify-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl bg-white/15 p-3">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={`Logo ${establishmentName}`}
                  width={128}
                  height={128}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ChefHat size={64} aria-hidden="true" />
              )}
            </div>
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-[-0.03em]">{establishmentName}</h1>
          {branding.slogan && (
            <p className="mx-auto max-w-md text-xl text-orange-50/85">{branding.slogan}</p>
          )}
        </div>
        {!branding.imagemLoginUrl && (
          <>
            <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-orange-500 opacity-70 blur-xl" aria-hidden="true" />
            <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-orange-700 opacity-70 blur-xl" aria-hidden="true" />
          </>
        )}
      </section>

      <section className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="mb-4 flex justify-center lg:hidden">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={`Logo ${establishmentName}`}
                  width={112}
                  height={56}
                  className="h-14 w-28 object-contain"
                />
              ) : (
                <ChefHat size={48} className="text-orange-600" aria-hidden="true" />
              )}
            </div>
            <CardTitle className="text-center text-2xl font-bold lg:text-left">Bem-vindo de volta</CardTitle>
            <p className="text-center text-sm text-gray-500 lg:text-left">
              Entre com suas credenciais para acessar o sistema
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Login"
                name="login"
                autoComplete="username"
                placeholder="Ex.: garcom1"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
              />
              <Input
                label="Senha"
                type="password"
                name="senha"
                autoComplete="current-password"
                placeholder="••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              {locationStatus && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-sm font-medium text-blue-700" role="status">
                  <InlineLoader message={locationStatus.replace(/\.\.\.$/, '')} className="text-blue-700" />
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                Entrar
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-600">
              &copy; {new Date().getFullYear()} {establishmentName}. Todos os direitos reservados.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
