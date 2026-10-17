'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, LoaderCircle, RefreshCw, Save, Search, WalletCards } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { createIdempotencyKey } from '@/app/lib/offline'
import { useToast } from '@/contexts/ToastContext'

type Client = { id: number; nome: string; telefone?: string | null }
type Config = { ativo: boolean; percentualCashback: number; valorFixoCashback: number; validadeDias: number | null; canais: string }
type Entry = { id: number; tipo: string; valor: number; descricao: string; expiraEm?: string | null; criadoEm: string }
type Statement = { saldo: number; lancamentos: Entry[] }

const input = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const list = <T,>(value: T[] | { data: T[] }) => Array.isArray(value) ? value : value.data

export default function LoyaltyPage() {
  const { showToast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [config, setConfig] = useState<Config>({ ativo: false, percentualCashback: 0, valorFixoCashback: 0, validadeDias: null, canais: '[]' })
  const [statement, setStatement] = useState<Statement | null>(null)
  const [adjustment, setAdjustment] = useState({ valor: '', motivo: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadStatement = useCallback(async (selected = clientId) => {
    if (!selected) { setStatement(null); return }
    try { setStatement(await apiFetch<Statement>(`/relacionamento/fidelidade/clientes/${selected}/extrato`)) }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar o extrato.', 'error') }
  }, [clientId, showToast])

  useEffect(() => { void (async () => { try { const [nextConfig, nextClients] = await Promise.all([apiFetch<Config>('/relacionamento/fidelidade/config'), apiFetch<Client[] | { data: Client[] }>('/clientes?ativo=true&pageSize=200')]); setConfig(nextConfig); setClients(list(nextClients)) } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar a fidelidade.', 'error') } finally { setLoading(false) } })() }, [showToast])

  const saveConfig = async () => { setSaving(true); try { await apiFetch('/relacionamento/fidelidade/config', { method: 'PUT', body: { ativo: config.ativo, percentualCashback: Number(config.percentualCashback), valorFixoCashback: Number(config.valorFixoCashback), validadeDias: config.validadeDias ? Number(config.validadeDias) : null, canais: JSON.parse(config.canais || '[]'), categorias: [], produtos: [] } }); showToast('Regras de cashback salvas.', 'success') } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error') } finally { setSaving(false) } }
  const adjust = async () => { if (!clientId) return; setSaving(true); try { await apiFetch(`/relacionamento/fidelidade/clientes/${clientId}/ajustes`, { method: 'POST', body: { valor: Number(adjustment.valor), motivo: adjustment.motivo, chaveIdempotencia: createIdempotencyKey() } }); setAdjustment({ valor: '', motivo: '' }); showToast('Saldo ajustado com registro de auditoria.', 'success'); await loadStatement() } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível ajustar o saldo.', 'error') } finally { setSaving(false) } }

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6"><div className="mx-auto max-w-[1400px] space-y-5">
    <header><h1 className="text-3xl font-black tracking-tight text-slate-950">Fidelidade</h1><p className="mt-1 text-sm text-slate-500">Cashback rastreável, com validade, extrato e ajustes auditados.</p></header>
    {loading ? <div className="grid h-64 place-items-center"><LoaderCircle className="animate-spin text-orange-600" /></div> : <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="bg-slate-950 p-5 text-white"><div className="flex items-center justify-between"><span className="font-black">Regra de acúmulo</span><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={config.ativo} onChange={event => setConfig({ ...config, ativo: event.target.checked })} /> Ativo</label></div><p className="mt-2 text-sm text-slate-400">Crédito automático após pagamento confirmado.</p></div><div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-1"><Field label="Percentual por pagamento"><input className={input} type="number" min="0" max="100" step="0.01" value={config.percentualCashback} onChange={event => setConfig({ ...config, percentualCashback: Number(event.target.value) })} /></Field><Field label="Ou valor fixo"><input className={input} type="number" min="0" step="0.01" value={config.valorFixoCashback} onChange={event => setConfig({ ...config, valorFixoCashback: Number(event.target.value) })} /></Field><Field label="Validade em dias"><input className={input} type="number" min="1" value={config.validadeDias ?? ''} onChange={event => setConfig({ ...config, validadeDias: event.target.value ? Number(event.target.value) : null })} /></Field><Field label="Canais"><select className={input} value={config.canais} onChange={event => setConfig({ ...config, canais: event.target.value })}><option value="[]">Todos os canais</option><option value='["SALAO"]'>Salão</option><option value='["BALCAO"]'>Balcão</option><option value='["DELIVERY"]'>Delivery</option></select></Field><button disabled={saving} onClick={() => void saveConfig()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white disabled:opacity-50"><Save size={16} /> Salvar regras</button></div></section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-5"><div className="min-w-64 flex-1"><Field label="Cliente"><select className={input} value={clientId} onChange={event => { setClientId(event.target.value); void loadStatement(event.target.value) }}><option value="">Selecione para consultar</option>{clients.map(client => <option key={client.id} value={client.id}>{client.nome}{client.telefone ? ` · ${client.telefone}` : ''}</option>)}</select></Field></div><button onClick={() => void loadStatement()} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 text-slate-600" aria-label="Atualizar extrato"><RefreshCw size={16} /></button></div>
        {!statement ? <div className="grid h-72 place-items-center text-center"><div><Search className="mx-auto text-slate-300" size={38} /><p className="mt-3 font-bold text-slate-600">Selecione um cliente para abrir o extrato.</p></div></div> : <><div className="grid gap-4 border-b border-slate-200 p-5 md:grid-cols-[1fr_2fr]"><div className="rounded-xl bg-emerald-700 p-5 text-white"><span className="text-sm font-bold text-emerald-100">Saldo disponível</span><strong className="mt-2 block text-3xl font-black tabular-nums">{money(statement.saldo)}</strong></div><div className="grid gap-3 sm:grid-cols-[130px_1fr_auto]"><Field label="Ajuste (+ ou -)"><input className={input} type="number" step="0.01" value={adjustment.valor} onChange={event => setAdjustment({ ...adjustment, valor: event.target.value })} /></Field><Field label="Motivo"><input className={input} value={adjustment.motivo} onChange={event => setAdjustment({ ...adjustment, motivo: event.target.value })} /></Field><button disabled={saving || !adjustment.valor || !adjustment.motivo} onClick={() => void adjust()} className="mt-[22px] h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40">Registrar</button></div></div><div className="divide-y divide-slate-100">{statement.lancamentos.map(entry => <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-4"><span className="flex min-w-0 items-center gap-3">{Number(entry.valor) >= 0 ? <ArrowUpRight className="text-emerald-600" /> : <ArrowDownRight className="text-rose-600" />}<span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{entry.descricao}</strong><small className="text-slate-500">{new Date(entry.criadoEm).toLocaleString('pt-BR')}{entry.expiraEm ? ` · expira ${new Date(entry.expiraEm).toLocaleDateString('pt-BR')}` : ''}</small></span></span><strong className={Number(entry.valor) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{money(Number(entry.valor))}</strong></div>)}{statement.lancamentos.length === 0 && <div className="py-16 text-center"><WalletCards className="mx-auto text-slate-300" /><p className="mt-2 text-sm text-slate-500">Ainda não há movimentações.</p></div>}</div></>}
      </section>
    </div>}
  </div></main>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label> }
