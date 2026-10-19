'use client'

import Link from '@/app/components/TenantLink'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Ban, Clock3, Gift, LoaderCircle, Plus, Printer, ReceiptText, RefreshCw, X } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { useBranding } from '@/app/contexts/BrandingContext'
import { ActionableError } from '@/app/components/ui/ActionableError'

type CounterOrder = {
  id: number
  status: 'ABERTA' | 'FECHADA' | 'CANCELADA'
  total: number
  abertaEm: string
  fechadaEm: string | null
  usuario: { id: number; nome: string } | null
  pagamentos: Array<{ id: number; tipo: string; valor: number }>
  pedidos: Array<{
    id: number
    itens: Array<{ id: number; quantidade: number; status: string; produto: { nome: string } }>
  }>
}

export default function CounterOrdersPage() {
  const { branding } = useBranding()
  const enabled = branding.modulosAtivos.includes('BALCAO')
  const [orders, setOrders] = useState<CounterOrder[]>([])
  const [status, setStatus] = useState<'ABERTA' | 'FECHADA' | 'CANCELADA' | 'TODAS'>('ABERTA')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [reprintingKey, setReprintingKey] = useState<string | null>(null)
  const [cancelOrder, setCancelOrder] = useState<CounterOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState('')
  const [courtesyOrder, setCourtesyOrder] = useState<CounterOrder | null>(null)
  const [courtesyItemId, setCourtesyItemId] = useState<number | null>(null)
  const [courtesyReason, setCourtesyReason] = useState('')
  const [grantingCourtesy, setGrantingCourtesy] = useState(false)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch<{ data: CounterOrder[] }>(`/orders/counter?status=${status}&pageSize=100`)
      setOrders(response.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os atendimentos.')
    } finally {
      setLoading(false)
    }
  }, [enabled, status])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let active = true
    void apiFetch<{ user?: { permissions?: string[] } }>('/auth/me')
      .then(response => { if (active) setPermissions(response.user?.permissions ?? []) })
      .catch(() => { if (active) setPermissions([]) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!cancelOrder) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !cancelling) setCancelOrder(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [cancelOrder, cancelling])

  const reprint = async (order: CounterOrder, tipo: 'PEDIDO' | 'COMPROVANTE') => {
    setReprintingKey(`${order.id}:${tipo}`)
    setError('')
    setMessage('')
    try {
      await apiFetch(`/orders/counter/${order.id}/reprint`, { method: 'POST', body: JSON.stringify({ tipo }) })
      setMessage(`${tipo === 'PEDIDO' ? 'Pedido' : 'Comprovante'} do atendimento #${order.id} enviado para a fila.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível reimprimir o atendimento.')
    } finally {
      setReprintingKey(null)
    }
  }

  const cancel = async () => {
    if (!cancelOrder || cancelReason.trim().length < 3) return
    setCancelling(true)
    setActionError('')
    try {
      await apiFetch(`/orders/counter/${cancelOrder.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ motivo: cancelReason.trim() }),
      })
      const cancelledId = cancelOrder.id
      setCancelOrder(null)
      setCancelReason('')
      setMessage(`Atendimento #${cancelledId} cancelado e valores elegíveis estornados.`)
      await load()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Não foi possível cancelar o atendimento.')
    } finally {
      setCancelling(false)
    }
  }

  const grantItemCourtesy = async () => {
    if (!courtesyOrder || !courtesyItemId || courtesyReason.trim().length < 5) return
    setGrantingCourtesy(true); setActionError('')
    try {
      await apiFetch(`/orders/counter/${courtesyOrder.id}/courtesy`, {
        method: 'POST', body: { pedidoItemId: courtesyItemId, motivo: courtesyReason.trim() },
      })
      const orderId = courtesyOrder.id
      setCourtesyOrder(null); setCourtesyItemId(null); setCourtesyReason('')
      setMessage(`Cortesia registrada no atendimento #${orderId}.`)
      await load()
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Não foi possível registrar a cortesia.')
    } finally { setGrantingCourtesy(false) }
  }

  const summary = useMemo(() => ({
    count: orders.length,
    total: orders.reduce((sum, order) => order.status === 'CANCELADA' ? sum : sum + Number(order.total), 0),
  }), [orders])

  if (!enabled) return <main className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">O módulo de balcão não está habilitado.</div></main>

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/balcao" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-orange-700"><ArrowLeft size={16} /> Voltar ao PDV</Link>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Pedidos de balcão</h1>
          <p className="mt-1 text-sm text-slate-500">Atendimentos abertos e vendas recentes sem mesa.</p>
        </div>
        <div className="flex flex-wrap gap-2">{permissions.includes('relatorios.visualizar') && <Link href="/balcao/cortesias" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 hover:border-orange-300 hover:text-orange-700"><Gift size={18} /> Relatório de cortesias</Link>}<Link href="/balcao" className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white hover:bg-orange-700"><Plus size={18} /> Novo atendimento</Link></div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Atendimentos exibidos</span><strong className="mt-1 block text-2xl text-slate-950">{summary.count}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total registrado</span><strong className="mt-1 block text-2xl text-slate-950">{summary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(['ABERTA', 'FECHADA', 'CANCELADA', 'TODAS'] as const).map(value => <button key={value} onClick={() => setStatus(value)} className={`rounded-lg px-3 py-2 text-xs font-black ${status === value ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>{value === 'ABERTA' ? 'Abertos' : value === 'FECHADA' ? 'Fechados' : value === 'CANCELADA' ? 'Cancelados' : 'Todos'}</button>)}
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-700"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
      </div>

      {error && <ActionableError error={error} fallback="Não foi possível carregar os atendimentos do balcão." onRetry={load} className="mt-4" />}
      {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
      {loading ? <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="animate-spin text-orange-600" /></div> : (
        <div className="mt-4 grid gap-3">
          {orders.map(order => {
            const items = order.pedidos.flatMap(pedido => pedido.itens).filter(item => item.status !== 'CANCELADO')
            return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-orange-700"><ReceiptText size={20} /></span><div><h2 className="font-black text-slate-950">Atendimento #{order.id}</h2><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} /> {new Date(order.abertaEm).toLocaleString('pt-BR')} · {order.usuario?.nome ?? 'Operador não informado'}</p></div></div>
                <div className="text-right"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${order.status === 'ABERTA' ? 'bg-emerald-100 text-emerald-800' : order.status === 'CANCELADA' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{order.status}</span><strong className={`mt-2 block text-lg ${order.status === 'CANCELADA' ? 'text-red-700 line-through' : 'text-slate-950'}`}>{Number(order.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-600">{items.reduce((sum, item) => sum + item.quantidade, 0)} itens · {order.pedidos.length} envio(s) à produção</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {order.status === 'ABERTA' && <Link href={`/balcao?atendimento=${order.id}`} className="rounded-lg px-3 py-2 text-sm font-black text-orange-700 hover:bg-orange-50">Continuar atendimento</Link>}
                  {order.status === 'ABERTA' && order.pagamentos.length === 0 && items.length > 0 && permissions.includes('pedidos.cortesia') && <button type="button" onClick={() => { setCourtesyOrder(order); setCourtesyItemId(items[0]?.id ?? null); setCourtesyReason(''); setActionError('') }} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-sm font-black text-violet-700 hover:bg-violet-50"><Gift size={15} /> Cortesia em item</button>}
                  {order.status !== 'CANCELADA' && permissions.includes('pedidos.editar') && items.length > 0 && <><button type="button" onClick={() => void reprint(order, 'PEDIDO')} disabled={reprintingKey !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50">{reprintingKey === `${order.id}:PEDIDO` ? <LoaderCircle size={15} className="animate-spin" /> : <Printer size={15} />} Pedido</button><button type="button" onClick={() => void reprint(order, 'COMPROVANTE')} disabled={reprintingKey !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50">{reprintingKey === `${order.id}:COMPROVANTE` ? <LoaderCircle size={15} className="animate-spin" /> : <ReceiptText size={15} />} Comprovante</button></>}
                  {order.status !== 'CANCELADA' && permissions.includes('pedidos.cancelar') && <button type="button" onClick={() => { setCancelOrder(order); setCancelReason(''); setActionError('') }} disabled={order.pagamentos.length > 0 && !permissions.includes('pagamentos.estornar')} title={order.pagamentos.length > 0 && !permissions.includes('pagamentos.estornar') ? 'O atendimento pago exige permissão para estornar pagamentos' : undefined} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"><Ban size={15} /> Cancelar</button>}
                </div>
              </div>
            </article>
          })}
          {orders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-sm text-slate-500">Nenhum atendimento neste filtro.</div>}
        </div>
      )}

      {cancelOrder && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-counter-title">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
            <div><p className="text-xs font-black uppercase tracking-wider text-red-600">Ação irreversível</p><h2 id="cancel-counter-title" className="mt-1 text-xl font-black text-slate-950">Cancelar atendimento #{cancelOrder.id}</h2></div>
            <button type="button" onClick={() => setCancelOrder(null)} disabled={cancelling} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
          </header>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm leading-6 text-slate-600">Os itens serão cancelados, o estoque será devolvido e pagamentos já registrados serão estornados. Uma NFC-e autorizada precisa ser cancelada antes.</p>
            <label className="block"><span className="text-sm font-black text-slate-800">Motivo do cancelamento</span><textarea autoFocus value={cancelReason} onChange={event => setCancelReason(event.target.value)} maxLength={500} rows={4} placeholder="Informe o que motivou o cancelamento" className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" /></label>
            <div className="flex items-center justify-between text-xs text-slate-500"><span>Mínimo de 3 caracteres</span><span>{cancelReason.trim().length}/500</span></div>
            {actionError && <ActionableError error={actionError} fallback="Não foi possível cancelar o atendimento." />}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
            <button type="button" onClick={() => setCancelOrder(null)} disabled={cancelling} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100">Manter atendimento</button>
            <button type="button" onClick={() => void cancel()} disabled={cancelling || cancelReason.trim().length < 3} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{cancelling && <LoaderCircle size={16} className="animate-spin" />} Confirmar cancelamento</button>
          </footer>
        </section>
      </div>}

      {courtesyOrder && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="courtesy-counter-title">
        <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-black uppercase tracking-wider text-orange-700">Benefício auditado</p><h2 id="courtesy-counter-title" className="mt-1 text-xl font-black text-slate-950">Cortesia no atendimento #{courtesyOrder.id}</h2></div><button type="button" onClick={() => setCourtesyOrder(null)} disabled={grantingCourtesy} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header>
          <div className="space-y-4 px-5 py-5">
            <fieldset><legend className="text-sm font-black text-slate-800">Selecione a linha completa</legend><div className="mt-2 max-h-52 space-y-2 overflow-y-auto">{courtesyOrder.pedidos.flatMap(pedido => pedido.itens).filter(item => item.status !== 'CANCELADO').map(item => <label key={item.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${courtesyItemId === item.id ? 'border-violet-400 bg-violet-50' : 'border-slate-200'}`}><span><strong className="block text-sm text-slate-900">{item.quantidade}x {item.produto.nome}</strong><span className="text-xs text-slate-500">Item #{item.id}</span></span><input type="radio" name="courtesy-item" checked={courtesyItemId === item.id} onChange={() => setCourtesyItemId(item.id)} className="h-4 w-4 accent-violet-600" /></label>)}</div></fieldset>
            <label className="block"><span className="text-sm font-black text-slate-800">Motivo da cortesia</span><textarea value={courtesyReason} onChange={event => setCourtesyReason(event.target.value)} maxLength={500} rows={3} placeholder="Ex.: recuperação de experiência do cliente" className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>
            <div className="flex items-center justify-between text-xs text-slate-500"><span>Mínimo de 5 caracteres</span><span>{courtesyReason.trim().length}/500</span></div>
            {actionError && <ActionableError error={actionError} fallback="Não foi possível registrar a cortesia." />}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setCourtesyOrder(null)} disabled={grantingCourtesy} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700">Cancelar</button><button type="button" onClick={() => void grantItemCourtesy()} disabled={grantingCourtesy || !courtesyItemId || courtesyReason.trim().length < 5} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50">{grantingCourtesy && <LoaderCircle size={16} className="animate-spin" />} Conceder cortesia</button></footer>
        </section>
      </div>}
    </main>
  )
}
