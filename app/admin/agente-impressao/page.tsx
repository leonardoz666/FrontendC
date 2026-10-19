'use client'

import { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  HardDrive,
  MonitorCheck,
  Printer,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import Link from '@/app/components/TenantLink'
import { PageLoader } from '@/app/components/ui/PageLoader'
import { tenantForCurrentTab } from '@/app/lib/tenant-navigation'
import { useToast } from '@/contexts/ToastContext'

const DOWNLOAD_URL = (process.env.NEXT_PUBLIC_PRINTER_AGENT_DOWNLOAD_URL || '').trim()
const AGENT_VERSION = (process.env.NEXT_PUBLIC_PRINTER_AGENT_VERSION || '2.0.0').trim()

type InstallationStatus = {
  active: boolean
  apiUrl: string
  tenantSlug: string
  establishmentName: string
}

type CopyTarget = 'api' | 'tenant'

export default function PrinterAgentDownloadPage() {
  const { showToast } = useToast()
  const [installation, setInstallation] = useState<InstallationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<CopyTarget | null>(null)

  useEffect(() => {
    let cancelled = false
    const tenantSlug = tenantForCurrentTab()
    if (!tenantSlug) {
      setLoading(false)
      return
    }

    fetch(`/api/installation/status?estabelecimento=${encodeURIComponent(tenantSlug)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async response => {
        if (!response.ok) throw new Error('Não foi possível carregar os dados desta instalação.')
        return response.json() as Promise<InstallationStatus>
      })
      .then(result => {
        if (!cancelled) setInstallation(result)
      })
      .catch(error => {
        if (!cancelled) showToast(error instanceof Error ? error.message : 'Erro ao carregar instalação', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showToast])

  const copyValue = async (value: string, target: CopyTarget, label: string) => {
    const success = await navigator.clipboard.writeText(value).then(() => true).catch(() => false)
    if (!success) {
      showToast(`Não foi possível copiar ${label}. Selecione o texto manualmente.`, 'warning')
      return
    }
    setCopied(target)
    showToast(`${label} copiado.`, 'success')
    window.setTimeout(() => setCopied(current => current === target ? null : current), 1800)
  }

  if (loading) {
    return <PageLoader message="Carregando agente de impressão" detail="Preparando os dados deste estabelecimento" />
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <header className="mb-7">
        <h1 className="text-3xl font-bold tracking-[-0.025em] text-slate-950">Agente de impressão</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Instale o ControlaÊ Agent no computador Windows conectado às impressoras e mantenha os pedidos chegando mesmo quando o sistema estiver aberto em outro dispositivo.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="agent-download-title">
        <div className="flex flex-col gap-5 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Printer size={24} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="agent-download-title" className="text-xl font-bold text-slate-950">ControlaÊ Agent para Windows</h2>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">v{AGENT_VERSION}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">Instalador para Windows x64 · impressoras USB e TCP/IP</p>
            </div>
          </div>

          {DOWNLOAD_URL ? (
            <a
              href={DOWNLOAD_URL}
              download
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 font-bold text-white shadow-sm transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <Download size={20} aria-hidden="true" />
              Baixar instalador
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="O instalador ainda não foi publicado"
              className="inline-flex h-12 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-200 px-5 font-bold text-slate-500"
            >
              <Download size={20} aria-hidden="true" />
              Download indisponível
            </button>
          )}
        </div>

        {!DOWNLOAD_URL && (
          <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 sm:px-6" role="status">
            <TriangleAlert size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>O instalador ainda não foi publicado pelo administrador da plataforma. A tela de configuração permanece disponível abaixo.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <div className="p-5 sm:p-6 lg:border-r lg:border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Dados desta instalação</h2>
                <p className="mt-1 text-sm text-slate-600">Preencha estes valores na aba Configurações do Agent.</p>
              </div>
              <HardDrive size={23} className="shrink-0 text-orange-600" aria-hidden="true" />
            </div>

            <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
              <ConfigurationRow
                label="URL da API"
                value={installation?.apiUrl ?? ''}
                fallback="URL não disponível"
                copied={copied === 'api'}
                onCopy={() => void copyValue(installation?.apiUrl ?? '', 'api', 'URL da API')}
              />
              <ConfigurationRow
                label="Estabelecimento"
                value={installation?.tenantSlug ?? tenantForCurrentTab() ?? ''}
                fallback="Estabelecimento não identificado"
                copied={copied === 'tenant'}
                onCopy={() => void copyValue(installation?.tenantSlug ?? tenantForCurrentTab() ?? '', 'tenant', 'Identificador do estabelecimento')}
              />
              <div className="flex min-h-16 items-center gap-3 px-4 py-3">
                <ShieldCheck size={19} className="shrink-0 text-slate-400" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Token de segurança</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Solicite ao administrador da plataforma</p>
                  <p className="mt-0.5 text-xs text-slate-500">O token é secreto e aparece somente quando é gerado.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">Agent já instalado?</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">Configure a conexão local e reconheça as impressoras do Windows.</p>
              </div>
              <Link
                href="/admin/impressoras"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <MonitorCheck size={18} aria-hidden="true" /> Configurar impressoras
              </Link>
            </div>
          </div>

          <ol className="m-0 list-none bg-slate-50 p-5 sm:p-6" aria-label="Etapas de instalação">
            <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-6 after:absolute after:bottom-0 after:left-[15px] after:top-8 after:w-px after:bg-slate-300">
              <StepNumber>1</StepNumber>
              <div><h3 className="font-bold text-slate-900">Instale no computador certo</h3><p className="mt-1 text-sm leading-5 text-slate-600">Use o Windows que está na mesma rede ou conectado por USB às impressoras.</p></div>
            </li>
            <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-6 after:absolute after:bottom-0 after:left-[15px] after:top-8 after:w-px after:bg-slate-300">
              <StepNumber>2</StepNumber>
              <div><h3 className="font-bold text-slate-900">Informe os três dados</h3><p className="mt-1 text-sm leading-5 text-slate-600">Cole a URL da API, o estabelecimento e o token na aba Configurações.</p></div>
            </li>
            <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <StepNumber>3</StepNumber>
              <div><h3 className="font-bold text-slate-900">Teste antes de operar</h3><p className="mt-1 text-sm leading-5 text-slate-600">Inicie o Agent, reconheça as filas e envie uma impressão de teste.</p></div>
            </li>
          </ol>
        </div>
      </section>
    </div>
  )
}

function ConfigurationRow({
  label,
  value,
  fallback,
  copied,
  onCopy,
}: {
  label: string
  value: string
  fallback: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <code className={`mt-1 block truncate text-sm font-semibold ${value ? 'text-slate-900' : 'font-sans text-slate-500'}`} title={value || fallback}>
          {value || fallback}
        </code>
      </div>
      <button
        type="button"
        onClick={onCopy}
        disabled={!value}
        aria-label={`Copiar ${label}`}
        title={`Copiar ${label}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
      </button>
    </div>
  )
}

function StepNumber({ children }: { children: string }) {
  return <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{children}</span>
}
