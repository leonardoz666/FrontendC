'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiFetch } from '@/app/lib/api'

export type RestaurantBranding = {
  nome: string
  nomeExibicao: string
  slogan: string
  logoUrl: string
  corPrimaria: string
  corSecundaria: string
  corDestaque: string
}

export const DEFAULT_BRANDING: RestaurantBranding = {
  nome: 'Rei do Pirão',
  nomeExibicao: 'Rei do Pirão',
  slogan: 'Operação, atendimento e gestão em um só lugar.',
  logoUrl: '',
  corPrimaria: '#ea580c',
  corSecundaria: '#0f172a',
  corDestaque: '#f97316',
}

type BrandingPayload = Partial<RestaurantBranding> & { nome?: string }

type BrandingContextValue = {
  branding: RestaurantBranding
  carregando: boolean
  refreshBranding: () => Promise<void>
  setBranding: (branding: BrandingPayload) => void
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

function normalizedBranding(value?: BrandingPayload): RestaurantBranding {
  const nome = value?.nome?.trim() || DEFAULT_BRANDING.nome
  return {
    nome,
    nomeExibicao: value?.nomeExibicao?.trim() || nome,
    slogan: value?.slogan?.trim() || DEFAULT_BRANDING.slogan,
    logoUrl: value?.logoUrl?.trim() || '',
    corPrimaria: value?.corPrimaria || DEFAULT_BRANDING.corPrimaria,
    corSecundaria: value?.corSecundaria || DEFAULT_BRANDING.corSecundaria,
    corDestaque: value?.corDestaque || DEFAULT_BRANDING.corDestaque,
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
  root.style.setProperty('--brand-primary', branding.corPrimaria)
  root.style.setProperty('--brand-secondary', branding.corSecundaria)
  root.style.setProperty('--brand-accent', branding.corDestaque)
  root.style.setProperty('--brand-on-primary', readableTextColor(branding.corPrimaria))
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
  document.title = `${branding.nomeExibicao} | Sistema de Gestão`
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBrandingState] = useState(DEFAULT_BRANDING)
  const [carregando, setCarregando] = useState(true)

  const setBranding = useCallback((value: BrandingPayload) => {
    const normalized = normalizedBranding(value)
    setBrandingState(normalized)
    applyBranding(normalized)
  }, [])

  const refreshBranding = useCallback(async () => {
    try {
      const response = await apiFetch<{ estabelecimento?: BrandingPayload }>('/tenant/current', { redirectOn401: false })
      if (response.estabelecimento) setBranding(response.estabelecimento)
    } catch {
      setBranding(DEFAULT_BRANDING)
    } finally {
      setCarregando(false)
    }
  }, [setBranding])

  useEffect(() => {
    void refreshBranding()
  }, [refreshBranding])

  return (
    <BrandingContext.Provider value={{ branding, carregando, refreshBranding, setBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext)
  if (!context) throw new Error('useBranding deve ser usado dentro de BrandingProvider')
  return context
}
