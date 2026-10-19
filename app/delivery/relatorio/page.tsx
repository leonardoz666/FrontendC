'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bike, LoaderCircle, RefreshCw } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { readUrlViewState, replaceUrlViewState } from '@/app/lib/view-state'

type Row = { id: number; nome: string; telefone: string; status: string; atribuidas: number; entregues: number; canceladas: number; ocorrencias: number; tempoMedioMin: number | null; valorEntregue: number; taxasEntrega: number; valorRecebido: number }
type Report = { from: string; to: string; rows: Row[]; totals: { atribuidas: number; entregues: number; valorEntregue: number; valorRecebido: number } }
const dateInput = (date: Date) => { const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10) }
const money = (value: number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DeliveryReportPage() {
  const { showToast } = useToast()
  const [from, setFrom] = useState(() => dateInput(new Date(Date.now() - 29 * 24 * 60 * 60_000)))
  const [to, setTo] = useState(() => dateInput(new Date()))
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [urlReady, setUrlReady] = useState(false)
  useEffect(() => {
    const state = readUrlViewState({ inicio: dateInput(new Date(Date.now() - 29 * 24 * 60 * 60_000)), fim: dateInput(new Date()) })
    if (/^\d{4}-\d{2}-\d{2}$/.test(state.inicio)) setFrom(state.inicio)
    if (/^\d{4}-\d{2}-\d{2}$/.test(state.fim)) setTo(state.fim)
    setUrlReady(true)
  }, [])
  useEffect(() => {
    if (urlReady) replaceUrlViewState({ inicio: from, fim: to })
  }, [from, to, urlReady])
  const load = useCallback(async () => {
    setLoading(true)
    try { setReport(await apiFetch<Report>(`/delivery/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)) }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar o relatório.', 'error') }
    finally { setLoading(false) }
  }, [from, to, showToast])
  useEffect(() => { void load() }, [load])

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-slate-950">Relatório de motoboys</h1><p className="mt-1 text-sm text-slate-500">Entregas, tempo em rota e valores por período.</p></div><div className="flex flex-wrap items-end gap-2"><label><span className="block text-xs font-bold text-slate-600">De</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" /></label><label><span className="block text-xs font-bold text-slate-600">Até</span><input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" /></label><button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar</button></div></header>
    <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4"><Metric label="Entregas atribuídas" value={String(report?.totals.atribuidas ?? 0)} /><Metric label="Entregas concluídas" value={String(report?.totals.entregues ?? 0)} /><Metric label="Valor entregue" value={money(report?.totals.valorEntregue ?? 0)} /><Metric label="Dinheiro registrado" value={money(report?.totals.valorRecebido ?? 0)} /></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100 md:hidden">{report?.rows.map(row => <article key={row.id} className="space-y-3 p-4"><div><strong className="block text-slate-950">{row.nome}</strong><span className="text-xs text-slate-500">{row.telefone} · {row.status}</span></div><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><MobileValue label="Entregas" value={`${row.entregues} de ${row.atribuidas}`} /><MobileValue label="Canceladas" value={String(row.canceladas)} /><MobileValue label="Ocorrências" value={String(row.ocorrencias)} /><MobileValue label="Tempo médio" value={row.tempoMedioMin === null ? '—' : `${row.tempoMedioMin} min`} /><MobileValue label="Valor entregue" value={money(row.valorEntregue)} /><MobileValue label="Taxas" value={money(row.taxasEntrega)} /><MobileValue label="Recebido" value={money(row.valorRecebido)} strong /></dl></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr><Th>Motoboy</Th><Th>Atribuídas</Th><Th>Entregues</Th><Th>Canceladas</Th><Th>Ocorrências</Th><Th>Tempo médio</Th><Th>Valor entregue</Th><Th>Taxas</Th><Th>Recebido</Th></tr></thead><tbody className="divide-y divide-slate-100">{report?.rows.map(row => <tr key={row.id} className="hover:bg-slate-50"><td className="px-4 py-3"><strong className="block text-slate-950">{row.nome}</strong><span className="text-xs text-slate-500">{row.telefone} · {row.status}</span></td><Td>{row.atribuidas}</Td><Td>{row.entregues}</Td><Td>{row.canceladas}</Td><Td>{row.ocorrencias}</Td><Td>{row.tempoMedioMin === null ? '—' : `${row.tempoMedioMin} min`}</Td><Td>{money(row.valorEntregue)}</Td><Td>{money(row.taxasEntrega)}</Td><Td>{money(row.valorRecebido)}</Td></tr>)}</tbody></table></div>{loading && !report ? <div className="grid h-56 place-items-center"><LoaderCircle className="animate-spin text-orange-600" /></div> : report?.rows.length === 0 && <div className="py-16 text-center"><Bike className="mx-auto text-slate-300" size={34} /><h2 className="mt-3 font-black text-slate-800">Nenhum motoboy cadastrado</h2><p className="mt-1 text-sm text-slate-500">Cadastre a equipe na configuração de delivery.</p></div>}</section>
  </div></main>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border-b border-slate-100 p-4 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"><span className="text-sm font-bold text-slate-500">{label}</span><strong className="mt-2 block text-2xl font-black text-slate-950">{value}</strong></div> }
function Th({ children }: { children: React.ReactNode }) { return <th className="whitespace-nowrap px-4 py-3 font-black">{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td className="whitespace-nowrap px-4 py-3 text-slate-700">{children}</td> }
function MobileValue({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div><dt className="text-slate-500">{label}</dt><dd className={strong ? 'font-black text-emerald-700' : 'font-bold text-slate-800'}>{value}</dd></div> }
