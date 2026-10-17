'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ServerCog,
  ShieldAlert,
} from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'

type HealthState = 'SAUDAVEL' | 'ATENCAO' | 'CRITICO'
type ServiceHealth = {
  id: string
  nome: string
  descricao: string
  pendentes: number
  processando: number
  falhas: number
  estado: HealthState
  esperaSegundos: number | null
  limiteMinutos: number
  acao: string
  href: string
}
type HealthResponse = {
  geradoEm: string
  estado: HealthState
  resumo: {
    criticos: number
    atencao: number
    pendentes: number
    falhas: number
  }
  servicos: ServiceHealth[]
}

const stateOrder: Record<HealthState, number> = {
  CRITICO: 0,
  ATENCAO: 1,
  SAUDAVEL: 2,
}
const stateLabel: Record<HealthState, string> = {
  CRITICO: 'Ação necessária',
  ATENCAO: 'Acompanhar',
  SAUDAVEL: 'Operação normal',
}

function elapsed(seconds: number | null) {
  if (seconds === null) return 'sem espera'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
}

export default function OperationalHealthPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        setData(await apiFetch<HealthResponse>('/operacao/saude'))
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : 'Não foi possível consultar a operação.',
          'error',
        )
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [showToast],
  )

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 30_000)
    return () => window.clearInterval(timer)
  }, [load])

  const services = useMemo(
    () =>
      [...(data?.servicos ?? [])].sort(
        (left, right) => stateOrder[left.estado] - stateOrder[right.estado],
      ),
    [data],
  )

  const healthy = data?.estado === 'SAUDAVEL'
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Pulso da operação
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Filas que sustentam pedidos, impressão, fiscal e integrações,
              verificadas a cada 30 segundos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{' '}
            Atualizar agora
          </button>
        </header>

        <section
          className={`overflow-hidden rounded-2xl border ${healthy ? 'border-emerald-800 bg-emerald-950' : 'border-slate-800 bg-slate-950'} text-white shadow-sm`}
        >
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="flex items-start gap-4">
              <span
                className={`mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full ${healthy ? 'bg-emerald-400 text-emerald-950' : data?.estado === 'CRITICO' ? 'bg-rose-400 text-rose-950' : 'bg-amber-300 text-amber-950'}`}
              >
                {healthy ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <ShieldAlert size={24} />
                )}
              </span>
              <div>
                <h2 className="text-2xl font-black">
                  {loading && !data
                    ? 'Lendo os sinais…'
                    : stateLabel[data?.estado ?? 'SAUDAVEL']}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-300">
                  {healthy
                    ? 'Nenhuma fila ultrapassou o tempo de resposta esperado.'
                    : 'Os itens mais urgentes aparecem primeiro. Abra o fluxo indicado para corrigir a causa.'}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-right sm:grid-cols-4 md:grid-cols-2">
              <Summary label="Críticos" value={data?.resumo.criticos ?? 0} />
              <Summary label="Acompanhar" value={data?.resumo.atencao ?? 0} />
              <Summary
                label="Em andamento"
                value={data?.resumo.pendentes ?? 0}
              />
              <Summary label="Falhas" value={data?.resumo.falhas ?? 0} />
            </dl>
          </div>
          <div className="border-t border-white/10 px-6 py-3 text-xs text-slate-400">
            Última leitura:{' '}
            {data
              ? new Date(data.geradoEm).toLocaleString('pt-BR')
              : 'aguardando resposta'}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-black text-slate-950">Fluxos monitorados</h2>
            <p className="mt-1 text-xs text-slate-500">
              Falhas das últimas 24 horas são críticas. Esperas recebem atenção
              ao superar o limite de cada fluxo.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {services.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
            {!services.length && !loading && (
              <div className="grid min-h-40 place-items-center px-6 text-center text-sm text-slate-500">
                Nenhum fluxo retornado pelo estabelecimento.
              </div>
            )}
            {loading && !data && (
              <div className="grid min-h-40 place-items-center text-sm font-bold text-slate-500">
                <RefreshCw className="mr-2 inline animate-spin" size={17} />{' '}
                Consultando filas
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-xl font-black tabular-nums">{value}</dd>
    </div>
  )
}

function ServiceRow({ service }: { service: ServiceHealth }) {
  const tone =
    service.estado === 'CRITICO'
      ? {
          bar: 'bg-rose-500',
          badge: 'bg-rose-100 text-rose-800',
          icon: <AlertTriangle size={18} />,
        }
      : service.estado === 'ATENCAO'
        ? {
            bar: 'bg-amber-400',
            badge: 'bg-amber-100 text-amber-900',
            icon: <Clock3 size={18} />,
          }
        : {
            bar: 'bg-emerald-500',
            badge: 'bg-emerald-100 text-emerald-800',
            icon: <CheckCircle2 size={18} />,
          }

  return (
    <article className="grid grid-cols-[4px_1fr]">
      <div className={tone.bar} />
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(230px,1fr)_minmax(360px,1.5fr)_auto] lg:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-slate-500">
            <ServerCog size={20} />
          </span>
          <div>
            <h3 className="font-black text-slate-950">{service.nome}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {service.descricao}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Measure label="Pendentes" value={service.pendentes} />
          <Measure label="Processando" value={service.processando} />
          <Measure
            label="Falhas"
            value={service.falhas}
            danger={service.falhas > 0}
          />
          <Measure
            label="Maior espera"
            value={elapsed(service.esperaSegundos)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${tone.badge}`}
          >
            {tone.icon}
            {stateLabel[service.estado]}
          </span>
          <Link
            href={service.href}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {service.acao}
          </Link>
        </div>
      </div>
    </article>
  )
}

function Measure({
  label,
  value,
  danger = false,
}: {
  label: string
  value: number | string
  danger?: boolean
}) {
  return (
    <div>
      <span className="block text-xs text-slate-500">{label}</span>
      <strong
        className={`mt-1 block text-base tabular-nums ${danger ? 'text-rose-700' : 'text-slate-900'}`}
      >
        {value}
      </strong>
    </div>
  )
}
