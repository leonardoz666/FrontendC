'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquareText, Star } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/app/components/ui/DataTable'
import { ExportMenu } from '@/app/components/ui/ExportMenu'
import { apiFetch } from '@/app/lib/api'
import type { PaginationMeta, SortOrder } from '@/app/lib/pagination'
import { useToast } from '@/contexts/ToastContext'

type Avaliacao = {
  id: number; nota: number; texto: string | null; criadoEm: string; comandaId: number
  sessao: { nomeConvidado: string | null; telefone: string | null; cliente: { id: number; nome: string } | null; mesa: { id: number; numero: number }; comanda: { id: number; status: string; total: number } | null }
}
type Summary = { total: number; media: number; distribuicao: Record<string, number> }

export default function AvaliacoesPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<Avaliacao[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize: 25, total: 0, totalPages: 0 })
  const [summary, setSummary] = useState<Summary>({ total: 0, media: 0, distribuicao: {} })
  const [nota, setNota] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [sort, setSort] = useState<string | null>('criadoEm')
  const [order, setOrder] = useState<SortOrder | null>('desc')
  const [loading, setLoading] = useState(true)

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(meta.page), pageSize: String(meta.pageSize), sort: sort ?? 'criadoEm', order: order ?? 'desc' })
    if (nota) value.set('nota', nota)
    if (inicio) value.set('inicio', inicio)
    if (fim) value.set('fim', fim)
    return value
  }, [fim, inicio, meta.page, meta.pageSize, nota, order, sort])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiFetch<{ data: Avaliacao[]; meta: PaginationMeta; summary: Summary }>(`/evaluations?${params}`)
      setData(response.data); setMeta(response.meta); setSummary(response.summary)
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar as avaliações.', 'error') }
    finally { setLoading(false) }
  }, [params, showToast])

  useEffect(() => { void load() }, [load])

  const columns: Array<DataTableColumn<Avaliacao>> = [
    { key: 'nota', header: 'Nota', sortKey: 'nota', render: item => <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-black text-amber-700"><Star size={14} fill="currentColor" /> {item.nota}</span> },
    { key: 'cliente', header: 'Cliente', render: item => <div><strong className="block text-slate-900">{item.sessao.cliente?.nome || item.sessao.nomeConvidado || 'Visitante'}</strong><span className="text-xs text-slate-500">{item.sessao.telefone || 'Sem telefone'}</span></div> },
    { key: 'texto', header: 'Comentário', render: item => item.texto || <span className="text-slate-400">Sem comentário</span> },
    { key: 'mesa', header: 'Atendimento', hideOnMobile: true, render: item => <div><span className="block">Mesa {item.sessao.mesa.numero}</span><span className="text-xs text-slate-500">Comanda #{item.comandaId}</span></div> },
    { key: 'criadoEm', header: 'Recebida em', sortKey: 'criadoEm', render: item => new Date(item.criadoEm).toLocaleString('pt-BR') },
  ]

  const exportRows = async () => {
    const exportParams = new URLSearchParams(params); exportParams.set('page', '1'); exportParams.set('pageSize', '100')
    const response = await apiFetch<{ data: Avaliacao[] }>(`/evaluations?${exportParams}`)
    return response.data.map(item => ({ nota: item.nota, cliente: item.sessao.cliente?.nome || item.sessao.nomeConvidado || 'Visitante', telefone: item.sessao.telefone || '', comentario: item.texto || '', mesa: item.sessao.mesa.numero, comanda: item.comandaId, data: new Date(item.criadoEm).toLocaleString('pt-BR') }))
  }

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <header><h1 className="text-3xl font-black text-slate-950">Avaliações</h1><p className="mt-1 text-sm text-slate-500">Percepção dos clientes após o atendimento por QR-Code.</p></header>
    <section className="grid gap-3 sm:grid-cols-[1fr_2fr]">
      <article className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Média do período</p><div className="mt-3 flex items-end gap-2"><strong className="text-5xl font-black">{summary.media.toFixed(1)}</strong><span className="mb-1 text-slate-400">/ 5 · {summary.total} respostas</span></div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="space-y-2">{[5, 4, 3, 2, 1].map(value => { const count = summary.distribuicao[String(value)] ?? 0; const width = summary.total ? (count / summary.total) * 100 : 0; return <div key={value} className="grid grid-cols-[2rem_1fr_3rem] items-center gap-2 text-xs"><span className="font-black text-slate-700">{value}★</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-orange-500" style={{ width: `${width}%` }} /></span><span className="text-right text-slate-500">{count}</span></div> })}</div></article>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-black uppercase tracking-wide text-slate-500">Nota<select value={nota} onChange={event => { setNota(event.target.value); setMeta(current => ({ ...current, page: 1 })) }} className="mt-1 block h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"><option value="">Todas</option>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} estrelas</option>)}</select></label><label className="text-xs font-black uppercase tracking-wide text-slate-500">De<input type="date" value={inicio} onChange={event => { setInicio(event.target.value); setMeta(current => ({ ...current, page: 1 })) }} className="mt-1 block h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-800" /></label><label className="text-xs font-black uppercase tracking-wide text-slate-500">Até<input type="date" value={fim} onChange={event => { setFim(event.target.value); setMeta(current => ({ ...current, page: 1 })) }} className="mt-1 block h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-800" /></label><ExportMenu className="ml-auto" fileName="avaliacoes" title="Avaliações de clientes" getRows={exportRows} disabled={loading} /></div></section>
    <DataTable columns={columns} data={data} getRowId={item => item.id} meta={meta} loading={loading} itemLabel="avaliações" storageKey="admin-avaliacoes" showControls={false} onPageChange={page => setMeta(current => ({ ...current, page }))} onPageSizeChange={pageSize => setMeta(current => ({ ...current, pageSize, page: 1 }))} onSort={(field, direction) => { setSort(field); setOrder(direction); setMeta(current => ({ ...current, page: 1 })) }} emptyMessage="Nenhuma avaliação encontrada" emptyHint="As avaliações enviadas pelo cardápio público aparecerão aqui." ariaLabel="Avaliações de clientes" />
    {summary.total === 0 && !loading && <div className="sr-only"><MessageSquareText /> Ainda não há avaliações no período.</div>}
  </div></main>
}
