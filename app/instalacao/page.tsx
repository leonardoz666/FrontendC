'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useTenantRouter } from '@/app/lib/tenant-router'
import { ActionableError } from '@/app/components/ui/ActionableError'
import { ArrowRight, Check, Eye, EyeOff, Link2, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react'
import { PageLoader } from '@/app/components/ui/PageLoader'
import {
  requestedTenantRequiresActivation,
  requestedTenantSlug,
  selectTenantForTab,
} from '@/app/lib/tenant-navigation'

type InstallationStatus = { active: boolean; establishmentUrl?: string; tenantSlug?: string; establishmentName?: string }

export default function InstallationPage() {
  const router = useTenantRouter()
  const [establishmentUrl, setEstablishmentUrl] = useState('')
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<InstallationStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [successName, setSuccessName] = useState('')

  const loadStatus = useCallback(async () => {
    setStatusLoading(true)
    setStatusError('')
    try {
      const searchParams = new URLSearchParams(window.location.search)
      const requestedSlug = requestedTenantSlug(searchParams)
      const statusUrl = requestedSlug
        ? `/api/installation/status?estabelecimento=${encodeURIComponent(requestedSlug)}`
        : '/api/installation/status'
      const response = await fetch(statusUrl, { cache: 'no-store' })
      if (response.status === 404) {
        setStatus({ active: false })
        if (requestedSlug) {
          const requestedLink = searchParams.get('link')
          setEstablishmentUrl(requestedLink || `${window.location.origin}/e/${requestedSlug}`)
        }
        return
      }
      if (!response.ok) throw new Error()
      const current = await response.json() as InstallationStatus
      const requestedLink = searchParams.get('link')
      if (current.active && requestedTenantRequiresActivation(current.tenantSlug, requestedSlug)) {
        setStatus({ active: false })
        setEstablishmentUrl(requestedLink || `${window.location.origin}/e/${requestedSlug}`)
        return
      }
      if (current.active) {
        setRedirecting(true)
        if (current.tenantSlug) selectTenantForTab(current.tenantSlug)
        const destination = current.tenantSlug
          ? `/login?estabelecimento=${encodeURIComponent(current.tenantSlug)}`
          : '/login'
        router.replace(destination)
        return
      }
      setStatus(current)
      if (current.establishmentUrl) setEstablishmentUrl(current.establishmentUrl)
    } catch {
      setStatusError('Não foi possível verificar a configuração atual. Você ainda pode informar os dados abaixo ou tentar novamente.')
    } finally {
      setStatusLoading(false)
    }
  }, [router])

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
    const link = new URLSearchParams(window.location.search).get('link')
    if (link) setEstablishmentUrl(link)
    void loadStatus()
  }, [loadStatus])

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/installation/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ establishmentUrl, code }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string; estabelecimento?: { slug?: string; nome?: string } }
      if (!response.ok) throw new Error(result.error || 'Não foi possível ativar o aplicativo')
      if (result.estabelecimento?.slug) selectTenantForTab(result.estabelecimento.slug)
      setSuccessName(result.estabelecimento?.nome || 'estabelecimento')
      window.setTimeout(() => { router.replace('/login'); router.refresh() }, 900)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível ativar o aplicativo')
    } finally {
      setLoading(false)
    }
  }

  async function resetInstallation() {
    setResetting(true)
    setError('')
    try {
      const requestedSlug = requestedTenantSlug(new URLSearchParams(window.location.search)) || status?.tenantSlug
      const resetUrl = requestedSlug
        ? `/api/installation/reset?estabelecimento=${encodeURIComponent(requestedSlug)}`
        : '/api/installation/reset'
      const response = await fetch(resetUrl, { method: 'POST' })
      if (!response.ok) throw new Error()
      setStatus({ active: false })
      setEstablishmentUrl('')
      setCode('')
      setConfirmingReset(false)
    } catch {
      setError('Não foi possível remover a configuração atual')
    } finally {
      setResetting(false)
    }
  }

  if (successName) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f4f1ea] px-6 text-slate-950">
        <div className="max-w-md text-center" role="status" aria-live="polite">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_16px_35px_rgba(5,150,105,.24)]"><Check size={31} strokeWidth={2.5} aria-hidden="true" /></span>
          <h1 className="mt-6 text-balance text-3xl font-extrabold tracking-[-0.025em]">Aplicativo conectado</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">A instalação foi vinculada a <strong className="text-slate-900">{successName}</strong>. Abrindo o acesso da equipe…</p>
        </div>
      </main>
    )
  }

  if (redirecting || (statusLoading && status === null && !statusError)) {
    return (
      <main className="min-h-dvh bg-[#f4f1ea] text-slate-950">
        <PageLoader
          message={redirecting ? 'Abrindo o estabelecimento' : 'Verificando este computador'}
          detail={redirecting ? 'Seu aplicativo já está conectado' : 'Confirmando a ativação salva'}
        />
      </main>
    )
  }

  return (
    <main className="controlae-installation min-h-dvh bg-[#f4f1ea] text-slate-950 selection:bg-orange-200 selection:text-slate-950 lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(560px,1.1fr)]">
      <section className="relative isolate flex min-h-[250px] flex-col justify-between overflow-hidden bg-[#172033] px-6 py-6 text-white sm:px-11 sm:py-8 lg:min-h-dvh lg:px-[clamp(2.75rem,5vw,6rem)] lg:py-14">
        <div aria-hidden="true" className="absolute -right-24 top-[22%] -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-10 top-[31%] -z-10 h-36 w-36 rounded-full border border-orange-400/45" />
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-600 text-xl font-black shadow-[0_8px_22px_rgba(234,88,12,.3)]" aria-hidden="true">C</span><span className="text-xl font-extrabold tracking-[-0.02em]">ControlaÊ</span></div>
        <div className="mb-1 mt-7 max-w-xl sm:my-9 lg:my-20">
          <h1 className="text-balance text-[2rem] font-black leading-[1.02] tracking-[-0.035em] sm:text-[2.5rem] lg:text-[clamp(2.4rem,5vw,5.4rem)]">Conecte este computador ao seu restaurante.</h1>
          <p className="mt-4 max-w-[52ch] text-sm leading-6 text-slate-300 sm:text-base sm:leading-7 lg:mt-6">A ativação confirma o estabelecimento e protege esta instalação antes que qualquer dado operacional seja carregado.</p>
        </div>
        <div className="hidden max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-5 text-sm lg:grid">
          <Link2 className="mt-0.5 text-orange-400" size={19} aria-hidden="true" /><p><strong className="block text-white">Link do restaurante</strong><span className="mt-1 block leading-6 text-slate-400">O endereço identifica com clareza qual estabelecimento será conectado.</span></p>
          <ShieldCheck className="mt-0.5 text-orange-400" size={19} aria-hidden="true" /><p><strong className="block text-white">Vínculo protegido</strong><span className="mt-1 block leading-6 text-slate-400">O código temporário não fica salvo depois da ativação.</span></p>
        </div>
      </section>

      <section className="controlae-installation__form flex min-h-[calc(100dvh-250px)] items-center justify-center px-5 py-8 sm:px-10 lg:min-h-dvh lg:px-[clamp(3rem,8vw,9rem)] lg:py-10">
        <div className="w-full max-w-xl">
          {statusLoading && <div role="status" className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-700"><LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> Verificando configuração atual…</div>}
          {statusError && <div role="alert" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">{statusError} <button type="button" onClick={() => void loadStatus()} className="ml-1 underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">Tentar novamente</button></div>}
          {status?.active ? (
            <div className="rounded-2xl bg-white p-7 shadow-[0_18px_55px_rgba(23,32,51,.1)] sm:p-9">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Check size={24} aria-hidden="true" /></span>
              <h2 className="mt-6 text-2xl font-extrabold tracking-[-0.02em]">Este aplicativo já está ativado</h2>
              <p className="mt-2 leading-7 text-slate-600">Vinculado a <strong className="text-slate-900">{status.establishmentName}</strong> pelo link <span className="break-all font-semibold text-slate-800">{status.establishmentUrl}</span>.</p>
              {error && <ActionableError error={error} fallback="Não foi possível remover a configuração atual." onRetry={() => void resetInstallation()} className="mt-6" />}
              {confirmingReset && <div role="alert" className="mt-6 rounded-xl bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950"><strong className="block">Remover o vínculo deste computador?</strong><span className="mt-1 block">Será necessário informar um novo link e um novo código para acessar o sistema.</span></div>}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => router.replace('/login')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">Continuar para o acesso <ArrowRight size={18} aria-hidden="true" /></button>
                {confirmingReset ? <><button type="button" disabled={resetting} onClick={() => void resetInstallation()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 text-sm font-bold text-white transition-colors hover:bg-red-800 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">{resetting && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}{resetting ? 'Removendo…' : 'Sim, remover vínculo'}</button><button type="button" disabled={resetting} onClick={() => setConfirmingReset(false)} className="min-h-12 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button></> : <button type="button" onClick={() => setConfirmingReset(true)} className="min-h-12 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">Configurar novamente</button>}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold tracking-[-0.025em] sm:text-4xl">Ativar aplicativo</h2>
              <p className="mt-3 max-w-[58ch] text-[15px] leading-7 text-slate-600">Use o link e o código fornecidos no Painel ControlaÊ. A validação leva apenas alguns segundos.</p>
              <form onSubmit={activate} className="mt-8 space-y-6" noValidate>
                <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><Link2 size={17} className="text-orange-600" aria-hidden="true" /> Link do estabelecimento</span><input type="url" value={establishmentUrl} onChange={event => setEstablishmentUrl(event.target.value)} placeholder="https://sistema.controlae.com/e/restaurante-exemplo" autoComplete="url" spellCheck={false} required className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-950 placeholder:text-slate-600 shadow-[0_2px_8px_rgba(23,32,51,.04)] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" /><span className="mt-2 block text-[13px] leading-5 text-slate-700">Cole o link completo gerado no Painel ControlaÊ.</span></label>
                <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><LockKeyhole size={17} className="text-orange-600" aria-hidden="true" /> Código de ativação</span><span className="relative block"><input type={showCode ? 'text' : 'password'} value={code} onChange={event => setCode(event.target.value)} placeholder="Cole o código gerado no painel" autoComplete="off" spellCheck={false} required className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 pr-14 text-[15px] text-slate-950 placeholder:text-slate-600 shadow-[0_2px_8px_rgba(23,32,51,.04)] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" /><button type="button" onClick={() => setShowCode(value => !value)} aria-label={showCode ? 'Ocultar código' : 'Mostrar código'} className="absolute inset-y-0 right-1 grid w-12 place-items-center rounded-lg text-slate-700 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{showCode ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></span><span className="mt-2 block text-[13px] leading-5 text-slate-700">O código expira em 15 minutos e será descartado depois do uso.</span></label>
                {error && <ActionableError error={error} fallback="Não foi possível ativar o aplicativo." />}
                <button type="submit" disabled={loading || !establishmentUrl.trim() || !code.trim()} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(234,88,12,.22)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-[0_16px_34px_rgba(234,88,12,.26)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-orange-100 disabled:text-orange-800 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">{loading ? <><LoaderCircle className="animate-spin" size={19} aria-hidden="true" /> Validando vínculo…</> : <>Validar e ativar <ArrowRight size={19} aria-hidden="true" /></>}</button>
              </form>
              <p className="mt-6 text-center text-[13px] leading-5 text-slate-700">Não recebeu os dados? Solicite um novo código ao responsável pelo Painel ControlaÊ.</p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
