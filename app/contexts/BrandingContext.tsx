'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch, invalidateAuthMeCache } from '@/app/lib/api'
import { currentTenantSlug } from '@/app/lib/offline'
import { tenantResourceUrl } from '@/app/lib/tenant-navigation'
import { parseTenantModules, type ModuleKey } from '@/app/lib/modules'

export type RestaurantBranding = {
  nome: string
  nomeExibicao: string
  slogan: string
  logoUrl: string
  logoCompactaUrl: string
  faviconUrl: string
  imagemLoginUrl: string
  corPrimaria: string
  corSecundaria: string
  corDestaque: string
  fonteInterface: 'MODERNA' | 'SISTEMA' | 'CLASSICA'
  temaPadrao: 'CLARO' | 'ESCURO' | 'SISTEMA'
  modulosAtivos: ModuleKey[]
}

export const DEFAULT_BRANDING: RestaurantBranding = {
  nome: 'ControlaÊ',
  nomeExibicao: 'ControlaÊ',
  slogan: 'Operação, atendimento e gestão em um só lugar.',
  logoUrl: '',
  logoCompactaUrl: '',
  faviconUrl: '',
  imagemLoginUrl: '',
  corPrimaria: '#ea580c',
  corSecundaria: '#0f172a',
  corDestaque: '#f97316',
  fonteInterface: 'MODERNA',
  temaPadrao: 'SISTEMA',
  modulosAtivos: [],
}

const NEUTRAL_BRANDING: RestaurantBranding = {
  nome: 'ControlaÊ',
  nomeExibicao: 'ControlaÊ',
  slogan: 'Carregando estabelecimento...',
  logoUrl: '',
  logoCompactaUrl: '',
  faviconUrl: '',
  imagemLoginUrl: '',
  corPrimaria: '#475569',
  corSecundaria: '#0f172a',
  corDestaque: '#64748b',
  fonteInterface: 'MODERNA',
  temaPadrao: 'SISTEMA',
  modulosAtivos: [],
}

type BrandingPayload = Partial<RestaurantBranding> & { nome?: string }

