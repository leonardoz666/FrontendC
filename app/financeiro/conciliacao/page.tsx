'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, FileUp, Landmark, LoaderCircle, RefreshCw, WalletCards } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { createIdempotencyKey } from '@/app/lib/offline'
import { useToast } from '@/contexts/ToastContext'
import { readUrlViewState, replaceUrlViewState } from '@/app/lib/view-state'

type Account = { id: number; nome: string }
type Overview = { contas: Account[] }
type StatementLine = { id: number; data: string; descricao: string; valor: number; natureza: 'ENTRADA' | 'SAIDA'; status: string; movimentoId: number | null }
type Statement = { id: number; nomeArquivo: string; criadoEm: string; contaBancaria: Account; linhas: StatementLine[] }
type Movement = { id: number; efetivadoEm: string; descricao: string; valor: number; natureza: 'ENTRADA' | 'SAIDA'; conciliacao: unknown | null; contaBancaria: Account }
type PaymentForm = { id: number; nome: string; taxa: number; prazoDias: number; contaBancariaId?: number | null }
type CardBatch = { id: number; status: 'PREVISTO' | 'LIQUIDADO' | 'CANCELADO'; periodoInicio: string; periodoFim: string; previsaoLiquidacao: string; valorBruto: number; valorTaxa: number; valorLiquido: number; formaPagamento: { nome: string }; contaBancaria: { nome: string }; _count: { itens: number } }

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const day = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 7)}-01`
const inputClass = 'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100'

export default function ReconciliationPage() {
  const { showToast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [statements, setStatements] = useState<Statement[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [forms, setForms] = useState<PaymentForm[]>([])
  const [batches, setBatches] = useState<CardBatch[]>([])
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [selectedMovement, setSelectedMovement] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [period, setPeriod] = useState({ from: monthStart(), to: today(), formId: '' })
  const [urlReady, setUrlReady] = useState(false)

  useEffect(() => {
    const state = readUrlViewState({ conta: '', inicio: period.from, fim: period.to, forma: '' })
    setAccountId(state.conta)
    setPeriod(current => ({
      from: /^\d{4}-\d{2}-\d{2}$/.test(state.inicio) ? state.inicio : current.from,
      to: /^\d{4}-\d{2}-\d{2}$/.test(state.fim) ? state.fim : current.to,
      formId: state.forma,
    }))
    setUrlReady(true)
  }, [])
  useEffect(() => {
    if (urlReady) replaceUrlViewState({ conta: accountId, inicio: period.from, fim: period.to, forma: period.formId })
  }, [accountId, period.formId, period.from, period.to, urlReady])

  const loadBase = useCallback(async () => {
    setLoading(true)
    try {
      const [overview, paymentForms, cardBatches] = await Promise.all([
        apiFetch<Overview>('/financeiro/overview'),
        apiFetch<PaymentForm[] | { data: PaymentForm[] }>('/formas-pagamento?ativo=true&pageSize=100'),
        apiFetch<CardBatch[]>('/financeiro/recebiveis-cartao'),
      ])
      const list = Array.isArray(paymentForms) ? paymentForms : paymentForms.data
      setAccounts(overview.contas)
      setForms(list.filter(item => item.prazoDias > 0 && item.contaBancariaId))
      setBatches(cardBatches)
      setAccountId(current => current || String(overview.contas[0]?.id ?? ''))
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao carregar a conciliação.', 'error') }
    finally { setLoading(false) }
  }, [showToast])

  const loadDesk = useCallback(async () => {
    if (!accountId) return
    try {
      const [imports, ledger] = await Promise.all([
        apiFetch<Statement[]>(`/financeiro/extratos?contaBancariaId=${accountId}`),
        apiFetch<Movement[]>(`/financeiro/movimentos?contaBancariaId=${accountId}&from=2020-01-01&to=${today()}`),
      ])
      setStatements(imports); setMovements(ledger)
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao carregar o extrato.', 'error') }
  }, [accountId, showToast])

  useEffect(() => { void loadBase() }, [loadBase])
  useEffect(() => { void loadDesk() }, [loadDesk])

  const pendingLines = useMemo(() => statements.flatMap(statement => statement.linhas.map(line => ({ ...line, arquivo: statement.nomeArquivo }))).filter(line => line.status === 'PENDENTE'), [statements])
  const pendingMovements = useMemo(() => movements.filter(item => !item.conciliacao), [movements])
  const selected = pendingLines.find(item => item.id === selectedLine)
  const candidates = useMemo(() => pendingMovements.filter(item => !selected || (item.natureza === selected.natureza && Math.round(Number(item.valor) * 100) === Math.round(Number(selected.valor) * 100))), [pendingMovements, selected])

  const upload = async (file: File | undefined) => {
    if (!file || !accountId) return
    setWorking(true)
    try {
      const body = new FormData(); body.set('arquivo', file); body.set('contaBancariaId', accountId)
      await apiFetch('/financeiro/extratos/importar', { method: 'POST', body })
      showToast('Extrato importado e pronto para conferência.', 'success'); await loadDesk()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível importar o extrato.', 'error') }
    finally { setWorking(false) }
  }

  const reconcile = async () => {
    if (!selectedLine || !selectedMovement) return
    setWorking(true)
    try {
      await apiFetch(`/financeiro/extratos/linhas/${selectedLine}/conciliar`, { method: 'POST', body: { movimentoId: selectedMovement } })
      setSelectedLine(null); setSelectedMovement(null); showToast('Correspondência conciliada.', 'success'); await loadDesk()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível conciliar.', 'error') }
    finally { setWorking(false) }
  }

  const createBatch = async () => {
    if (!period.formId) return showToast('Selecione a forma de cartão.', 'error')
    setWorking(true)
    try {
      await apiFetch('/financeiro/recebiveis-cartao/lotes', { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() }, body: { formaPagamentoId: Number(period.formId), periodoInicio: `${period.from}T00:00:00`, periodoFim: `${period.to}T23:59:59` } })
      showToast('Lote de recebíveis criado.', 'success'); await loadBase()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível criar o lote.', 'error') }
    finally { setWorking(false) }
  }

  const settleBatch = async (batchId: number) => {
    setWorking(true)
    try { await apiFetch(`/financeiro/recebiveis-cartao/${batchId}/liquidar`, { method: 'POST', body: { liquidadoEm: new Date().toISOString() } }); showToast('Crédito do cartão lançado no razão.', 'success'); await Promise.all([loadBase(), loadDesk()]) }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível liquidar o lote.', 'error') }
    finally { setWorking(false) }
  }

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6"><div className="mx-auto max-w-[1600px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-600"><Landmark size={14} /> Mesa financeira</div><h1 className="text-3xl font-black tracking-tight text-slate-950">Conciliação e cartões</h1><p className="mt-1 text-sm text-slate-500">Compare o extrato bancário com o razão e controle liquidações das adquirentes.</p></div><div className="flex gap-2"><select className={inputClass} value={accountId} onChange={event => { setAccountId(event.target.value); setSelectedLine(null); setSelectedMovement(null) }}><option value="">Selecione a conta</option>{accounts.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select><button onClick={() => void loadDesk()} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700" aria-label="Atualizar"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div></header>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white"><div><h2 className="font-black">Correspondência bancária</h2><p className="text-xs text-slate-400">Selecione uma linha à esquerda; candidatos do mesmo valor aparecem à direita.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950"><FileUp size={16} /> Importar CSV<input type="file" accept=".csv,text/csv" className="hidden" disabled={working || !accountId} onChange={event => void upload(event.target.files?.[0])} /></label></div>
      <div className="grid min-h-[430px] lg:grid-cols-[1fr_64px_1fr]"><DeskColumn title="Extrato bancário" count={pendingLines.length}>{pendingLines.length ? pendingLines.map(line => <button key={line.id} onClick={() => { setSelectedLine(line.id); setSelectedMovement(null) }} className={`grid w-full grid-cols-[84px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left ${selectedLine === line.id ? 'bg-orange-50 ring-2 ring-inset ring-orange-400' : 'hover:bg-slate-50'}`}><span className="text-xs font-bold text-slate-500">{day(line.data)}</span><span><strong className="line-clamp-1 block text-sm text-slate-900">{line.descricao}</strong><small className="text-slate-400">{line.arquivo}</small></span><strong className={line.natureza === 'ENTRADA' ? 'text-emerald-700' : 'text-rose-700'}>{line.natureza === 'ENTRADA' ? '+' : '−'} {money(line.valor)}</strong></button>) : <Empty text="Importe um CSV para iniciar." />}</DeskColumn>
        <div className="hidden place-items-center border-x border-slate-200 bg-slate-50 lg:grid"><ArrowRight className="text-slate-300" /></div>
        <DeskColumn title="Movimentos do razão" count={candidates.length}>{candidates.length ? candidates.map(item => <button key={item.id} onClick={() => setSelectedMovement(item.id)} className={`grid w-full grid-cols-[84px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left ${selectedMovement === item.id ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-400' : 'hover:bg-slate-50'}`}><span className="text-xs font-bold text-slate-500">{day(item.efetivadoEm)}</span><span><strong className="line-clamp-1 block text-sm text-slate-900">{item.descricao}</strong><small className="text-slate-400">movimento #{item.id}</small></span><strong className={item.natureza === 'ENTRADA' ? 'text-emerald-700' : 'text-rose-700'}>{item.natureza === 'ENTRADA' ? '+' : '−'} {money(item.valor)}</strong></button>) : <Empty text={selected ? 'Nenhum movimento com o mesmo valor e natureza.' : 'Selecione uma linha do extrato.'} />}</DeskColumn></div>
      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3"><span className="text-xs font-bold text-slate-500">{pendingLines.length} linhas e {pendingMovements.length} movimentos aguardando conciliação</span><button disabled={!selectedLine || !selectedMovement || working} onClick={() => void reconcile()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-40">{working ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Confirmar correspondência</button></footer>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid gap-4 border-b border-slate-200 p-5 lg:grid-cols-[1fr_auto_auto_auto_auto]"><div><div className="flex items-center gap-2"><WalletCards size={18} className="text-orange-600" /><h2 className="font-black text-slate-950">Recebíveis de cartão</h2></div><p className="mt-1 text-xs text-slate-500">Agrupe vendas pela adquirente e liquide o valor líquido na conta configurada.</p></div><select className={inputClass} value={period.formId} onChange={event => setPeriod({ ...period, formId: event.target.value })}><option value="">Forma de cartão</option>{forms.map(item => <option key={item.id} value={item.id}>{item.nome} · {item.taxa}% · D+{item.prazoDias}</option>)}</select><input type="date" className={inputClass} value={period.from} onChange={event => setPeriod({ ...period, from: event.target.value })} /><input type="date" className={inputClass} value={period.to} onChange={event => setPeriod({ ...period, to: event.target.value })} /><button onClick={() => void createBatch()} disabled={working} className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">Gerar lote</button></div>
      <div className="divide-y divide-slate-100 md:hidden">{batches.map(batch => <article key={batch.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><strong className="block text-slate-950">{batch.formaPagamento.nome}</strong><span className="text-xs text-slate-500">{batch.contaBancaria.nome} · {batch._count.itens} vendas</span></div><strong className="text-emerald-700">{money(batch.valorLiquido)}</strong></div><dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Período</dt><dd className="font-bold text-slate-800">{day(batch.periodoInicio)} — {day(batch.periodoFim)}</dd></div><div><dt className="text-slate-500">Previsão</dt><dd className="font-bold text-slate-800">{day(batch.previsaoLiquidacao)}</dd></div><div><dt className="text-slate-500">Valor bruto</dt><dd className="font-bold text-slate-800">{money(batch.valorBruto)}</dd></div><div><dt className="text-slate-500">Taxas</dt><dd className="font-bold text-rose-700">− {money(batch.valorTaxa)}</dd></div></dl>{batch.status === 'PREVISTO' ? <button onClick={() => void settleBatch(batch.id)} disabled={working} className="h-10 w-full rounded-lg bg-orange-600 text-sm font-black text-white disabled:opacity-50">Liquidar recebível</button> : <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">Liquidado</span>}</article>)}{!batches.length && <Empty text="Nenhum lote de recebíveis gerado." />}</div>
      <div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-4 py-3">Adquirente / conta</th><th className="px-4 py-3">Período</th><th className="px-4 py-3">Previsão</th><th className="px-4 py-3 text-right">Bruto</th><th className="px-4 py-3 text-right">Taxas</th><th className="px-4 py-3 text-right">Líquido</th><th className="px-4 py-3 text-right">Situação</th></tr></thead><tbody className="divide-y divide-slate-100">{batches.map(batch => <tr key={batch.id}><td className="px-4 py-3"><strong className="block text-slate-900">{batch.formaPagamento.nome}</strong><small className="text-slate-500">{batch.contaBancaria.nome} · {batch._count.itens} vendas</small></td><td className="px-4 py-3 text-slate-600">{day(batch.periodoInicio)} — {day(batch.periodoFim)}</td><td className="px-4 py-3 text-slate-600">{day(batch.previsaoLiquidacao)}</td><td className="px-4 py-3 text-right font-bold">{money(batch.valorBruto)}</td><td className="px-4 py-3 text-right text-rose-700">− {money(batch.valorTaxa)}</td><td className="px-4 py-3 text-right font-black text-emerald-700">{money(batch.valorLiquido)}</td><td className="px-4 py-3 text-right">{batch.status === 'PREVISTO' ? <button onClick={() => void settleBatch(batch.id)} disabled={working} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-black text-white">Liquidar</button> : <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">liquidado</span>}</td></tr>)}</tbody></table>{!batches.length && <Empty text="Nenhum lote de recebíveis gerado." />}</div>
    </section>
  </div></main>
}

function DeskColumn({ title, count, children }: { title: string; count: number; children: React.ReactNode }) { return <section className="min-w-0"><header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-black text-slate-900">{title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">{count}</span></header><div className="max-h-[390px] overflow-y-auto">{children}</div></section> }
function Empty({ text }: { text: string }) { return <div className="grid min-h-32 place-items-center px-6 text-center text-sm text-slate-400">{text}</div> }
