'use client'

import Link from '@/app/components/TenantLink'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ClipboardList, LoaderCircle, Minus, Plus, Search, ShoppingCart, Star, Store, Trash2, UserRound, X } from 'lucide-react'
import { ProductOptionsModal } from '@/components/ProductOptionsModal'
import { PaymentModal } from '@/components/PaymentModal'
import { useBranding } from '@/app/contexts/BrandingContext'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch, fetchAllList, redirectToLogin } from '@/app/lib/api'
import type { CartItem, Categoria, Produto } from '@/types'

type CounterProduct = Produto & { codigo?: string | null; favoritoOperador?: boolean; ultimoUsoOperador?: string | null }
type CounterCategory = Omit<Categoria, 'produtos'> & { produtos: CounterProduct[] }
type CounterCustomer = { id: number; nome: string; telefone?: string | null; documento?: string | null }

export default function CounterPage() {
  const { branding } = useBranding()
  const searchParams = useSearchParams()
  const moduleEnabled = branding.modulosAtivos.includes('BALCAO')
  const { showToast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [categories, setCategories] = useState<CounterCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<CounterProduct | null>(null)
  const [currentComandaId, setCurrentComandaId] = useState<number | null>(() => {
    const value = Number(searchParams.get('atendimento'))
    return Number.isInteger(value) && value > 0 ? value : null
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [canCreate, setCanCreate] = useState(false)
  const [canPay, setCanPay] = useState(false)
  const [canDiscount, setCanDiscount] = useState(false)
  const [canCourtesy, setCanCourtesy] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [customer, setCustomer] = useState<CounterCustomer | null>(null)
  const [showCustomers, setShowCustomers] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<CounterCustomer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [showCourtesy, setShowCourtesy] = useState(false)
  const [courtesyReason, setCourtesyReason] = useState('')
  const [grantingCourtesy, setGrantingCourtesy] = useState(false)

  useEffect(() => {
    if (!moduleEnabled) {
      setLoading(false)
      return
    }
    let active = true
    Promise.all([
      fetchAllList<CounterCategory>('/categories?ativo=true&garcom=true&canal=BALCAO&sort=ordem&order=asc'),
      apiFetch<{ user?: { permissions?: string[] } }>('/auth/me'),
    ]).then(([catalog, session]) => {
      if (!active) return
      setCategories(catalog)
      const permissions = session.user?.permissions ?? []
      setCanCreate(permissions.includes('pedidos.criar'))
      setCanPay(permissions.includes('pagamentos.abrir') && permissions.includes('pagamentos.registrar'))
      setCanDiscount(permissions.includes('pagamentos.desconto'))
      setCanCourtesy(permissions.includes('pedidos.cortesia'))
    }).catch(() => redirectToLogin()).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [moduleEnabled])

  useEffect(() => {
    if (!currentComandaId) return
    void apiFetch<{ cliente?: CounterCustomer | null }>(`/orders/counter/${currentComandaId}`)
      .then(order => setCustomer(order.cliente ?? null))
      .catch(() => undefined)
  }, [currentComandaId])

  useEffect(() => {
    if (!showCustomers) return
    const timer = window.setTimeout(() => {
      setLoadingCustomers(true)
      apiFetch<{ data: CounterCustomer[] }>(`/clients?page=1&pageSize=25&search=${encodeURIComponent(customerSearch)}`)
        .then(response => setCustomers(response.data))
        .catch(error => showToast(error instanceof Error ? error.message : 'Não foi possível buscar clientes.', 'error'))
        .finally(() => setLoadingCustomers(false))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [customerSearch, showCustomers, showToast])

  const selectCustomer = async (selected: CounterCustomer | null) => {
    try {
      if (currentComandaId) await apiFetch(`/orders/counter/${currentComandaId}/customer`, { method: 'PATCH', body: { clienteId: selected?.id ?? null } })
      setCustomer(selected)
      setShowCustomers(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível identificar o cliente.', 'error')
    }
  }

  const grantCourtesy = async () => {
    if (!currentComandaId || courtesyReason.trim().length < 5) return
    setGrantingCourtesy(true)
    try {
      await apiFetch(`/orders/counter/${currentComandaId}/courtesy`, { method: 'POST', body: { motivo: courtesyReason.trim() } })
      showToast(`Atendimento #${currentComandaId} encerrado como cortesia.`, 'success')
      setShowCourtesy(false)
      setCourtesyReason('')
      setCurrentComandaId(null)
      setCustomer(null)
      setCart([])
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível registrar a cortesia.', 'error')
    } finally {
      setGrantingCourtesy(false)
    }
  }

  const products = useMemo(() => categories.flatMap(category => (
    category.produtos.map(product => ({ ...product, setor: category.setor } as CounterProduct))
  )), [categories])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return products.filter(product => {
      const byCategory = selectedCategory === 'all' || String(product.categoriaId) === selectedCategory
      const bySearch = !term || product.nome.toLocaleLowerCase('pt-BR').includes(term) || product.codigo?.toLocaleLowerCase('pt-BR').includes(term)
      return byCategory && bySearch
    }).sort((a, b) => Number(Boolean(b.favoritoOperador)) - Number(Boolean(a.favoritoOperador))
      || new Date(b.ultimoUsoOperador ?? 0).getTime() - new Date(a.ultimoUsoOperador ?? 0).getTime())
  }, [products, search, selectedCategory])

  const toggleFavorite = async (product: CounterProduct) => {
    const favorito = !product.favoritoOperador
    try {
      await apiFetch(`/products/${product.id}/favorite`, { method: 'PATCH', body: { favorito } })
      setCategories(current => current.map(category => ({
        ...category,
        produtos: category.produtos.map(item => item.id === product.id ? { ...item, favoritoOperador: favorito } : item),
      })))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível alterar o favorito.', 'error')
    }
  }

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0), [cart])

  const addSimpleProduct = useCallback((product: CounterProduct) => {
    const needsOptions = product.tipo === 'POR_TAMANHO' || product.tipoOpcao !== 'padrao' || (product.gruposComplemento?.length ?? 0) > 0
    if (needsOptions) {
      setSelectedProduct(product)
      return
    }
    setCart(current => {
      const index = current.findIndex(item => item.produtoId === product.id && !item.observacao)
      if (index < 0) return [...current, {
        produtoId: product.id,
        nome: product.nome,
        preco: Number(product.valorPromo ?? product.preco),
        quantidade: 1,
        observacao: '',
        setor: product.setor ?? 'GERAL',
      }]
      return current.map((item, itemIndex) => itemIndex === index ? { ...item, quantidade: item.quantidade + 1 } : item)
    })
  }, [])

  function confirmOptions(
    quantity: number,
    observation: string,
    _options: string[],
    finalPrice: number,
    extraItems?: Array<{ quantity: number; observation: string; preco: number }>,
    choices?: { tamanhoId?: number; tamanhoNome?: string; sabor?: string; complementos?: Array<{ complementoId: number }> },
  ) {
    if (!selectedProduct) return
    const additions: CartItem[] = []
    if (quantity > 0) additions.push({
      produtoId: selectedProduct.id,
      nome: selectedProduct.nome,
      preco: finalPrice,
      quantidade: quantity,
      observacao: observation,
      tamanhoId: choices?.tamanhoId,
      tamanhoNome: choices?.tamanhoNome,
      sabor: choices?.sabor,
      complementos: choices?.complementos,
      setor: selectedProduct.setor ?? 'GERAL',
    })
    for (const item of extraItems ?? []) additions.push({
      produtoId: selectedProduct.id,
      nome: selectedProduct.nome,
      preco: item.preco,
      quantidade: item.quantity,
      observacao: item.observation,
      setor: selectedProduct.setor ?? 'GERAL',
    })
    setCart(current => [...current, ...additions])
    setSelectedProduct(null)
  }

  const submit = useCallback(async () => {
    if (cart.length === 0 || submittingRef.current || !canCreate) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const response = await apiFetch<{ comandaId: number; pedidoId: number; replayed: boolean }>('/orders/counter', {
        method: 'POST',
        body: {
          ...(currentComandaId ? { comandaId: currentComandaId } : {}),
          ...(!currentComandaId && customer ? { clienteId: customer.id } : {}),
          itens: cart.map(item => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            tamanhoId: item.tamanhoId,
            sabor: item.sabor,
            complementos: item.complementos,
            observacao: item.observacao,
          })),
        },
      })
      setCurrentComandaId(response.comandaId)
      setCart([])
      showToast(`Pedido #${response.pedidoId} enviado para produção.`, 'success')
      searchRef.current?.focus()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível enviar o pedido.', 'error')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [canCreate, cart, currentComandaId, customer, showToast])

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'F4') {
        event.preventDefault()
        void submit()
      }
    }
    window.addEventListener('keydown', shortcuts)
    return () => window.removeEventListener('keydown', shortcuts)
  }, [submit])

  if (!moduleEnabled) return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center p-6">
      <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <Store className="mx-auto text-amber-700" size={38} />
        <h1 className="mt-4 text-2xl font-black text-slate-900">Balcão não habilitado</h1>
        <p className="mt-2 text-sm text-slate-600">Ative o módulo BALCAO no Painel ControlaÊ para este estabelecimento.</p>
      </section>
    </main>
  )

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><LoaderCircle className="animate-spin text-orange-600" /></div>

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Atendimento multicanal</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Balcão / PDV</h1>
          <p className="mt-1 text-sm text-slate-500">F2 busca · F4 envia o pedido</p>
        </div>
        <div className="flex items-center gap-2">
          {currentComandaId && <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800">Atendimento #{currentComandaId}</span>}
          <button type="button" onClick={() => setShowCustomers(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-700"><UserRound size={17} /> {customer?.nome ?? 'Identificar cliente'}</button>
          {currentComandaId && <button onClick={() => setShowPayment(true)} disabled={!canPay || cart.length > 0} title={cart.length > 0 ? 'Envie os itens antes de receber' : 'Receber atendimento'} className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Receber</button>}
          {currentComandaId && canCourtesy && <button type="button" onClick={() => setShowCourtesy(true)} disabled={cart.length > 0} title={cart.length > 0 ? 'Envie os itens antes da cortesia' : 'Registrar cortesia total'} className="h-11 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-black text-violet-700 hover:bg-violet-100 disabled:opacity-50">Cortesia</button>}
          <Link href="/balcao/pedidos" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-700">
            <ClipboardList size={18} /> Pedidos <ArrowRight size={16} />
          </Link>
          <button onClick={() => { setCurrentComandaId(null); setCustomer(null); setCart([]) }} className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">Novo atendimento</button>
        </div>
      </header>

      {!canCreate && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">Seu usuário não possui permissão para criar pedidos.</div>}

      <div className="grid min-h-[calc(100vh-190px)] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
              <Search size={19} className="text-slate-400" />
              <input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou código (F2)" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" />
            </label>
            <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
              <option value="all">Todas as categorias</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.nome}</option>)}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {filteredProducts.map(product => (
              <article key={product.id} className="relative min-h-28 rounded-xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50">
                <button type="button" disabled={!canCreate} onClick={() => addSimpleProduct(product)} className="h-full w-full p-3 pr-10 text-left disabled:opacity-50">
                  <span className="line-clamp-2 text-sm font-black text-slate-900">{product.nome}</span>
                  {product.codigo && <span className="mt-1 block text-[11px] font-semibold text-slate-400">{product.codigo}</span>}
                  <strong className="mt-4 block text-base text-orange-700">{Number(product.valorPromo ?? product.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </button>
                <button type="button" onClick={() => void toggleFavorite(product)} aria-label={product.favoritoOperador ? `Remover ${product.nome} dos favoritos` : `Favoritar ${product.nome}`} className={`absolute right-2 top-2 rounded-lg p-1.5 ${product.favoritoOperador ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-white hover:text-amber-600'}`}><Star size={16} fill={product.favoritoOperador ? 'currentColor' : 'none'} /></button>
              </article>
            ))}
          </div>
          {filteredProducts.length === 0 && <p className="py-16 text-center text-sm text-slate-500">Nenhum produto encontrado.</p>}
        </section>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="flex items-center gap-2"><ShoppingCart size={20} className="text-orange-600" /><h2 className="font-black text-slate-900">Pedido atual</h2></div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{cart.reduce((sum, item) => sum + item.quantidade, 0)} itens</span>
          </div>
          <div className="min-h-36 flex-1 space-y-2 overflow-y-auto p-3">
            {cart.map((item, index) => (
              <article key={`${item.produtoId}-${index}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-slate-900">{item.nome}</strong>{item.observacao && <p className="mt-1 text-xs text-slate-500">{item.observacao}</p>}</div><button onClick={() => setCart(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover ${item.nome}`} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></div>
                <div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => setCart(current => current.map((value, itemIndex) => itemIndex === index ? { ...value, quantidade: Math.max(1, value.quantidade - 1) } : value))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100"><Minus size={14} /></button><b className="w-5 text-center text-sm">{item.quantidade}</b><button onClick={() => setCart(current => current.map((value, itemIndex) => itemIndex === index ? { ...value, quantidade: value.quantidade + 1 } : value))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100"><Plus size={14} /></button></div><strong className="text-sm text-slate-900">{(item.preco * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
              </article>
            ))}
            {cart.length === 0 && <div className="flex min-h-48 flex-col items-center justify-center text-center text-slate-400"><ShoppingCart size={32} /><p className="mt-3 text-sm">Selecione produtos para iniciar.</p></div>}
          </div>
          <footer className="border-t border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between"><span className="text-sm font-bold text-slate-500">Total previsto</span><strong className="text-2xl font-black text-slate-950">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
            <button onClick={() => void submit()} disabled={cart.length === 0 || submitting || !canCreate} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <LoaderCircle className="animate-spin" size={19} /> : <ArrowRight size={19} />}Enviar pedido (F4)</button>
          </footer>
        </aside>
      </div>

      <ProductOptionsModal isOpen={selectedProduct !== null} onClose={() => setSelectedProduct(null)} product={selectedProduct} onConfirm={confirmOptions} />
      {currentComandaId && <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        counterOrderId={currentComandaId}
        canApplyDiscount={canDiscount}
        onSuccess={() => {
          setShowPayment(false)
          setCurrentComandaId(null)
          setCart([])
        }}
      />}
      {showCustomers && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="customer-title">
        <section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="customer-title" className="text-xl font-black text-slate-950">Identificar cliente</h2><p className="mt-1 text-sm text-slate-500">Vincule o atendimento para histórico e nota fiscal.</p></div><button type="button" onClick={() => setShowCustomers(false)} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header>
          <div className="p-5"><label className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-orange-400"><Search size={17} className="text-slate-400" /><input autoFocus value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="Nome, telefone ou documento" className="min-w-0 flex-1 border-0 text-sm outline-none" /></label><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{loadingCustomers ? <div className="grid h-24 place-items-center"><LoaderCircle className="animate-spin text-orange-600" /></div> : customers.map(item => <button type="button" key={item.id} onClick={() => void selectCustomer(item)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:border-orange-300 hover:bg-orange-50"><span><strong className="block text-sm text-slate-900">{item.nome}</strong><span className="mt-0.5 block text-xs text-slate-500">{item.telefone || item.documento || 'Sem contato informado'}</span></span>{customer?.id === item.id && <span className="text-xs font-black text-orange-700">Selecionado</span>}</button>)}</div></div>
          <footer className="flex justify-between border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => void selectCustomer(null)} className="text-sm font-bold text-slate-600 hover:text-red-700">Remover identificação</button><button type="button" onClick={() => setShowCustomers(false)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Concluir</button></footer>
        </section>
      </div>}
      {showCourtesy && currentComandaId && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="courtesy-title">
        <section className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="courtesy-title" className="text-xl font-black text-slate-950">Cortesia total</h2><p className="mt-1 text-sm text-slate-500">Atendimento #{currentComandaId} será encerrado sem cobrança.</p></div><button type="button" onClick={() => setShowCourtesy(false)} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header>
          <div className="p-5"><label className="block text-sm font-black text-slate-800">Motivo da cortesia<textarea autoFocus rows={4} maxLength={500} value={courtesyReason} onChange={event => setCourtesyReason(event.target.value)} placeholder="Descreva por que a cortesia foi autorizada" className="mt-2 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label><p className="mt-2 text-xs text-slate-500">A autorização ficará vinculada ao seu usuário.</p></div>
          <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setShowCourtesy(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700">Manter cobrança</button><button type="button" onClick={() => void grantCourtesy()} disabled={grantingCourtesy || courtesyReason.trim().length < 5} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{grantingCourtesy && <LoaderCircle size={16} className="animate-spin" />} Confirmar cortesia</button></footer>
        </section>
      </div>}
    </main>
  )
}
