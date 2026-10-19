'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, RefreshCw, Users } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { readUrlViewState, replaceUrlViewState } from '@/app/lib/view-state'

type Row = { garcomId: number; garcom: string; comandas: number; vendas: number; servico: number; estornos: number; cortesias: number; repasse: number }
type Report = { from: string; to: string; rows: Row[]; totals: Omit<Row, 'garcomId' | 'garcom' | 'comandas'> & { vendas: number } }
const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 7)}-01`
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const inputClass = 'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100'

export default function WaiterClosingPage() {
  const { showToast } = useToast()
  const [period, setPeriod] = useState({ from: monthStart(), to: today() })
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [urlReady, setUrlReady] = useState(false)
  useEffect(() => {
    const state = readUrlViewState({ inicio: monthStart(), fim: today() })
    setPeriod(current => ({
      from: /^\d{4}-\d{2}-\d{2}$/.test(state.inicio) ? state.inicio : current.from,
      to: /^\d{4}-\d{2}-\d{2}$/.test(state.fim) ? state.fim : current.to,
    }))
    setUrlReady(true)
  }, [])
  useEffect(() => {
    if (urlReady) replaceUrlViewState({ inicio: period.from, fim: period.to })
  }, [period.from, period.to, urlReady])
  const load = useCallback(async () => {
    setLoading(true)
    try { setReport(await apiFetch<Report>(`/financeiro/fechamento-garcons?from=${period.from}&to=${period.to}`)) }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível gerar o fechamento.', 'error') }
    finally { setLoading(false) }
  }, [period.from, period.to, showToast])
  useEffect(() => { void load() }, [load])

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6"><div className="mx-auto max-w-[1400px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-600"><Users size={14} /> Equipe de salão</div><h1 className="text-3xl font-black tracking-tight text-slate-950">Fechamento de garçons</h1><p className="mt-1 text-sm text-slate-500">Vendas, taxa de serviço, estornos e cortesias por responsável.</p></div><div className="flex flex-wrap items-center gap-2"><CalendarDays size={16} className="text-slate-400" /><input type="date" className={inputClass} value={period.from} onChange={event => setPeriod({ ...period, from: event.target.value })} /><span className="text-sm font-bold text-slate-400">até</span><input type="date" className={inputClass} value={period.to} onChange={event => setPeriod({ ...period, to: event.target.value })} /><button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white" aria-label="Atualizar"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div></header>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid divide-y divide-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0"><Metric label="Vendas atribuídas" value={report?.totals.vendas ?? 0} /><Metric label="Serviço apurado" value={report?.totals.servico ?? 0} tone="in" /><Metric label="Estornos" value={report?.totals.estornos ?? 0} tone="out" /><Metric label="Repasse líquido" value={report?.totals.repasse ?? 0} dark /></div></section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black text-slate-950">Mapa de repasses</h2><p className="mt-1 text-xs text-slate-500">O serviço e os estornos são rateados proporcionalmente às vendas de cada garçom na comanda.</p></div><div className="divide-y divide-slate-100 md:hidden">{report?.rows.map((row, index) => <article key={row.garcomId} className="space-y-3 p-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span><strong className="text-slate-950">{row.garcom}</strong><span className="ml-auto text-xs font-bold text-slate-500">{row.comandas} comandas</span></div><dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Vendas</dt><dd className="font-bold text-slate-800">{money(row.vendas)}</dd></div><div><dt className="text-slate-500">Serviço</dt><dd className="font-bold text-emerald-700">+ {money(row.servico)}</dd></div><div><dt className="text-slate-500">Estornos e cortesias</dt><dd className="font-bold text-rose-700">− {money(row.estornos + row.cortesias)}</dd></div><div><dt className="text-slate-500">Repasse</dt><dd className="font-black text-slate-950">{money(row.repasse)}</dd></div></dl></article>)}{!loading && !report?.rows.length && <div className="grid h-56 place-items-center px-6 text-center text-sm text-slate-400">Nenhuma comanda fechada com garçom no período selecionado.</div>}</div><div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Garçom</th><th className="px-4 py-3 text-center">Comandas</th><th className="px-4 py-3 text-right">Vendas</th><th className="px-4 py-3 text-right">Serviço</th><th className="px-4 py-3 text-right">Estornos</th><th className="px-4 py-3 text-right">Cortesias</th><th className="px-5 py-3 text-right">Repasse</th></tr></thead><tbody className="divide-y divide-slate-100">{report?.rows.map((row, index) => <tr key={row.garcomId} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span><strong className="text-slate-950">{row.garcom}</strong></div></td><td className="px-4 py-4 text-center font-bold text-slate-600">{row.comandas}</td><td className="px-4 py-4 text-right font-bold text-slate-800">{money(row.vendas)}</td><td className="px-4 py-4 text-right font-bold text-emerald-700">+ {money(row.servico)}</td><td className="px-4 py-4 text-right text-rose-700">− {money(row.estornos)}</td><td className="px-4 py-4 text-right text-amber-700">{money(row.cortesias)}</td><td className="px-5 py-4 text-right text-base font-black text-slate-950">{money(row.repasse)}</td></tr>)}</tbody>{report?.rows.length ? <tfoot className="bg-slate-950 text-white"><tr><td className="px-5 py-4 font-black">TOTAL</td><td /><td className="px-4 py-4 text-right font-black">{money(report.totals.vendas)}</td><td className="px-4 py-4 text-right font-black text-emerald-300">{money(report.totals.servico)}</td><td className="px-4 py-4 text-right font-black text-rose-300">{money(report.totals.estornos)}</td><td className="px-4 py-4 text-right font-black text-amber-300">{money(report.totals.cortesias)}</td><td className="px-5 py-4 text-right text-lg font-black">{money(report.totals.repasse)}</td></tr></tfoot> : null}</table>{!loading && !report?.rows.length && <div className="grid h-56 place-items-center px-6 text-center text-sm text-slate-400">Nenhuma comanda fechada com garçom no período selecionado.</div>}</div></section>
  </div></main>
}

function Metric({ label, value, tone, dark }: { label: string; value: number; tone?: 'in' | 'out'; dark?: boolean }) { return <div className={dark ? 'bg-slate-950 p-5 text-white' : 'p-5'}><span className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span><strong className={`mt-2 block text-2xl font-black ${dark ? 'text-white' : tone === 'in' ? 'text-emerald-700' : tone === 'out' ? 'text-rose-700' : 'text-slate-950'}`}>{money(value)}</strong></div> }
