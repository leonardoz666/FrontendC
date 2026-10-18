'use client'
/* eslint-disable @next/next/no-img-element -- a marca do tenant pode ser uma data URL */

import { useEffect, useState } from 'react'
import { useTenantRouter } from '@/app/lib/tenant-router'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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
    <main className="flex min-h-screen w-full items-center justify-center bg-[#f5f6f8] px-4 py-10 sm:px-6">
      <section className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header
          className="relative overflow-hidden bg-slate-950 px-6 py-5 text-white sm:px-7"
          style={branding.imagemLoginUrl ? { backgroundImage: `url(${branding.imagemLoginUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
        >
          {branding.imagemLoginUrl && <div className="absolute inset-0 bg-slate-950/75" aria-hidden="true" />}
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/10 p-2">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={`Logo ${establishmentName}`}
                  width={56}
                  height={56}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ChefHat size={28} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-[-0.02em]">{establishmentName}</p>
              {branding.slogan && (
                <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-slate-300">{branding.slogan}</p>
              )}
            </div>
          </div>
        </header>

        <div className="px-6 py-6 sm:px-7 sm:py-7">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950">Entre no sistema</h1>
            <p className="mt-1 text-sm text-slate-600">Use suas credenciais para acessar a operação.</p>
          </div>

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

          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {establishmentName}. Todos os direitos reservados.
          </p>
        </div>
      </section>
    </main>
  )
}
