'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Gift, LoaderCircle, RefreshCw } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { useBranding } from '@/app/contexts/BrandingContext'

type CourtesyReportItem = {
  id: number
  comandaId: number
  pedidoItemId: number | null
  valor: number
  motivo: string
  criadoEm: string
  autorizadoPor: { id: number; nome: string }
  registradoPor: { id: number; nome: string }
  pedidoItem: { produto: { nome: string } } | null
}

const dateInput = (date: Date) => date.toISOString().slice(0, 10)

export default function CourtesyReportPage() {
  const { branding } = useBranding()
  const [start, setStart] = useState(() => dateInput(new Date(Date.now() - 30 * 86400_000)))
  const [end, setEnd] = useState(() => dateInput(new Date()))
  const [items, setItems] = useState<CourtesyReportItem[]>([])
  const [reportedTotal, setReportedTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await apiFetch<{ data: CourtesyReportItem[]; total: number }>(`/orders/counter/courtesies/report?inicio=${start}&fim=${end}`)
      setItems(response.data); setReportedTotal(Number(response.total))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o relatório.')
    } finally { setLoading(false) }
  }, [start, end])

  useEffect(() => { if (branding.modulosAtivos.includes('BALCAO')) void load() }, [branding.modulosAtivos, load])
  const average = useMemo(() => items.length ? reportedTotal / items.length : 0, [items.length, reportedTotal])

  if (!branding.modulosAtivos.includes('BALCAO')) return <main className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">O módulo de balcão não está habilitado.</div></main>

  return <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><Link href="/balcao/pedidos" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-orange-700"><ArrowLeft size={16} /> Voltar aos pedidos</Link><p className="mt-3 text-xs font-black uppercase tracking-[.18em] text-violet-600">Auditoria comercial</p><h1 className="mt-1 text-3xl font-black text-slate-950">Cortesias de balcão</h1><p className="mt-1 text-sm text-slate-500">Valores, motivos e responsáveis por cada concessão.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading || start > end} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
    </header>

    <section className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Data inicial</span><span className="relative mt-1 block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="date" value={start} onChange={event => setStart(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></span></label>
      <label><span className="text-xs font-black uppercase tracking-wide text-slate-500">Data final</span><span className="relative mt-1 block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="date" value={end} onChange={event => setEnd(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></span></label>
      <span className={`pb-3 text-xs font-bold ${start > end ? 'text-red-600' : 'text-slate-500'}`}>{start > end ? 'A data inicial deve vir antes da final.' : 'Até 5.000 registros por consulta'}</span>
    </section>

    <section className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Concessões</span><strong className="mt-1 block text-2xl text-slate-950">{items.length}</strong></div><div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><span className="text-xs font-black uppercase tracking-wide text-violet-600">Valor concedido</span><strong className="mt-1 block text-2xl text-violet-950">{reportedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Ticket médio</span><strong className="mt-1 block text-2xl text-slate-950">{average.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div></section>

    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
    {loading ? <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-orange-600" /></div> : <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Atendimento / item</th><th className="px-4 py-3">Motivo</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item => <tr key={item.id} className="align-top hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(item.criadoEm).toLocaleString('pt-BR')}</td><td className="px-4 py-3"><strong className="block text-slate-900">Balcão #{item.comandaId}</strong><span className="text-xs text-slate-500">{item.pedidoItem?.produto.nome ?? 'Atendimento completo'}</span></td><td className="max-w-sm px-4 py-3 text-slate-700">{item.motivo}</td><td className="px-4 py-3 text-slate-700">{item.autorizadoPor.nome}</td><td className="whitespace-nowrap px-4 py-3 text-right font-black text-violet-700">{Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>)}</tbody></table></div>{items.length === 0 && <div className="grid place-items-center gap-2 border-t border-slate-100 py-16 text-center text-slate-500"><Gift size={28} className="text-slate-300" /><p>Nenhuma cortesia no período selecionado.</p></div>}</div>}
  </main>
}
