'use client'

import { useState } from 'react'
import Link from '@/app/components/TenantLink'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Factory, Play, Plus, RefreshCw, RotateCcw } from 'lucide-react'
import { apiFetch, fetchList } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { Modal } from '@/app/components/ui/Modal'

type Product = { id: number; nome: string; codigo?: string; ativo: boolean }
type Supply = { id: number; nome: string; unidade: string }
type PreparationItem = { id: number; quantidadePrevista: number; quantidadeConsumida?: number; quantidadeDevolvida: number; insumo: Supply }
type Preparation = { id: number; status: string; quantidadePlanejada: number; quantidadeProduzida?: number; quantidadePerda: number; custoReal?: number; produto: Product; itens: PreparationItem[]; criadoEm: string }

const q = (value: number | string, unit?: string) => `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ''}`

export default function ProducaoPage() {
  const { showToast } = useToast()
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [busy, setBusy] = useState(false)
  const [concluding, setConcluding] = useState<Preparation | null>(null)
  const [produzida, setProduzida] = useState('')
  const [perda, setPerda] = useState('0')
  const [cancelling, setCancelling] = useState<Preparation | null>(null)
  const [reason, setReason] = useState('')

  const orders = useQuery({ queryKey: ['phase5-preparations'], queryFn: () => fetchList<Preparation>('/abastecimento/ordens-preparo') })
  const products = useQuery({ queryKey: ['phase5-products'], queryFn: () => fetchList<Product>('/products?page=1&pageSize=1000&ativo=true&sort=nome') })
  const run = async (action: () => Promise<unknown>, success: string) => { setBusy(true); try { await action(); showToast(success, 'success'); await orders.refetch() } catch (error) { showToast(error instanceof Error ? error.message : 'Falha na operação', 'error') } finally { setBusy(false) } }

  const create = (event: React.FormEvent) => { event.preventDefault(); void run(async () => { await apiFetch('/abastecimento/ordens-preparo', { method: 'POST', body: { produtoId: Number(produtoId), quantidadePlanejada: Number(quantidade.replace(',', '.')), observacao: observacao || null, chaveIdempotencia: `preparo-${Date.now()}` } }); setQuantidade(''); setObservacao('') }, 'Ordem de preparo criada') }
  const start = (order: Preparation) => run(() => apiFetch(`/abastecimento/ordens-preparo/${order.id}/iniciar`, { method: 'POST' }), 'Materiais reservados e preparo iniciado')
  const conclude = (event: React.FormEvent) => { event.preventDefault(); if (!concluding) return; void run(async () => { await apiFetch(`/abastecimento/ordens-preparo/${concluding.id}/concluir`, { method: 'POST', body: { quantidadeProduzida: Number(produzida.replace(',', '.')), quantidadePerda: Number(perda.replace(',', '.')), consumos: concluding.itens.map(item => ({ id: item.id, quantidadeConsumida: Number(item.quantidadePrevista) })) } }); setConcluding(null) }, 'Produção apontada e estoque atualizado') }
  const cancel = (event: React.FormEvent) => { event.preventDefault(); if (!cancelling) return; void run(async () => { await apiFetch(`/abastecimento/ordens-preparo/${cancelling.id}/cancelar`, { method: 'POST', body: { motivo: reason } }); setCancelling(null); setReason('') }, 'Ordem cancelada com movimentos compensatórios') }

  return <main className="mx-auto max-w-7xl p-4 md:p-8">
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><Link href="/admin/estoque" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="text-3xl font-black text-slate-950">Produção interna</h1><p className="mt-1 text-sm text-slate-600">Planeje, consuma a ficha técnica e aponte rendimento e perdas.</p></div></div><button onClick={() => void orders.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw className="h-4 w-4" />Atualizar</button></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-3">{orders.data?.map(order => <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-orange-600">PRP-{String(order.id).padStart(6, '0')}</p><h2 className="mt-1 text-lg font-black text-slate-950">{order.produto.nome}</h2><p className="text-sm text-slate-500">Planejado: {q(order.quantidadePlanejada)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{order.status.replaceAll('_', ' ')}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{order.itens.map(item => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold text-slate-800">{item.insumo.nome}</p><p className="text-xs text-slate-500">Previsto {q(item.quantidadePrevista, item.insumo.unidade)}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{order.status === 'RASCUNHO' && <button disabled={busy} onClick={() => void start(order)} className="action primary"><Play className="h-4 w-4" />Iniciar</button>}{order.status === 'EM_PREPARO' && <button onClick={() => { setConcluding(order); setProduzida(String(order.quantidadePlanejada)) }} className="action primary"><CheckCircle2 className="h-4 w-4" />Apontar produção</button>}{['RASCUNHO', 'EM_PREPARO'].includes(order.status) && <button onClick={() => setCancelling(order)} className="action"><RotateCcw className="h-4 w-4" />Cancelar/reverter</button>}</div></article>)}{!orders.isLoading && orders.data?.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Nenhuma ordem de preparo.</div>}</section>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-5"><div className="mb-5 flex items-center gap-2"><div className="rounded-xl bg-orange-100 p-2 text-orange-700"><Factory className="h-5 w-5" /></div><h2 className="font-black text-slate-950">Nova ordem</h2></div><form onSubmit={create} className="space-y-4"><label className="field">Produto<select required value={produtoId} onChange={e => setProdutoId(e.target.value)} className="input"><option value="">Selecione</option>{products.data?.map(item => <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} · ` : ''}{item.nome}</option>)}</select></label><label className="field">Quantidade planejada<input required inputMode="numeric" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="input" /></label><label className="field">Observação<textarea value={observacao} onChange={e => setObservacao(e.target.value)} className="input min-h-20" /></label><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" />Criar ordem</button></form></aside>
    </div>
    <Modal open={Boolean(concluding)} title="Apontar produção" onClose={() => setConcluding(null)} isLoading={busy} mobileSheet><form onSubmit={conclude} className="space-y-4 p-5"><label className="field">Quantidade produzida<input required inputMode="numeric" value={produzida} onChange={e => setProduzida(e.target.value)} className="input" /></label><label className="field">Perda<input required inputMode="decimal" value={perda} onChange={e => setPerda(e.target.value)} className="input" /></label><button disabled={busy} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white">Concluir e atualizar estoques</button></form></Modal>
    <Modal open={Boolean(cancelling)} title="Cancelar ou reverter ordem" onClose={() => setCancelling(null)} isLoading={busy} role="alertdialog" mobileSheet><form onSubmit={cancel} className="space-y-4 p-5"><p className="text-sm text-slate-600">Se o preparo já começou, os materiais consumidos serão devolvidos por movimentos compensatórios.</p><label className="field">Motivo<textarea required minLength={3} value={reason} onChange={e => setReason(e.target.value)} className="input min-h-20" /></label><button disabled={busy} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white">Confirmar cancelamento</button></form></Modal>
    <style jsx>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.7rem .8rem;color:#0f172a;background:white;outline:none}.field{display:block;font-size:.875rem;font-weight:700;color:#1e293b}.field .input{display:block;margin-top:.4rem}.action{display:inline-flex;align-items:center;gap:.4rem;border:1px solid #cbd5e1;border-radius:.65rem;padding:.55rem .75rem;font-size:.8rem;font-weight:800;color:#334155;background:white}.action.primary{border-color:#ea580c;background:#ea580c;color:white}`}</style>
  </main>
}
