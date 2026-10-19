'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from '@/app/components/TenantLink'
import { apiFetch } from '@/app/lib/api'
import { PageLoader } from '@/app/components/ui/PageLoader'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Eraser,
  Filter,
  History,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

type AuditUser = { id: number; nome: string; ativo?: boolean }

type AuditEvent = {
  id: string
  action: string
  entity: string
  entityId: number
  occurredAt: string
  user: AuditUser | null
  ip: string | null
  detail: unknown
  source: 'AUDITORIA' | 'PEDIDO' | 'CANCELAMENTO_LEGADO'
}

type AuditResponse = {
  data: AuditEvent[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
  summary: { total: number; transfers: number; byAction: Record<string, number> }
  filters: { actions: string[]; entities: string[]; users: AuditUser[] }
}

type AuditFilters = {
  inicio: string
  fim: string
  acao: string
  entidade: string
  usuarioId: string
  busca: string
}

const INPUT_CLASS = 'mt-1.5 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition-shadow placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'

const ACTION_LABELS: Record<string, string> = {
  CRIAR: 'Criação',
  EDITAR: 'Alteração',
  EXCLUIR: 'Exclusão',
  CANCELAR: 'Cancelamento',
  AJUSTAR: 'Ajuste',
  IMPRIMIR: 'Impressão',
  EMITIR: 'Emissão',
  IMPORTAR: 'Importação',
  VISUALIZAR: 'Consulta',
  GERAR: 'Geração',
  APROVAR: 'Aprovação',
  BAIXAR: 'Baixa',
  ESTORNAR: 'Estorno',
  TRANSFERIR: 'Transferência',
  CONCILIAR: 'Conciliação',
  FECHAR: 'Fechamento',
  REABRIR: 'Reabertura',
}

const ENTITY_LABELS: Record<string, string> = {
  Pedido: 'Pedido',
  PedidoItem: 'Item do pedido',
  Comanda: 'Comanda',
  Pagamento: 'Pagamento',
  DeliveryPedido: 'Pedido delivery',
  Produto: 'Produto',
  Mesa: 'Mesa',
  Usuario: 'Usuário',
  Caixa: 'Caixa',
  NotaFiscal: 'Nota fiscal',
}

function localDateInput(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return adjusted.toISOString().slice(0, 10)
}

function initialFilters(): AuditFilters {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return { inicio: localDateInput(start), fim: localDateInput(end), acao: 'TODAS', entidade: 'TODAS', usuarioId: '', busca: '' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function numberValue(detail: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = detail[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function textValue(detail: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = detail[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll('_', ' ').toLocaleLowerCase('pt-BR')
}

function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function eventDescription(event: AuditEvent): string {
  const detail = isRecord(event.detail) ? event.detail : {}
  const type = textValue(detail, 'tipo', 'type')
  const sourceTable = numberValue(detail, 'mesaOrigem')
  const targetTable = numberValue(detail, 'mesaDestino', 'numeroMesaDestino')

  if (type === 'LANCAMENTO_PEDIDO') {
    const table = numberValue(detail, 'tableNumber')
    return `Lançou o pedido #${event.entityId}${table ? ` na mesa ${table}` : ''}`
  }
  if (type === 'TRANSFERENCIA_ITENS') {
    const items = Array.isArray(detail.itens) ? detail.itens.length : 0
    return `Transferiu ${items || 'um ou mais'} item(ns) da mesa ${sourceTable ?? '—'} para a mesa ${targetTable ?? '—'}`
  }
  if (event.entity === 'Comanda' && sourceTable && targetTable) {
    return `Transferiu a comanda da mesa ${sourceTable} para a mesa ${targetTable}`
  }
  if (event.action === 'CANCELAR' && event.entity === 'PedidoItem') {
    const product = textValue(detail, 'produto')
    return `Cancelou ${product ? `o item ${product}` : `o item #${event.entityId}`}`
  }
  if (event.action === 'CANCELAR' && ['Comanda', 'DeliveryPedido'].includes(event.entity)) {
    return `Cancelou ${event.entity === 'Comanda' ? 'o atendimento' : 'o pedido delivery'} #${event.entityId}`
  }
  if (event.action === 'CRIAR' && event.entity === 'Pagamento') {
    return `Registrou o pagamento #${event.entityId}`
  }
  if (event.action === 'IMPRIMIR') return `Enviou ${entityLabel(event.entity).toLocaleLowerCase('pt-BR')} #${event.entityId} para impressão`
  return `${actionLabel(event.action)} em ${entityLabel(event.entity).toLocaleLowerCase('pt-BR')} #${event.entityId}`
}

function actionTone(action: string): string {
  if (['CANCELAR', 'EXCLUIR', 'ESTORNAR'].includes(action)) return 'border-red-200 bg-red-50 text-red-800'
  if (['CRIAR', 'APROVAR', 'FECHAR'].includes(action)) return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (['EDITAR', 'AJUSTAR', 'TRANSFERIR', 'REABRIR'].includes(action)) return 'border-amber-200 bg-amber-50 text-amber-900'
  if (['IMPRIMIR', 'EMITIR', 'GERAR', 'IMPORTAR'].includes(action)) return 'border-blue-200 bg-blue-50 text-blue-800'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function humanizeKey(key: string): string {
  const labels: Record<string, string> = {
    motivo: 'Motivo', mesaId: 'Mesa', mesaOrigem: 'Mesa de origem', mesaDestino: 'Mesa de destino',
    numeroMesaDestino: 'Número da mesa de destino', comandaId: 'Comanda', comandaDestino: 'Comanda de destino',
    pedidoId: 'Pedido', pedidoDestino: 'Pedido de destino', produto: 'Produto', quantidade: 'Quantidade',
    total: 'Total', totalTransferido: 'Total transferido', valor: 'Valor', canal: 'Canal', channel: 'Canal',
    status: 'Status', statusAnterior: 'Status anterior', statusNovo: 'Novo status', itens: 'Itens', items: 'Itens',
  }
  return labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.every(item => ['string', 'number'].includes(typeof item))) return value.join(', ')
    return JSON.stringify(value, null, 2)
  }
  return JSON.stringify(value, null, 2)
}

export default function GeneralAuditPage() {
  const defaults = useMemo(initialFilters, [])
  const [draft, setDraft] = useState<AuditFilters>(defaults)
  const [applied, setApplied] = useState<AuditFilters>(defaults)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        inicio: applied.inicio,
        fim: applied.fim,
        acao: applied.acao,
        entidade: applied.entidade,
        page: String(page),
        pageSize: '30',
      })
      if (applied.usuarioId) params.set('usuarioId', applied.usuarioId)
      if (applied.busca) params.set('busca', applied.busca)
      setResult(await apiFetch<AuditResponse>(`/relatorios/auditoria?${params}`))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a auditoria geral.')
    } finally {
      setLoading(false)
    }
  }, [applied, page])

  useEffect(() => { void load() }, [load])

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setExpanded(null)
    setPage(1)
    setApplied({ ...draft, busca: draft.busca.trim() })
  }

  const clearFilters = () => {
    const clean = initialFilters()
    setDraft(clean)
    setApplied(clean)
    setPage(1)
    setExpanded(null)
  }

  const stats = result?.summary.byAction ?? {}

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <ArrowLeft size={16} aria-hidden="true" /> Painel
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950"><ShieldCheck className="text-orange-600" aria-hidden="true" /> Auditoria geral</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Veja quem lançou, cancelou, transferiu ou alterou informações do estabelecimento.</p>
          </div>
          <Link href="/admin/historico" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
            <History size={17} aria-hidden="true" /> Histórico de pedidos
          </Link>
        </header>

        <form onSubmit={applyFilters} className="border-b border-slate-200 py-5" aria-label="Filtros da auditoria">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr]">
            <FilterField label="Data inicial">
              <input type="date" value={draft.inicio} max={draft.fim} onChange={event => setDraft(current => ({ ...current, inicio: event.target.value }))} className={INPUT_CLASS} />
            </FilterField>
            <FilterField label="Data final">
              <input type="date" value={draft.fim} min={draft.inicio} onChange={event => setDraft(current => ({ ...current, fim: event.target.value }))} className={INPUT_CLASS} />
            </FilterField>
            <FilterField label="Ação">
              <select value={draft.acao} onChange={event => setDraft(current => ({ ...current, acao: event.target.value }))} className={INPUT_CLASS}>
                <option value="TODAS">Todas as ações</option>
                {(result?.filters.actions ?? []).map(action => <option key={action} value={action}>{actionLabel(action)}</option>)}
              </select>
            </FilterField>
            <FilterField label="Área / registro">
              <select value={draft.entidade} onChange={event => setDraft(current => ({ ...current, entidade: event.target.value }))} className={INPUT_CLASS}>
                <option value="TODAS">Todas as áreas</option>
                {(result?.filters.entities ?? []).map(entity => <option key={entity} value={entity}>{entityLabel(entity)}</option>)}
              </select>
            </FilterField>
            <FilterField label="Responsável">
              <select value={draft.usuarioId} onChange={event => setDraft(current => ({ ...current, usuarioId: event.target.value }))} className={INPUT_CLASS}>
                <option value="">Todos os usuários</option>
                {(result?.filters.users ?? []).map(user => <option key={user.id} value={user.id}>{user.nome}{user.ativo === false ? ' (inativo)' : ''}</option>)}
              </select>
            </FilterField>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar no histórico</span>
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={draft.busca} onChange={event => setDraft(current => ({ ...current, busca: event.target.value }))} placeholder="Buscar por produto, usuário, ação ou detalhes" className={`${INPUT_CLASS} mt-0 pl-10`} />
            </label>
            <button type="submit" disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-orange-300">
              <Filter size={17} aria-hidden="true" /> Aplicar filtros
            </button>
            <button type="button" onClick={clearFilters} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50">
              <Eraser size={17} aria-hidden="true" /> Limpar
            </button>
          </div>
        </form>

        {result && (
          <section aria-label="Resumo da auditoria" className="flex flex-wrap gap-x-8 gap-y-3 border-b border-slate-200 py-4">
            <Stat label="Registros" value={result.summary.total} />
            <Stat label="Criações e lançamentos" value={stats.CRIAR ?? 0} />
            <Stat label="Cancelamentos" value={stats.CANCELAR ?? 0} tone="danger" />
            <Stat label="Transferências" value={result.summary.transfers} />
          </section>
        )}

        {error && (
          <div role="alert" className="my-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            <CircleAlert size={19} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span>
          </div>
        )}

        {loading && !result && <PageLoader compact message="Carregando auditoria" detail="Organizando as ações do estabelecimento" />}

        {!loading && !error && result?.data.length === 0 && (
          <div className="py-16 text-center">
            <CalendarDays className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-800">Nenhum registro encontrado.</p>
            <p className="mt-1 text-sm text-slate-500">Amplie o período ou remova algum filtro.</p>
          </div>
        )}

        {result && result.data.length > 0 && (
          <section className={`mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white ${loading ? 'opacity-60' : ''}`} aria-label="Registros da auditoria" aria-busy={loading}>
            <div className="hidden grid-cols-[150px_130px_minmax(280px,1fr)_190px_40px] gap-4 border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 lg:grid">
              <span>Data e hora</span><span>Ação</span><span>O que aconteceu</span><span>Responsável</span><span aria-hidden="true" />
            </div>
            <div className="divide-y divide-slate-200">
              {result.data.map(event => {
                const isExpanded = expanded === event.id
                return (
                  <article key={event.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(current => current === event.id ? null : event.id)}
                      aria-expanded={isExpanded}
                      className="grid w-full gap-3 px-4 py-4 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 lg:grid-cols-[150px_130px_minmax(280px,1fr)_190px_40px] lg:items-center lg:gap-4"
                    >
                      <time dateTime={event.occurredAt} className="text-sm font-semibold tabular-nums text-slate-700">
                        {new Date(event.occurredAt).toLocaleDateString('pt-BR')} <span className="text-slate-500">{new Date(event.occurredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </time>
                      <span className={`w-fit rounded-md border px-2 py-1 text-xs font-bold ${actionTone(event.action)}`}>{actionLabel(event.action)}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-950">{eventDescription(event)}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{entityLabel(event.entity)} #{event.entityId}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700"><UserRound size={16} className="shrink-0 text-slate-400" aria-hidden="true" /><span className="truncate">{event.user?.nome ?? 'Sistema / não informado'}</span></span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500" aria-hidden="true">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                    </button>
                    {isExpanded && <AuditDetails event={event} />}
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {result && result.meta.totalPages > 1 && (
          <nav aria-label="Paginação da auditoria" className="flex items-center justify-between border-t border-slate-200 py-5">
            <p className="text-sm text-slate-600">Página {result.meta.page} de {result.meta.totalPages} · {result.meta.total} registros</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setExpanded(null); setPage(current => Math.max(1, current - 1)) }} disabled={page <= 1 || loading} aria-label="Página anterior" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-40"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => { setExpanded(null); setPage(current => Math.min(result.meta.totalPages, current + 1)) }} disabled={page >= result.meta.totalPages || loading} aria-label="Próxima página" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-40"><ChevronRight size={18} /></button>
            </div>
          </nav>
        )}
      </div>
    </main>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-slate-800">{label}{children}</label>
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'danger' }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-0.5 text-xl font-bold tabular-nums ${tone === 'danger' ? 'text-red-700' : 'text-slate-950'}`}>{value}</p></div>
}

function AuditDetails({ event }: { event: AuditEvent }) {
  const entries = isRecord(event.detail) ? Object.entries(event.detail).filter(([key]) => !['type', 'tipo'].includes(key)) : []
  const freeText = typeof event.detail === 'string' && event.detail.trim() ? event.detail.trim() : null
  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 lg:pl-[316px]">
      <div className="max-w-3xl">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
          <span><strong className="text-slate-700">Origem:</strong> {event.source === 'PEDIDO' ? 'Registro do pedido' : event.source === 'CANCELAMENTO_LEGADO' ? 'Registro legado (dados aproximados)' : 'Auditoria do sistema'}</span>
          <span><strong className="text-slate-700">IP:</strong> {event.ip ?? 'Não registrado'}</span>
          <span><strong className="text-slate-700">Código:</strong> {event.id}</span>
        </div>
        {freeText ? (
          <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-800">{freeText}</p>
        ) : entries.length > 0 ? (
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {entries.map(([key, value]) => (
              <div key={key} className={Array.isArray(value) || isRecord(value) ? 'sm:col-span-2' : ''}>
                <dt className="text-xs font-bold capitalize text-slate-500">{humanizeKey(key)}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800">{formatDetailValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="mt-3 text-sm text-slate-500">Este registro não possui detalhes adicionais.</p>}
      </div>
    </div>
  )
}
