'use client'
/* eslint-disable @next/next/no-img-element -- a logo é enviada pelo dono como data URL otimizada no navegador */

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Check, ImagePlus, Palette, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { DEFAULT_BRANDING, readableTextColor, type RestaurantBranding, useBranding } from '@/app/contexts/BrandingContext'
import { useToast } from '@/contexts/ToastContext'

type BrandingResponse = { estabelecimento: Partial<RestaurantBranding> & { nome?: string } }

const PRESETS = [
  { nome: 'Laranja da casa', primaria: '#ea580c', secundaria: '#0f172a', destaque: '#f97316' },
  { nome: 'Verde cozinha', primaria: '#15803d', secundaria: '#14261b', destaque: '#f59e0b' },
  { nome: 'Azul contemporâneo', primaria: '#2563eb', secundaria: '#172554', destaque: '#f59e0b' },
  { nome: 'Vinho clássico', primaria: '#9f1239', secundaria: '#27131a', destaque: '#d97706' },
]

function processLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Escolha uma imagem PNG, JPEG ou WebP.'))
  }
  if (file.size > 2_000_000) return Promise.reject(new Error('A imagem original deve ter no máximo 2 MB.'))

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('O arquivo de imagem é inválido.'))
      image.onload = () => {
        const scale = Math.min(1, 520 / image.width, 240 / image.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('O navegador não conseguiu preparar a logo.'))
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const encoded = canvas.toDataURL('image/webp', .82)
        if (encoded.length > 68_000) {
          return reject(new Error('A logo continua muito pesada. Use uma imagem mais simples ou menor.'))
        }
        resolve(encoded)
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export default function PersonalizacaoPage() {
  const { branding, setBranding } = useBranding()
  const { showToast } = useToast()
  const [form, setForm] = useState(branding)
  const [salvando, setSalvando] = useState(false)
  const [logoCarregando, setLogoCarregando] = useState(false)

  useEffect(() => setForm(branding), [branding])

  const update = <K extends keyof RestaurantBranding>(field: K, value: RestaurantBranding[K]) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const selecionarLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLogoCarregando(true)
    try {
      update('logoUrl', await processLogo(file))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível preparar a logo.', 'error')
    } finally {
      setLogoCarregando(false)
    }
  }

  const salvar = async (event: FormEvent) => {
    event.preventDefault()
    setSalvando(true)
    try {
      const response = await apiFetch<BrandingResponse>('/tenant/branding', {
        method: 'PATCH',
        body: {
          nomeExibicao: form.nomeExibicao,
          slogan: form.slogan,
          logoUrl: form.logoUrl,
          corPrimaria: form.corPrimaria,
          corSecundaria: form.corSecundaria,
          corDestaque: form.corDestaque,
        },
      })
      setBranding({ ...form, ...response.estabelecimento })
      showToast('Identidade visual atualizada em todo o sistema.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar a personalização.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const aplicarPreset = (preset: typeof PRESETS[number]) => {
    setForm(current => ({
      ...current,
      corPrimaria: preset.primaria,
      corSecundaria: preset.secundaria,
      corDestaque: preset.destaque,
    }))
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.025em] text-slate-950">Personalização</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Defina a identidade que sua equipe verá no login, no menu e nas principais ações do sistema.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Check className="h-4 w-4 text-emerald-600" />
            Exclusivo deste restaurante
          </div>
        </header>

        <form onSubmit={salvar} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <section className="p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Marca do restaurante</h2>
                  <p className="mt-1 text-sm text-slate-500">Nome, mensagem de entrada e logo oficial.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-800">Nome exibido</span>
                  <input value={form.nomeExibicao} onChange={event => update('nomeExibicao', event.target.value)} maxLength={80} required className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-800">Mensagem de entrada</span>
                  <input value={form.slogan} onChange={event => update('slogan', event.target.value)} maxLength={140} placeholder="Ex.: Atendimento rápido, gestão completa." className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-3 shadow-[0_5px_16px_rgba(15,23,42,0.08)] sm:w-40">
                  {form.logoUrl ? <img src={form.logoUrl} alt="Prévia da logo" className="h-full w-full object-contain" /> : <span className="text-3xl font-black text-orange-600">{form.nomeExibicao.charAt(0).toUpperCase() || 'R'}</span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Logo principal</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">PNG, JPEG ou WebP, até 2 MB. O sistema otimiza a imagem antes de salvar.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-bold text-white transition hover:bg-slate-700 focus-within:ring-4 focus-within:ring-slate-200">
                      <ImagePlus className="h-4 w-4" />
                      {logoCarregando ? 'Preparando...' : form.logoUrl ? 'Trocar logo' : 'Escolher logo'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void selecionarLogo(event)} disabled={logoCarregando} className="sr-only" />
                    </label>
                    {form.logoUrl && (
                      <button type="button" onClick={() => update('logoUrl', '')} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                        <Trash2 className="h-4 w-4" /> Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-200 p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Palette className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Cores da identidade</h2>
                  <p className="mt-1 text-sm text-slate-500">Os contrastes são aplicados automaticamente em botões, foco e navegação.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {([
                  ['corPrimaria', 'Cor principal', 'Botões e navegação'],
                  ['corSecundaria', 'Cor institucional', 'Textos e superfícies'],
                  ['corDestaque', 'Cor de destaque', 'Avisos e detalhes'],
                ] as const).map(([field, label, help]) => (
                  <label key={field} className="rounded-xl bg-slate-50 p-3">
                    <span className="text-sm font-bold text-slate-800">{label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{help}</span>
                    <span className="mt-3 flex items-center gap-2">
                      <input type="color" value={form[field]} onChange={event => update(field, event.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" aria-label={label} />
                      <input value={form[field]} onChange={event => update(field, event.target.value)} pattern="#[0-9a-fA-F]{6}" maxLength={7} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-2 font-mono text-xs font-bold uppercase text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" aria-label={`${label} hexadecimal`} />
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-sm font-bold text-slate-800">Combinações rápidas</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PRESETS.map(preset => (
                    <button key={preset.nome} type="button" onClick={() => aplicarPreset(preset)} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-3 text-left text-sm font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                      <span className="flex" aria-hidden="true">
                        {[preset.primaria, preset.secundaria, preset.destaque].map(color => <span key={color} className="-ml-1 h-7 w-7 first:ml-0 rounded-full border-2 border-white" style={{ backgroundColor: color }} />)}
                      </span>
                      {preset.nome}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button type="button" onClick={() => setForm({ ...DEFAULT_BRANDING, nome: branding.nome, nomeExibicao: branding.nome })} disabled={salvando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
                <RotateCcw className="h-4 w-4" /> Restaurar padrão
              </button>
              <button type="submit" disabled={salvando || logoCarregando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 text-sm font-bold text-white shadow-[0_7px_18px_rgba(15,23,42,0.16)] transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
                <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Salvar personalização'}
              </button>
            </footer>
          </div>

          <aside className="xl:sticky xl:top-6">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_38px_rgba(15,23,42,0.1)]">
              <div className="flex min-h-72 flex-col justify-between p-7" style={{ backgroundColor: form.corPrimaria, color: readableTextColor(form.corPrimaria) }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/15 p-2">
                    {form.logoUrl ? <img src={form.logoUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-2xl font-black">{form.nomeExibicao.charAt(0).toUpperCase() || 'R'}</span>}
                  </div>
                  <div>
                    <p className="text-lg font-black tracking-[-0.02em]">{form.nomeExibicao || 'Seu restaurante'}</p>
                    <p className="text-sm opacity-75">Operação do salão</p>
                  </div>
                </div>
                <div>
                  <Sparkles className="mb-4 h-7 w-7 opacity-80" />
                  <p className="max-w-sm text-3xl font-black leading-tight tracking-[-0.035em]">{form.slogan || 'Sua mensagem aparece aqui.'}</p>
                </div>
              </div>
              <div className="p-6" style={{ color: form.corSecundaria }}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Prévia do sistema</p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">Mesa 08</p>
                    <p className="mt-0.5 text-sm text-slate-500">Atendimento em andamento</p>
                  </div>
                  <button type="button" tabIndex={-1} className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: form.corPrimaria, color: readableTextColor(form.corPrimaria) }}>Abrir mesa</button>
                </div>
                <div className="mt-5 h-1.5 rounded-full" style={{ backgroundColor: form.corDestaque }} />
              </div>
            </div>
            <p className="mt-3 px-2 text-xs leading-5 text-slate-500">A prévia muda enquanto você edita. A equipe só verá as alterações depois de salvar.</p>
          </aside>
        </form>
      </div>
    </main>
  )
}
