'use client'

import { useMemo, useState } from 'react'
import Link from '@/app/components/TenantLink'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ClipboardList, PackageCheck, Plus, RefreshCw, Send, Truck } from 'lucide-react'
import { apiFetch, fetchList } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'

type Supplier = { id: number; nome: string; ativo: boolean }
type Supply = { id: number; codigo: string; nome: string; unidade: string; custoMedio: number; saldoAtual: number; ativo: boolean }
type Stock = { id: number; nome: string; ativo: boolean }
type PurchaseItem = { id: number; quantidadeSolicitada: number; quantidadeRecebida: number; custoPrevisto: number; custoRecebido?: number; insumo: Supply }
type Purchase = { id: number; status: string; previsaoEntrega?: string; totalPrevisto: number; totalRecebido: number; fornecedor: Supplier; itens: PurchaseItem[]; recebimentos: Array<{ id: number; estornadoEm?: string }> }
type RequestItem = { id: number; quantidadeSolicitada: number; quantidadeSeparada: number; quantidadeDespachada: number; quantidadeRecebida: number; insumo: Supply }
type StockRequest = { id: number; status: string; origem?: Stock; destino: Stock; itens: RequestItem[]; criadoEm: string }

const money = (value: number | string) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const quantity = (value: number | string, unit?: string) => `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ''}`
const key = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`

function Status({ value }: { value: string }) {
  const positive = ['RECEBIDA', 'RECEBIDO'].includes(value)
  const warning = ['PARCIALMENTE_RECEBIDA', 'EM_SEPARACAO', 'DESPACHADA'].includes(value)
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${positive ? 'bg-green-100 text-green-800' : warning ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{value.replaceAll('_', ' ')}</span>
}

export default function AbastecimentoPage() {
  const { showToast } = useToast()
  const [tab, setTab] = useState<'compras' | 'requisicoes'>('compras')
  const [busy, setBusy] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [supplyId, setSupplyId] = useState('')
  const [amount, setAmount] = useState('')
  const [cost, setCost] = useState('')
  const [forecast, setForecast] = useState('')
  const [originId, setOriginId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [receiving, setReceiving] = useState<Purchase | null>(null)
  const [document, setDocument] = useState('')
  const [divergenceReason, setDivergenceReason] = useState('')

  const purchases = useQuery({ queryKey: ['phase5-purchases'], queryFn: () => fetchList<Purchase>('/abastecimento/compras') })
  const requests = useQuery({ queryKey: ['phase5-requests'], queryFn: () => fetchList<StockRequest>('/abastecimento/requisicoes') })
  const suppliers = useQuery({ queryKey: ['phase5-suppliers'], queryFn: () => fetchList<Supplier>('/fornecedores?pageSize=500&ativo=true') })
  const supplies = useQuery({ queryKey: ['phase5-supplies'], queryFn: () => fetchList<Supply>('/insumos?pageSize=1000&ativo=true&sort=nome') })
  const stocks = useQuery({ queryKey: ['phase5-stocks'], queryFn: () => fetchList<Stock>('/estoques?pageSize=500&ativo=true') })

  const refresh = async () => { await Promise.all([purchases.refetch(), requests.refetch()]) }
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try { await action(); showToast(success, 'success'); await refresh() }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível concluir a operação', 'error') }
    finally { setBusy(false) }
  }

  const createPurchase = (event: React.FormEvent) => {
    event.preventDefault()
    void run(async () => {
      await apiFetch('/abastecimento/compras', { method: 'POST', body: {
        fornecedorId: Number(supplierId), previsaoEntrega: forecast ? new Date(`${forecast}T12:00:00`).toISOString() : null,
        chaveIdempotencia: key('compra'), itens: [{ insumoId: Number(supplyId), quantidade: Number(amount.replace(',', '.')), custoPrevisto: Number(cost.replace(',', '.')) }],
      } })
      setAmount(''); setCost(''); setSupplyId('')
    }, 'Solicitação de compra criada')
  }

  const transitionPurchase = (purchase: Purchase, status: string) => run(
    () => apiFetch(`/abastecimento/compras/${purchase.id}/transicoes`, { method: 'POST', body: { status } }),
    `Compra atualizada para ${status.replaceAll('_', ' ').toLowerCase()}`
  )

  const receivePurchase = (event: React.FormEvent) => {
    event.preventDefault()
    if (!receiving) return
    void run(async () => {
      await apiFetch(`/abastecimento/compras/${receiving.id}/recebimentos`, { method: 'POST', body: {
        documento: document || null, chaveIdempotencia: key('recebimento'), motivoDivergencia: divergenceReason || null,
        itens: receiving.itens.filter(item => Number(item.quantidadeSolicitada) > Number(item.quantidadeRecebida)).map(item => ({
          compraItemId: item.id,
          quantidadeRecebida: Number(item.quantidadeSolicitada) - Number(item.quantidadeRecebida),
          quantidadeRecusada: 0,
          custoUnitario: Number(item.custoPrevisto),
        })),
      } })
      setReceiving(null); setDocument(''); setDivergenceReason('')
    }, 'Recebimento registrado e estoque atualizado')
  }

  const createRequest = (event: React.FormEvent) => {
    event.preventDefault()
    void run(async () => {
      await apiFetch('/abastecimento/requisicoes', { method: 'POST', body: {
        origemId: originId ? Number(originId) : null, destinoId: Number(destinationId), chaveIdempotencia: key('requisicao'),
        itens: [{ insumoId: Number(supplyId), quantidade: Number(amount.replace(',', '.')) }],
      } })
      setAmount(''); setSupplyId('')
    }, 'Requisição criada')
  }

  const transitionRequest = (request: StockRequest, status: string) => run(
    () => apiFetch(`/abastecimento/requisicoes/${request.id}/transicoes`, { method: 'POST', body: {
      status,
      itens: request.itens.map(item => ({ id: item.id, quantidade: status === 'EM_SEPARACAO' ? Number(item.quantidadeSolicitada) : status === 'DESPACHADA' ? Number(item.quantidadeSeparada || item.quantidadeSolicitada) : Number(item.quantidadeDespachada) })),
    } }),
    `Requisição atualizada para ${status.replaceAll('_', ' ').toLowerCase()}`
  )

  const selectedSupply = useMemo(() => supplies.data?.find(item => String(item.id) === supplyId), [supplies.data, supplyId])

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/admin/estoque" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Link>
          <div><h1 className="text-3xl font-black text-slate-950">Compras e abastecimento</h1><p className="mt-1 text-sm text-slate-600">Do pedido ao fornecedor até o recebimento e a distribuição interna.</p></div>
        </div>
        <button onClick={() => void refresh()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Atualizar</button>
      </header>

      <div className="mb-5 flex w-fit rounded-xl bg-slate-100 p-1">
        <button onClick={() => setTab('compras')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'compras' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600'}`}>Compras</button>
        <button onClick={() => setTab('requisicoes')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'requisicoes' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600'}`}>Requisições</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-3">
          {(tab === 'compras' ? purchases.isLoading : requests.isLoading) && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Carregando...</div>}
          {tab === 'compras' && purchases.data?.map(purchase => (
            <article key={purchase.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-orange-600">CMP-{String(purchase.id).padStart(6, '0')}</p><h2 className="mt-1 text-lg font-black text-slate-950">{purchase.fornecedor.nome}</h2><p className="text-sm text-slate-500">{purchase.itens.length} item(ns) · {money(purchase.totalPrevisto)}</p></div><Status value={purchase.status} /></div>
              <div className="mt-4 divide-y divide-slate-100 rounded-xl bg-slate-50 px-4">{purchase.itens.map(item => <div key={item.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-semibold text-slate-800">{item.insumo.nome}</span><span className="text-slate-600">{quantity(item.quantidadeRecebida, item.insumo.unidade)} / {quantity(item.quantidadeSolicitada, item.insumo.unidade)}</span></div>)}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {purchase.status === 'RASCUNHO' && <button disabled={busy} onClick={() => void transitionPurchase(purchase, 'SOLICITADA')} className="action"><Check className="h-4 w-4" />Solicitar</button>}
                {purchase.status === 'SOLICITADA' && <button disabled={busy} onClick={() => void transitionPurchase(purchase, 'ENVIADA_AO_FORNECEDOR')} className="action"><Send className="h-4 w-4" />Registrar envio</button>}
                {['ENVIADA_AO_FORNECEDOR', 'PARCIALMENTE_RECEBIDA'].includes(purchase.status) && <button disabled={busy} onClick={() => setReceiving(purchase)} className="action primary"><PackageCheck className="h-4 w-4" />Receber</button>}
                <a href={`/api/abastecimento/compras/${purchase.id}/documento`} target="_blank" rel="noreferrer" className="action"><ClipboardList className="h-4 w-4" />Documento</a>
              </div>
            </article>
          ))}
          {tab === 'requisicoes' && requests.data?.map(request => (
            <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-orange-600">REQ-{String(request.id).padStart(6, '0')}</p><h2 className="mt-1 text-lg font-black text-slate-950">{request.origem?.nome ?? 'Estoque central'} → {request.destino.nome}</h2><p className="text-sm text-slate-500">{request.itens.length} item(ns)</p></div><Status value={request.status} /></div>
              <div className="mt-4 divide-y divide-slate-100 rounded-xl bg-slate-50 px-4">{request.itens.map(item => <div key={item.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-semibold text-slate-800">{item.insumo.nome}</span><span className="text-slate-600">{quantity(item.quantidadeSolicitada, item.insumo.unidade)}</span></div>)}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {request.status === 'RASCUNHO' && <button disabled={busy} onClick={() => void transitionRequest(request, 'SOLICITADA')} className="action">Solicitar</button>}
                {request.status === 'SOLICITADA' && <button disabled={busy} onClick={() => void transitionRequest(request, 'EM_SEPARACAO')} className="action">Separar tudo</button>}
                {request.status === 'EM_SEPARACAO' && <button disabled={busy} onClick={() => void transitionRequest(request, 'DESPACHADA')} className="action primary"><Truck className="h-4 w-4" />Despachar</button>}
                {request.status === 'DESPACHADA' && <button disabled={busy} onClick={() => void transitionRequest(request, 'RECEBIDA')} className="action primary"><PackageCheck className="h-4 w-4" />Confirmar recebimento</button>}
              </div>
            </article>
          ))}
          {tab === 'compras' && !purchases.isLoading && purchases.data?.length === 0 && <Empty text="Nenhuma compra cadastrada." />}
          {tab === 'requisicoes' && !requests.isLoading && requests.data?.length === 0 && <Empty text="Nenhuma requisição cadastrada." />}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
          <div className="mb-5 flex items-center gap-2"><div className="rounded-xl bg-orange-100 p-2 text-orange-700"><Plus className="h-5 w-5" /></div><div><h2 className="font-black text-slate-950">{tab === 'compras' ? 'Nova compra' : 'Nova requisição'}</h2><p className="text-xs text-slate-500">Comece com um item e complemente o fluxo.</p></div></div>
          <form onSubmit={tab === 'compras' ? createPurchase : createRequest} className="space-y-4">
            {tab === 'compras' ? <Field label="Fornecedor"><select required value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input"><option value="">Selecione</option>{suppliers.data?.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field> : <>
              <Field label="Origem"><select value={originId} onChange={e => setOriginId(e.target.value)} className="input"><option value="">Estoque central</option>{stocks.data?.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>
              <Field label="Destino"><select required value={destinationId} onChange={e => setDestinationId(e.target.value)} className="input"><option value="">Selecione</option>{stocks.data?.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>
            </>}
            <Field label="Insumo"><select required value={supplyId} onChange={e => setSupplyId(e.target.value)} className="input"><option value="">Selecione</option>{supplies.data?.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select>{selectedSupply && <p className="mt-1 text-xs text-slate-500">Saldo: {quantity(selectedSupply.saldoAtual, selectedSupply.unidade)}</p>}</Field>
            <Field label={`Quantidade${selectedSupply ? ` (${selectedSupply.unidade})` : ''}`}><input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="input" /></Field>
            {tab === 'compras' && <><Field label="Custo unitário previsto"><input required inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} className="input" /></Field><Field label="Previsão de entrega"><input required type="date" value={forecast} onChange={e => setForecast(e.target.value)} className="input" /></Field></>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-50"><Plus className="h-4 w-4" />Criar {tab === 'compras' ? 'compra' : 'requisição'}</button>
          </form>
        </aside>
      </div>

      {receiving && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><form onSubmit={receivePurchase} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black text-slate-950">Receber CMP-{String(receiving.id).padStart(6, '0')}</h2><p className="mt-1 text-sm text-slate-600">O saldo pendente de todos os itens será recebido pelo custo previsto.</p><div className="mt-5 space-y-4"><Field label="Documento / nota"><input value={document} onChange={e => setDocument(e.target.value)} className="input" /></Field><Field label="Motivo de divergência (se houver)"><textarea value={divergenceReason} onChange={e => setDivergenceReason(e.target.value)} className="input min-h-20" /></Field></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setReceiving(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Voltar</button><button disabled={busy} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white">Confirmar recebimento</button></div></form></div>}

      <style jsx>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.7rem .8rem;color:#0f172a;background:white;outline:none}.input:focus{border-color:#f97316;box-shadow:0 0 0 3px #fed7aa}.action{display:inline-flex;align-items:center;gap:.4rem;border:1px solid #cbd5e1;border-radius:.65rem;padding:.55rem .75rem;font-size:.8rem;font-weight:800;color:#334155;background:white}.action.primary{border-color:#ea580c;background:#ea580c;color:white}`}</style>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{children}</label> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div> }
