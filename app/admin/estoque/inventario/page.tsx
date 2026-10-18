'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from '@/app/components/TenantLink'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Download, Plus, RefreshCw, Save, Send } from 'lucide-react'
import { apiFetch, fetchList } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'

type Supply = { id: number; codigo: string; nome: string; unidade: string; saldoAtual: number; custoMedio: number }
type InventoryItem = { id: number; saldoReferencia: number; quantidadeContada?: number | null; custoSnapshot: number; motivoAjuste?: string; unidadeSnapshot: string; insumo: Supply }
type Inventory = { id: number; status: string; descricao?: string; versao: number; criadoEm: string; efetivadoEm?: string; itens: InventoryItem[] }

const number = (value: unknown) => Number(value ?? 0)
const q = (value: unknown, unit?: string) => `${number(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ''}`

export default function InventarioEstoquePage() {
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [description, setDescription] = useState('Contagem geral')
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const inventories = useQuery({ queryKey: ['phase5-inventories'], queryFn: () => fetchList<Inventory>('/abastecimento/inventarios') })
  const selected = useMemo(() => inventories.data?.find(item => item.id === selectedId) ?? null, [inventories.data, selectedId])

  useEffect(() => {
    if (!selected) return
    setCounts(Object.fromEntries(selected.itens.map(item => [item.id, item.quantidadeContada === null || item.quantidadeContada === undefined ? '' : String(item.quantidadeContada)])))
    setReasons(Object.fromEntries(selected.itens.map(item => [item.id, item.motivoAjuste ?? ''])))
  }, [selected])

  const run = async (action: () => Promise<unknown>, success: string) => { setBusy(true); try { await action(); showToast(success, 'success'); await inventories.refetch() } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao processar inventário', 'error') } finally { setBusy(false) } }
  const create = () => run(async () => { const result = await apiFetch<{ inventario: Inventory }>('/abastecimento/inventarios', { method: 'POST', body: { descricao: description, chaveIdempotencia: `inventario-${Date.now()}` } }); setSelectedId(result.inventario.id) }, 'Inventário aberto com o saldo congelado para conferência')
  const save = () => selected && run(() => apiFetch(`/abastecimento/inventarios/${selected.id}/contagens`, { method: 'PUT', body: { versao: selected.versao, itens: selected.itens.map(item => ({ id: item.id, quantidadeContada: counts[item.id]?.trim() === '' ? null : Number(counts[item.id].replace(',', '.')), motivoAjuste: reasons[item.id] || null })) } }), 'Rascunho salvo')
  const submit = () => selected && run(() => apiFetch(`/abastecimento/inventarios/${selected.id}/enviar-revisao`, { method: 'POST' }), 'Inventário enviado para revisão')
  const approve = () => selected && run(() => apiFetch(`/abastecimento/inventarios/${selected.id}/efetivar`, { method: 'POST' }), 'Inventário efetivado e movimentos de ajuste criados')
  const counted = selected?.itens.filter(item => counts[item.id]?.trim() !== '').length ?? 0

  return <main className="mx-auto max-w-7xl p-4 md:p-8">
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><Link href="/admin/estoque" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="text-3xl font-black text-slate-950">Inventário mobile</h1><p className="mt-1 text-sm text-slate-600">Contagem em rascunho, revisão das divergências e ajuste auditado.</p></div></div><button onClick={() => void inventories.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw className="h-4 w-4" />Atualizar</button></header>
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><input value={description} onChange={event => setDescription(event.target.value)} className="input" placeholder="Descrição da contagem" /><button disabled={busy} onClick={() => void create()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" />Abrir inventário geral</button></div></section>
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><aside className="space-y-2">{inventories.data?.map(inventory => <button key={inventory.id} onClick={() => setSelectedId(inventory.id)} className={`w-full rounded-xl border p-4 text-left ${selectedId === inventory.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-orange-700">INV-{String(inventory.id).padStart(6, '0')}</span><span className="text-[10px] font-black text-slate-500">{inventory.status.replaceAll('_', ' ')}</span></div><p className="mt-1 truncate text-sm font-bold text-slate-900">{inventory.descricao || 'Inventário'}</p><p className="mt-1 text-xs text-slate-500">{inventory.itens.length} itens</p></button>)}</aside>
      <section>{selected ? <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-lg font-black text-slate-950">{selected.descricao || `Inventário #${selected.id}`}</h2><p className="text-sm text-slate-500">{counted} de {selected.itens.length} itens contados · versão {selected.versao}</p></div><div className="flex flex-wrap gap-2">{selected.status === 'RASCUNHO' && <><button disabled={busy} onClick={() => void save()} className="action"><Save className="h-4 w-4" />Salvar</button><button disabled={busy || counted !== selected.itens.length} onClick={() => void submit()} className="action primary"><Send className="h-4 w-4" />Enviar revisão</button></>}{selected.status === 'EM_REVISAO' && <button disabled={busy} onClick={() => void approve()} className="action primary"><CheckCircle2 className="h-4 w-4" />Efetivar ajustes</button>}<a href={`/api/abastecimento/inventarios/${selected.id}/exportar`} className="action"><Download className="h-4 w-4" />CSV</a></div></div><div className="divide-y divide-slate-100">{selected.itens.map(item => { const current = counts[item.id]?.trim() === '' ? null : Number((counts[item.id] ?? '').replace(',', '.')); const difference = current === null || Number.isNaN(current) ? null : current - number(item.saldoReferencia); return <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_140px_130px_minmax(180px,1fr)] md:items-center"><div><p className="font-bold text-slate-900">{item.insumo.codigo} · {item.insumo.nome}</p><p className="text-xs text-slate-500">Referência: {q(item.saldoReferencia, item.unidadeSnapshot)} · custo {Number(item.custoSnapshot).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div><input disabled={selected.status !== 'RASCUNHO'} inputMode="decimal" value={counts[item.id] ?? ''} onChange={event => setCounts(prev => ({ ...prev, [item.id]: event.target.value }))} className="input" placeholder="Contado" /><p className={`text-sm font-black ${difference && difference < 0 ? 'text-red-700' : difference && difference > 0 ? 'text-green-700' : 'text-slate-500'}`}>{difference === null ? 'Pendente' : `${difference > 0 ? '+' : ''}${q(difference, item.unidadeSnapshot)}`}</p><input disabled={selected.status !== 'RASCUNHO'} value={reasons[item.id] ?? ''} onChange={event => setReasons(prev => ({ ...prev, [item.id]: event.target.value }))} className="input" placeholder="Motivo da divergência" /></div>})}</div></div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">Selecione ou abra um inventário.</div>}</section></div>
    <style jsx>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.7rem .8rem;color:#0f172a;background:white;outline:none}.input:disabled{background:#f8fafc;color:#64748b}.action{display:inline-flex;align-items:center;gap:.4rem;border:1px solid #cbd5e1;border-radius:.65rem;padding:.55rem .75rem;font-size:.8rem;font-weight:800;color:#334155;background:white}.action.primary{border-color:#ea580c;background:#ea580c;color:white}`}</style>
  </main>
}