type BrandingContextValue = {
  branding: RestaurantBranding
  carregando: boolean
  refreshBranding: () => Promise<void>
  setBranding: (branding: BrandingPayload) => void
  moduleEnabled: (module: ModuleKey) => boolean
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

function normalizedBranding(value?: BrandingPayload): RestaurantBranding {
  const nome = value?.nome?.trim() || DEFAULT_BRANDING.nome
  const fonteInterface = value?.fonteInterface
  const temaPadrao = value?.temaPadrao
  return {
    nome,
    nomeExibicao: value?.nomeExibicao?.trim() || nome,
    slogan: value?.slogan?.trim() || DEFAULT_BRANDING.slogan,
    logoUrl: tenantResourceUrl(value?.logoUrl?.trim() || ''),
    logoCompactaUrl: tenantResourceUrl(value?.logoCompactaUrl?.trim() || ''),
    faviconUrl: tenantResourceUrl(value?.faviconUrl?.trim() || ''),
    imagemLoginUrl: tenantResourceUrl(value?.imagemLoginUrl?.trim() || ''),
    corPrimaria: value?.corPrimaria || DEFAULT_BRANDING.corPrimaria,
    corSecundaria: value?.corSecundaria || DEFAULT_BRANDING.corSecundaria,
    corDestaque: value?.corDestaque || DEFAULT_BRANDING.corDestaque,
    fonteInterface: fonteInterface && ['MODERNA', 'SISTEMA', 'CLASSICA'].includes(fonteInterface)
      ? fonteInterface
      : DEFAULT_BRANDING.fonteInterface,
    temaPadrao: temaPadrao && ['CLARO', 'ESCURO', 'SISTEMA'].includes(temaPadrao)
      ? temaPadrao
      : DEFAULT_BRANDING.temaPadrao,
    modulosAtivos: parseTenantModules(value?.modulosAtivos),
  }
}

function channel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

function mix(hex: string, target: '#ffffff' | '#000000', amount: number): string {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_BRANDING.corPrimaria
  const targetValue = target === '#ffffff' ? 255 : 0
  const values = [1, 3, 5].map(offset => Math.round(channel(safe, offset) * (1 - amount) + targetValue * amount))
  return `#${values.map(value => value.toString(16).padStart(2, '0')).join('')}`
}

export function readableTextColor(hex: string): '#ffffff' | '#0f172a' {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_BRANDING.corPrimaria
  const channels = [1, 3, 5].map(offset => channel(safe, offset) / 255)
  const luminance = channels
    .map(value => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0)
  return 1.05 / (luminance + .05) >= 4.5 ? '#ffffff' : '#0f172a'
}

function applyBranding(branding: RestaurantBranding): void {
  const root = document.documentElement
  const fontFamilies = {
    MODERNA: 'var(--font-geist-sans), "Segoe UI", sans-serif',
    SISTEMA: '"Segoe UI", Arial, sans-serif',
    CLASSICA: 'Georgia, "Times New Roman", serif',
  } as const
  root.style.setProperty('--brand-primary', branding.corPrimaria)
  root.style.setProperty('--brand-secondary', branding.corSecundaria)
  root.style.setProperty('--brand-accent', branding.corDestaque)
  root.style.setProperty('--brand-on-primary', readableTextColor(branding.corPrimaria))
  root.style.setProperty('--brand-font-family', fontFamilies[branding.fonteInterface])
  root.style.setProperty('--color-slate-950', mix(branding.corSecundaria, '#000000', .16))
  root.style.setProperty('--color-slate-900', branding.corSecundaria)
  root.style.setProperty('--color-slate-800', mix(branding.corSecundaria, '#ffffff', .12))
  root.style.setProperty('--color-slate-700', mix(branding.corSecundaria, '#ffffff', .25))
  const palette: Record<string, string> = {
    '50': mix(branding.corPrimaria, '#ffffff', .94),
    '100': mix(branding.corPrimaria, '#ffffff', .86),
    '200': mix(branding.corPrimaria, '#ffffff', .72),
    '300': mix(branding.corPrimaria, '#ffffff', .54),
    '400': mix(branding.corPrimaria, '#ffffff', .28),
    '500': mix(branding.corPrimaria, '#ffffff', .1),
    '600': branding.corPrimaria,
    '700': mix(branding.corPrimaria, '#000000', .18),
    '800': mix(branding.corPrimaria, '#000000', .34),
    '900': mix(branding.corPrimaria, '#000000', .48),
    '950': mix(branding.corPrimaria, '#000000', .62),
  }
  Object.entries(palette).forEach(([shade, color]) => root.style.setProperty(`--color-orange-${shade}`, color))
  document.title = `${branding.nomeExibicao} | ControlaÊ`
  let favicon = document.querySelector<HTMLLinkElement>('link[data-tenant-branding="favicon"]')
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.dataset.tenantBranding = 'favicon'
    document.head.appendChild(favicon)
  }
  favicon.href = branding.faviconUrl || '/icon-192x192.png'
  window.dispatchEvent(new CustomEvent('controlae-branding-theme', { detail: branding.temaPadrao }))
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isInstallationPage = pathname === '/instalacao'
  const queryClient = useQueryClient()
  const tenantHint = searchParams.get('estabelecimento') || currentTenantSlug()
  const [branding, setBrandingState] = useState<RestaurantBranding | null>(isInstallationPage ? DEFAULT_BRANDING : null)
  const [resolvedTenant, setResolvedTenant] = useState<string | null>(isInstallationPage ? tenantHint : null)
  const [carregando, setCarregando] = useState(!isInstallationPage)
  const requestVersion = useRef(0)

  const setBranding = useCallback((value: BrandingPayload) => {
    const normalized = normalizedBranding(value)
    setBrandingState(normalized)
    applyBranding(normalized)
  }, [])

  const refreshBranding = useCallback(async () => {
    if (isInstallationPage) {
      setBrandingState(DEFAULT_BRANDING)
      setResolvedTenant(tenantHint)
      setCarregando(false)
      applyBranding(DEFAULT_BRANDING)
      return
    }
    const requestId = ++requestVersion.current
    setCarregando(true)
    setBrandingState(null)
    applyBranding(NEUTRAL_BRANDING)
    try {
      const response = await apiFetch<{ estabelecimento?: BrandingPayload }>('/tenant/current', { redirectOn401: false })
      if (requestId !== requestVersion.current) return
      if (response.estabelecimento) setBranding(response.estabelecimento)
      else setBranding(NEUTRAL_BRANDING)
      setResolvedTenant(tenantHint)
    } catch {
      if (requestId === requestVersion.current) {
        setBranding(NEUTRAL_BRANDING)
        setResolvedTenant(tenantHint)
      }
    } finally {
      if (requestId === requestVersion.current) setCarregando(false)
    }
  }, [isInstallationPage, setBranding, tenantHint])

  useEffect(() => {
    queryClient.clear()
    invalidateAuthMeCache()
    void refreshBranding()
  }, [queryClient, refreshBranding])

  if (carregando || !branding || resolvedTenant !== tenantHint) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-label="Carregando estabelecimento">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" aria-hidden="true" />
          Carregando estabelecimento...
        </div>
      </div>
    )
  }

  const moduleEnabled = (module: ModuleKey) => branding.modulosAtivos.includes(module)

  return (
    <BrandingContext.Provider value={{ branding, carregando, refreshBranding, setBranding, moduleEnabled }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext)
  if (!context) throw new Error('useBranding deve ser usado dentro de BrandingProvider')
  return context
}
