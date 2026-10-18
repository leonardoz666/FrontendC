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
    <main className="flex min-h-screen w-full bg-[#f5f6f8]">
      {/* Left Side - Hero / Brand */}
      <div
        className="relative hidden items-end overflow-hidden bg-slate-950 lg:flex lg:w-[46%]"
        style={branding.imagemLoginUrl ? { backgroundImage: `url(${branding.imagemLoginUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
      >
        <div className="absolute inset-0 z-10 bg-slate-950/60" />
        <div className="relative z-20 max-w-xl p-12 text-white xl:p-16">
          <div className="mb-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 p-2">
              {branding.logoUrl ? <img src={branding.logoUrl} alt={`Logo ${establishmentName}`} className="h-full w-full object-contain" /> : <ChefHat size={32} className="text-white" />}
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">Operação ControlaÊ</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.035em] xl:text-5xl">{establishmentName}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            {branding.slogan}
          </p>
          <div className="mt-10 h-px w-20 bg-orange-500" aria-hidden="true" />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md border-slate-200 shadow-none">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="flex justify-center lg:hidden mb-4">
               {branding.logoUrl ? <img src={branding.logoUrl} alt={`Logo ${establishmentName}`} className="h-14 w-28 object-contain" /> : <ChefHat size={48} className="text-orange-600" />}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Acesso da equipe</p>
            <CardTitle className="text-center text-2xl font-bold lg:text-left">Entre no sistema</CardTitle>
            <p className="text-gray-500 text-sm text-center lg:text-left">
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
            
            <div className="mt-6 text-center text-xs text-gray-600">
              &copy; {new Date().getFullYear()} {establishmentName}. Todos os direitos reservados.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
