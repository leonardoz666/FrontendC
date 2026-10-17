'use client'

import { useEffect, useState, useRef, useCallback, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/contexts/ToastContext'
import type { Produto, Categoria } from '@/components/ProductCard'
import { apiFetch, apiRequest, ApiError, fetchAllList, fetchList } from '@/app/lib/api'
import { PAGE_SIZE_OPTIONS, usePagedQuery, type PageSize, type SortOrder } from '@/app/lib/pagination'
import { correctProductSectors, fetchAllProducts } from '@/app/lib/product-catalog'
import { buildProductFormData } from '@/app/lib/product-form'
import { parseFlavorSizeConfig, type FlavorSizePrice } from '@/app/lib/flavor-size-pricing'
import { InlineLoader, PageLoader } from '@/app/components/ui/PageLoader'
import { categoryForImportedItem, importCategoryKey } from '@/app/lib/menu-json-import'
import { tenantResourceUrl } from '@/app/lib/tenant-navigation'
import { 
  Plus, 
  Upload, 
  X, 
  Check,
  Pencil, 
  Download,
  Wand2,
  Printer,
  Search,
  ListFilter,
  LayoutGrid,
  Tag,
  Copy, ChartNoAxesCombined, FlaskConical, LoaderCircle, CalendarClock, Trash2
} from 'lucide-react'
import { clsx } from 'clsx'

type TipoTamanho = {
  id: number
  nome: string
  tamanhos?: Array<{ id: number; nome: string; valor: number | string; ordem: number }>
}

type Dispositivo = {
  id: number
  nome: string
  tipo: string
  ativo: boolean
}

type ComplementoGrupo = {
  id: number
  nome: string
  obrigatorio: boolean
  minEscolhas: number
  maxEscolhas: number | null
  ativo: boolean
}

type SalesHistory = {
  totalQuantidade: number
  totalValor: number
  porCanal: Array<{ canal: string; quantidade: number; valor: number }>
  porDia: Array<{ data: string; quantidade: number; valor: number }>
}

type SalesChannel = 'SALAO' | 'BALCAO' | 'DELIVERY' | 'AUTOATENDIMENTO'
type AvailabilityRule = { id?: number; diaSemana: number; inicioMinuto: number; fimMinuto: number; canal: SalesChannel; ativo: boolean }
type PromotionRule = { id?: number; valor: number | string; inicio: string; fim: string; canal: SalesChannel; prioridade: number; ativo: boolean }

const SALES_CHANNELS: Array<{ value: SalesChannel; label: string }> = [
  { value: 'SALAO', label: 'Salão' }, { value: 'BALCAO', label: 'Balcão' },
  { value: 'DELIVERY', label: 'Delivery' }, { value: 'AUTOATENDIMENTO', label: 'Autoatendimento' },
]
const WEEK_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const timeToMinutes = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
const toLocalDateTime = (value: string) => { const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16) }

function categoryColorStyle(categoryId: number, selected = false) {
  // O passo áureo distribui categorias vizinhas em matizes bem separados.
  const hue = Math.round((categoryId * 137.508) % 360)
  return {
    '--category-bg': `hsl(${hue} 82% ${selected ? '89%' : '95%'})`,
    '--category-border': `hsl(${hue} 62% ${selected ? '62%' : '84%'})`,
    '--category-text': `hsl(${hue} 68% 30%)`,
    '--category-bg-dark': `hsl(${hue} 42% ${selected ? '24%' : '18%'})`,
    '--category-border-dark': `hsl(${hue} 48% ${selected ? '52%' : '36%'})`,
    '--category-text-dark': `hsl(${hue} 82% 82%)`,
  } as CSSProperties
}

function parseStringList(value?: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []
  } catch {
    return []
  }
}

export default function ProdutosPage() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  
  // Paginação/busca/ordenação no SERVIDOR (DT-2). Antes a tela baixava a base
  // inteira e filtrava no cliente, o que não escala para o cardápio real.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [sort, setSort] = useState<string | null>(null)
  const [order, setOrder] = useState<SortOrder | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null)

  const {
    data: paginaProdutos,
    isLoading: loadingProd,
    refetch: refetchProdutos,
  } = usePagedQuery<Produto>({
    resource: categoriaFiltro
      ? `/products?view=summary&categoriaId=${categoriaFiltro}`
      : '/products?view=summary',
    page,
    pageSize,
    search: searchTerm,
    sort,
    order,
  })

  const produtos = paginaProdutos?.data ?? []
  const meta = paginaProdutos?.meta ?? { page, pageSize, total: 0, totalPages: 0 }
  const totalProdutos = meta.total

  const { data: categorias = [], isLoading: loadingCat } = useQuery<Categoria[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      // Lista completa de categorias: alimenta os selects do formulário e a
      // importação, então precisa de TODAS, não de uma página.
      return fetchAllList<Categoria>('/categories?sort=ordem&order=asc')
    }
  })

  const { data: tiposTamanho = [] } = useQuery<TipoTamanho[]>({
    queryKey: ['tipos-tamanho', 'select'],
    queryFn: async () => fetchList<TipoTamanho>('/tipos-tamanho?page=1&pageSize=100&sort=nome&order=asc')
  })

  const { data: dispositivos = [] } = useQuery<Dispositivo[]>({
    queryKey: ['dispositivos', 'select'],
    queryFn: async () => fetchList<Dispositivo>('/dispositivos?page=1&pageSize=100&ativo=true&tipo=IMPRESSORA&sort=nome&order=asc')
  })

  const { data: gruposComplemento = [] } = useQuery<ComplementoGrupo[]>({
    queryKey: ['complementos-grupos', 'select'],
    queryFn: async () => fetchList<ComplementoGrupo>('/complementos/grupos?page=1&pageSize=100&ativo=true&sort=ordem&order=asc')
  })

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(null)
  const [fixStatus, setFixStatus] = useState<string | null>(null)
  const [confirmarFixSetores, setConfirmarFixSetores] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null)
  const [historyProduct, setHistoryProduct] = useState<Produto | null>(null)
  const [salesHistory, setSalesHistory] = useState<SalesHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [rulesProduct, setRulesProduct] = useState<Produto | null>(null)
  const [availability, setAvailability] = useState<AvailabilityRule[]>([])
  const [promotions, setPromotions] = useState<PromotionRule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)
  const [savingRules, setSavingRules] = useState(false)

  const duplicateProduct = async (produto: Produto) => {
    setDuplicatingId(produto.id)
    try {
      await apiFetch(`/products/${produto.id}/duplicate`, { method: 'POST' })
      showToast(`${produto.nome} foi duplicado com novo código.`, 'success')
      await refetchProdutos()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível duplicar o produto.', 'error')
    } finally { setDuplicatingId(null) }
  }

  const openHistory = async (produto: Produto) => {
    setHistoryProduct(produto); setSalesHistory(null); setLoadingHistory(true)
    try {
      setSalesHistory(await apiFetch<SalesHistory>(`/products/${produto.id}/sales-history`))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.', 'error')
    } finally { setLoadingHistory(false) }
  }

  const openRules = async (produto: Produto) => {
    setRulesProduct(produto); setAvailability([]); setPromotions([]); setLoadingRules(true)
    try {
      const [availabilityData, promotionData] = await Promise.all([
        apiFetch<AvailabilityRule[]>(`/products/${produto.id}/availability`),
        apiFetch<PromotionRule[]>(`/products/${produto.id}/promotions`),
      ])
      setAvailability(availabilityData)
      setPromotions(promotionData.map(item => ({ ...item, inicio: toLocalDateTime(item.inicio), fim: toLocalDateTime(item.fim) })))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar as regras comerciais.', 'error')
      setRulesProduct(null)
    } finally { setLoadingRules(false) }
  }

  const saveRules = async () => {
    if (!rulesProduct) return
    setSavingRules(true)
    try {
      await Promise.all([
        apiFetch(`/products/${rulesProduct.id}/availability`, { method: 'PUT', body: { regras: availability.map(({ diaSemana, inicioMinuto, fimMinuto, canal, ativo }) => ({ diaSemana, inicioMinuto, fimMinuto, canal, ativo })) } }),
        apiFetch(`/products/${rulesProduct.id}/promotions`, { method: 'PUT', body: { promocoes: promotions.map(({ valor, inicio, fim, canal, prioridade, ativo }) => ({ valor: Number(valor), inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), canal, prioridade, ativo })) } }),
      ])
      showToast(`Regras comerciais de ${rulesProduct.nome} salvas.`, 'success')
      setRulesProduct(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar as regras comerciais.', 'error')
    } finally { setSavingRules(false) }
  }

  const alternarAtivo = async (produto: Produto, ativo: boolean) => {
    await apiFetch(`/products/${produto.id}/visibilidade-garcom`, {
      method: 'PATCH',
      body: { visivelGarcom: ativo },
    })
    await queryClient.invalidateQueries({ queryKey: ['products'] })
    void refetchProdutos()
    showToast(
      ativo
        ? `${produto.nome} foi ativado e agora aparece para o garçom.`
        : `${produto.nome} foi desativado e ocultado do garçom.`,
      'success'
    )
  }

  const handleFixSectors = async () => {
    setConfirmarFixSetores(false)
    setFixStatus('Carregando todos os produtos...')
    try {
      const { updated, failed } = await correctProductSectors(total => {
        setFixStatus(`Corrigindo setores de ${total} produtos...`)
      })
      setFixStatus(`Correção concluída: ${updated} atualizados, ${failed} falhas`)
      if (updated > 0) showToast(`${updated} produtos corrigidos com sucesso!`, 'success')
      if (failed > 0) showToast(`${failed} falhas durante a correção.`, 'warning')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      void refetchProdutos()
      setTimeout(() => setFixStatus(null), 5000)
    } catch {
      setFixStatus(null)
      showToast('Falha ao corrigir os setores dos produtos.', 'error')
    }
  }

  // Form States
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [valorPromo, setValorPromo] = useState('')
  const [custo, setCusto] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [tipo, setTipo] = useState<'COMUM' | 'POR_TAMANHO'>('COMUM')
  const [tipoTamanhoId, setTipoTamanhoId] = useState('')
  const [dispositivoIds, setDispositivoIds] = useState<number[]>([])
  const [impressorasModalAberto, setImpressorasModalAberto] = useState(false)
  const [impressorasRascunho, setImpressorasRascunho] = useState<number[]>([])
  const [ordemProduto, setOrdemProduto] = useState('0')
  const [ativo, setAtivo] = useState(true)
  const [foto, setFoto] = useState<string | undefined>(undefined)
  const [file, setFile] = useState<File | null>(null)
  const [tipoOpcao, setTipoOpcao] = useState<'padrao' | 'tamanho_pg' | 'refrigerante' | 'sabores' | 'sabores_com_tamanho' | 'combinado'>('padrao')
  const [sabores, setSabores] = useState<string[]>([])
  const [usarPrecosSaborTamanho, setUsarPrecosSaborTamanho] = useState(false)
  const [precosSaborTamanho, setPrecosSaborTamanho] = useState<Record<string, string>>({})
  const [newSabor, setNewSabor] = useState('')
  const [observacoes, setObservacoes] = useState<string[]>([])
  const [newObservacao, setNewObservacao] = useState('')
  const [isDrink, setIsDrink] = useState(false)
  const [isFood, setIsFood] = useState(true)
  const [favorito, setFavorito] = useState(false)
  const [destaque, setDestaque] = useState(false)
  const [controlaEstoque, setControlaEstoque] = useState(false)
  const [autoatendimento, setAutoatendimento] = useState(false)
  const [fiscal, setFiscal] = useState(false)
  const [gruposComplementoIds, setGruposComplementoIds] = useState<number[]>([])
  const [ncm, setNcm] = useState('')
  const [cfop, setCfop] = useState('')
  const [cstCsosn, setCstCsosn] = useState('')
  const [aliquotaIcms, setAliquotaIcms] = useState('')
  const [permitirObservacao, setPermitirObservacao] = useState(true)
  const [permiteGeloLimao, setPermiteGeloLimao] = useState(false)

  const [, setError] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Effect to set default category
  useEffect(() => {
    if (categorias.length > 0 && !categoriaId && !editingId) {
      setCategoriaId(categorias[0].id.toString())
    }
  }, [categorias, categoriaId, editingId])

  // A busca agora é feita no SERVIDOR (dentro de `usePagedQuery`), com debounce de
  // 300ms. O filtro client-side que existia aqui foi removido de propósito: ele
  // só enxergava a página carregada e esconderia produtos das outras páginas.

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddSabor = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSabor && !sabores.includes(newSabor)) {
      setSabores([...sabores, newSabor])
      setNewSabor('')
    }
  }

  const handleRemoveSabor = (saborToRemove: string) => {
    setSabores(sabores.filter(s => s !== saborToRemove))
  }

  const handleAddObservacao = (event: React.FormEvent) => {
    event.preventDefault()
    const observacao = newObservacao.trim()
    if (!observacao || observacoes.some((item) => item.toLocaleLowerCase('pt-BR') === observacao.toLocaleLowerCase('pt-BR'))) return
    setObservacoes([...observacoes, observacao])
    setNewObservacao('')
    setPermitirObservacao(true)
  }

  const handleRemoveObservacao = (observacao: string) => {
    setObservacoes(observacoes.filter((item) => item !== observacao))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!nome) return

    const tamanhosDaTabela = tiposTamanho.find(item => String(item.id) === tipoTamanhoId)?.tamanhos ?? []
    const usaMatriz = tipo === 'POR_TAMANHO' && tipoOpcao === 'sabores_com_tamanho' && usarPrecosSaborTamanho
    const matriz: FlavorSizePrice[] = usaMatriz
      ? tamanhosDaTabela.flatMap(tamanho => sabores.flatMap(sabor => {
          const valor = Number((precosSaborTamanho[`${tamanho.id}:${sabor}`] ?? '').replace(',', '.'))
          return Number.isFinite(valor) && valor > 0 ? [{ tamanhoId: tamanho.id, sabor, valor }] : []
        }))
      : []
    if (usaMatriz && (tamanhosDaTabela.length === 0 || matriz.length !== tamanhosDaTabela.length * sabores.length)) {
      showToast('Preencha um preço maior que zero para cada combinação de tamanho e sabor.', 'warning')
      return
    }

    try {
      const url = editingId ? `/products/${editingId}` : '/products'
      const method = editingId ? 'PUT' : 'POST'

      const formData = buildProductFormData({
        nome, codigo, descricao, preco, valorPromo, custo, categoriaId, tipo,
        tipoTamanhoId, dispositivoIds, ordemProduto, ativo, file, tipoOpcao,
        sabores, precosSaborTamanho: matriz, observacoes, isDrink, isFood, favorito, destaque, controlaEstoque,
        autoatendimento, fiscal, ncm, cfop, cstCsosn, aliquotaIcms,
        permitirObservacao, permiteGeloLimao, gruposComplementoIds,
      })

      await apiFetch(url, {
        method,
        body: formData
      })

      showToast(editingId ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!', 'success')
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['products'] })
    void refetchProdutos()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar produto')
      showToast('Erro ao salvar produto. Tente novamente.', 'error')
    }
  }

  const resetForm = () => {
    setNome('')
    setCodigo('')
    setDescricao('')
    setPreco('')
    setValorPromo('')
    setCusto('')
    setAtivo(true)
    setEditingId(null)
    setIsAdding(false)
    setTipo('COMUM')
    setTipoTamanhoId('')
    setDispositivoIds([])
    setImpressorasModalAberto(false)
    setOrdemProduto('0')
    setFoto(undefined)
    setFile(null)
    setTipoOpcao('padrao')
    setSabores([])
    setUsarPrecosSaborTamanho(false)
    setPrecosSaborTamanho({})
    setNewSabor('')
    setObservacoes([])
    setNewObservacao('')
    setIsDrink(false)
    setIsFood(true)
    setFavorito(false)
    setDestaque(false)
    setControlaEstoque(false)
    setAutoatendimento(false)
    setFiscal(false)
    setGruposComplementoIds([])
    setNcm('')
    setCfop('')
    setCstCsosn('')
    setAliquotaIcms('')
    setPermitirObservacao(true)
    setPermiteGeloLimao(false)
    setError('')
    if (categorias.length > 0) setCategoriaId(categorias[0].id.toString())
  }

  const handleNewProduct = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleSortSelect = (value: string) => {
    if (!value) {
      setSort(null)
      setOrder(null)
    } else {
      const [campo, direcao] = value.split(':') as [string, SortOrder]
      setSort(campo)
      setOrder(direcao)
    }
    setPage(1)
  }

  const handleEdit = useCallback((prod: Produto) => {
    setEditingId(prod.id)
    setIsAdding(true)
    setNome(prod.nome)
    setCodigo(prod.codigo ?? '')
    setDescricao(prod.descricao ?? '')
    setPreco(prod.preco.toString())
    setValorPromo(prod.valorPromo === null || prod.valorPromo === undefined ? '' : String(prod.valorPromo))
    setCusto(prod.custo === null || prod.custo === undefined ? '' : String(prod.custo))
    setCategoriaId(prod.categoriaId ? prod.categoriaId.toString() : (categorias[0]?.id.toString() || ''))
    setTipo(prod.tipo ?? 'COMUM')
    setTipoTamanhoId(prod.tipoTamanhoId ? String(prod.tipoTamanhoId) : '')
    setDispositivoIds(
      prod.impressoras?.length
        ? prod.impressoras.map(vinculo => vinculo.dispositivoId)
        : prod.dispositivoId ? [prod.dispositivoId] : []
    )
    setOrdemProduto(prod.ordem === undefined || prod.ordem === null ? '0' : String(prod.ordem))
    setAtivo(prod.ativo)
    setFoto(prod.foto)
    setTipoOpcao((prod.tipoOpcao as Produto['tipoOpcao']) || 'padrao')
    
    const configuracaoSabores = parseFlavorSizeConfig(prod.sabores)
    setSabores(configuracaoSabores.sabores)
    setUsarPrecosSaborTamanho(configuracaoSabores.precos.length > 0)
    setPrecosSaborTamanho(Object.fromEntries(
      configuracaoSabores.precos.map(item => [`${item.tamanhoId}:${item.sabor}`, String(item.valor)])
    ))
    setObservacoes(parseStringList(prod.observacoes))
    setNewObservacao('')
    
    setIsDrink(prod.isDrink || false)
    setIsFood(prod.isFood !== undefined ? prod.isFood : true)
    setFavorito(prod.favorito || false)
    setDestaque(prod.destaque || false)
    setControlaEstoque(prod.controlaEstoque || false)
    setAutoatendimento(prod.autoatendimento || false)
    setFiscal(prod.fiscal || false)
    setGruposComplementoIds((prod.gruposComplemento ?? []).map((vinculo) => vinculo.grupoId))
    setNcm(prod.ncm ?? '')
    setCfop(prod.cfop ?? '')
    setCstCsosn(prod.cstCsosn ?? '')
    setAliquotaIcms(prod.aliquotaIcms === null || prod.aliquotaIcms === undefined ? '' : String(prod.aliquotaIcms))
    setPermitirObservacao(prod.permitirObservacao !== undefined ? prod.permitirObservacao : true)
    setPermiteGeloLimao(prod.permiteGeloLimao || false)
    setFile(null)
    setError('')
  }, [categorias])

  const confirmDelete = async () => {
    if (deleteConfirmationId) {
      try {
        const res = await apiRequest(`/products/${deleteConfirmationId}`, { method: 'DELETE' })
        
        if (res.status === 200) {
          const data = await res.json()
          showToast(data.message || 'Produto desativado (possui histórico).', 'warning')
        } else if (res.status === 204) {
          showToast('Produto excluído permanentemente!', 'success')
        } else {
          throw new Error('Erro ao excluir')
        }
        
        queryClient.invalidateQueries({ queryKey: ['products'] })
    void refetchProdutos()
        setDeleteConfirmationId(null)
      } catch (err) {
        console.error(err)
        showToast('Erro ao excluir produto.', 'error')
      }
    }
  }

  const handleExport = async () => {
    try {
      setImportStatus('Carregando todo o cardápio...')
      const allProducts = await fetchAllProducts()
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        items: allProducts.map(p => {
          const configuracao = parseFlavorSizeConfig(p.sabores)
          return {
            ...p,
            sabores: configuracao.precos.length > 0
              ? { versao: 2, sabores: configuracao.sabores, precos: configuracao.precos }
              : configuracao.sabores,
            observacoes: parseStringList(p.observacoes),
          }
        })
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cardapio.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      showToast('Falha ao exportar o cardápio.', 'error')
    } finally {
      setImportStatus(null)
    }
  }

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setImportStatus('Lendo arquivo...')
      const text = await file.text()
      const json = JSON.parse(text)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []
      
      if (!items.length) {
        setImportStatus('Arquivo inválido ou vazio')
        return
      }

      const existingProducts = await fetchAllProducts()
      const existingByName = new Map(existingProducts.map(product => [product.nome.toLowerCase(), product.id]))
      const selectedCategory = categorias.find(category => String(category.id) === categoriaId)
      const categoryIdsByName = new Map(categorias.map(category => [importCategoryKey(category.nome), category.id]))
      const categoriesById = new Map(categorias.map(category => [category.id, category]))
      const reactivatedCategoryIds = new Set<number>()

      const ensureImportedCategory = async (item: unknown): Promise<number> => {
        const descriptor = categoryForImportedItem(
          item,
          selectedCategory
            ? {
                id: selectedCategory.id,
                nome: selectedCategory.nome,
                setor: selectedCategory.setor ?? 'COZINHA',
                imagem: selectedCategory.imagem,
                ordem: selectedCategory.ordem,
              }
            : undefined,
        )
        const key = importCategoryKey(descriptor.nome)
        const existingId = categoryIdsByName.get(key)
        if (existingId !== undefined) {
          const existing = categoriesById.get(existingId)
          if (existing?.ativo === false && !reactivatedCategoryIds.has(existingId)) {
            await apiFetch(`/categories/${existingId}/ativo`, { method: 'PATCH', body: { ativo: true } })
            reactivatedCategoryIds.add(existingId)
          }
          return existingId
        }

        const created = await apiFetch<Categoria>('/categories', {
          method: 'POST',
          body: {
            nome: descriptor.nome,
            setor: descriptor.setor,
            imagem: descriptor.imagem,
            ordem: descriptor.ordem,
          },
        })
        categoryIdsByName.set(key, created.id)
        categoriesById.set(created.id, created)
        return created.id
      }

      let added = 0
      let updated = 0
      let failed = 0

      for (const i of items) {
        try {
          const existingId = existingByName.get(i.nome.toLowerCase())
          const importedCategoryId = await ensureImportedCategory(i)
          
          const formData = new FormData()
          formData.append('nome', i.nome)
          
          let price = 0
          if (typeof i.preco === 'number') {
            price = i.preco
          } else if (typeof i.preco === 'string') {
            price = parseFloat(i.preco.replace(',', '.')) || 0
          }
          formData.append('preco', String(price))

          formData.append('categoriaId', String(importedCategoryId))
          formData.append('ativo', 'true')
          formData.append('tipo', i.tipo || 'COMUM')
          if (i.tipoTamanhoId) formData.append('tipoTamanhoId', String(i.tipoTamanhoId))
          if (i.foto) formData.append('foto', i.foto) // Note: Base64 might need handling on server if direct string
          formData.append('tipoOpcao', i.tipoOpcao || (i.temOpcaoTamanho ? 'tamanho_pg' : 'padrao'))
          
          const saboresJson = typeof i.sabores === 'string'
            ? i.sabores
            : JSON.stringify(i.sabores ?? [])
          formData.append('sabores', saboresJson)
          const observacoesJson = i.observacoes
            ? JSON.stringify(Array.isArray(i.observacoes) ? i.observacoes : parseStringList(i.observacoes))
            : '[]'
          formData.append('observacoes', observacoesJson)
          
          formData.append('isDrink', String(!!i.isDrink))
          formData.append('isFood', String(i.isFood !== undefined ? i.isFood : true))
          formData.append('favorito', String(!!i.favorito))
          formData.append('permitirObservacao', String(i.permitirObservacao !== undefined ? i.permitirObservacao : true))
          formData.append('permiteGeloLimao', String(!!i.permiteGeloLimao))

          const url = existingId ? `/products/${existingId}` : '/products'
          const method = existingId ? 'PUT' : 'POST'

          const saved = await apiFetch<{ id: number }>(url, {
            method,
            body: formData
          })
          if (existingId) {
            updated++
          } else {
            added++
            existingByName.set(i.nome.toLowerCase(), saved.id)
          }
        } catch (e) {
          if (e instanceof ApiError && e.isUnauthorized) throw e
          console.error(e)
          failed++
        }
      }

      setImportStatus(`Importação concluída: ${added} adicionados, ${updated} atualizados, ${failed} falhas`)
      if (added > 0 || updated > 0) showToast(`Importação concluída: ${added} novos, ${updated} atualizados.`, 'success')
      if (failed > 0) showToast(`${failed} itens falharam na importação.`, 'warning')

      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      void refetchProdutos()
      e.target.value = '' 
    } catch (err) {
      console.error(err)
      setImportStatus('Falha ao importar arquivo')
      showToast('Falha crítica ao importar arquivo.', 'error')
    }
  }

  const columns: Array<DataTableColumn<Produto>> = [
    {
      key: 'produto',
      header: 'Produto',
      sortKey: 'nome',
      render: (produto) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {produto.foto ? (
              <Image
                src={tenantResourceUrl(produto.foto)}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
                unoptimized={produto.foto.startsWith('/uploads') || produto.foto.startsWith('data:')}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                {produto.nome.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-sm text-slate-900">{produto.nome}</strong>
            {produto.codigo && <span className="block truncate text-xs text-slate-500">{produto.codigo}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (produto) => (
        produto.categoria ? (
          <span
            className="controlae-category-color inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
            style={categoryColorStyle(produto.categoria.id)}
          >
            {produto.categoria.nome}
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Sem categoria
          </span>
        )
      ),
      hideOnMobile: true,
    },
    {
      key: 'preco',
      header: 'Preço',
      sortKey: 'preco',
      render: (produto) => produto.tipo === 'POR_TAMANHO'
        ? <span className="text-sm font-medium text-slate-600">Por tamanho</span>
        : <span className="text-sm font-semibold text-slate-700">{Number(produto.valorPromo ?? produto.preco ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>,
      hideOnMobile: true,
    },
    {
      key: 'visivelGarcom',
      header: 'Garçom',
      align: 'center',
      render: (produto) => (
        <Switch
          checked={produto.ativo}
          onCheckedChange={(ativo) => alternarAtivo(produto, ativo)}
          label={`${produto.nome}: ativar ou desativar para o garçom`}
          size="sm"
          className="justify-center gap-0 [&>span]:sr-only"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (produto) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${produto.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${produto.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
          {produto.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ]

  if (loadingProd || loadingCat) {
    return <PageLoader message="Carregando produtos" detail="Preparando o cardápio" />
  }

  return (
    <div className="min-h-screen pb-32 bg-gray-50 relative">
      <header className="sticky top-14 z-40 space-y-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md md:top-0">
        <div className="grid gap-2 lg:grid-cols-[minmax(20rem,1fr)_auto] lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar produto, código ou categoria..."
              aria-label="Buscar produto, código ou categoria"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
          <label className="relative min-w-[11rem]">
            <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" aria-hidden="true" />
            <select
              value={sort && order ? `${sort}:${order}` : ''}
              onChange={(event) => handleSortSelect(event.target.value)}
              aria-label="Ordenar produtos"
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Ordenar por</option>
              <option value="nome:asc">Nome: A–Z</option>
              <option value="nome:desc">Nome: Z–A</option>
              <option value="preco:asc">Menor preço</option>
              <option value="preco:desc">Maior preço</option>
              <option value="ultimoUso:desc">Mais recentes</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">⌄</span>
          </label>

          <button
            type="button"
            onClick={handleNewProduct}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-95"
          >
            <Plus size={18} />
            Novo Produto
          </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide xl:pb-0">
            <button
              type="button"
              onClick={() => {
                setCategoriaFiltro(null)
                setPage(1)
              }}
              className={clsx(
                'flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition',
                categoriaFiltro === null
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              <LayoutGrid size={15} />
              Todos
            </button>
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() => {
                  setCategoriaFiltro(categoria.id)
                  setPage(1)
                }}
                className={clsx(
                  'controlae-category-color flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition',
                  categoriaFiltro === categoria.id
                    ? 'shadow-sm ring-1 ring-current/20'
                    : 'hover:brightness-95'
                )}
                style={categoryColorStyle(categoria.id, categoriaFiltro === categoria.id)}
              >
                <Tag size={14} />
                {categoria.nome}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setConfirmarFixSetores(true)}
              title="Auto-corrigir setores (Cozinha/Bar) de TODO o cardápio"
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              <Wand2 size={15} />
              Autocorrigir
            </button>
            <button
              onClick={handleExport}
              title="Exportar cardápio (JSON)"
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              <Download size={15} />
              Exportar
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              title="Importar cardápio (JSON)"
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              <Upload size={15} />
              Importar
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFileChange}
            />

            <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Exibir</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as PageSize)
                setPage(1)
              }}
              aria-label="Resultados por página"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <span>resultados</span>
            </div>
          </div>
        </div>
      </header>

      {(importStatus || fixStatus) && (
        <div className="px-4">
          <div className="mt-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2">
            {(importStatus || fixStatus)?.endsWith('...')
              ? <InlineLoader message={(importStatus || fixStatus || '').replace(/\.\.\.$/, '')} />
              : importStatus || fixStatus}
          </div>
        </div>
      )}

      <div className="p-4">
        <DataTable
          columns={columns}
          data={produtos}
          getRowId={(produto) => produto.id}
          meta={meta}
          loading={loadingProd}
          showControls={false}
          rowActions={{
            extra: (produto) => <div className="flex items-center gap-1">
              <button type="button" onClick={() => void duplicateProduct(produto)} disabled={duplicatingId !== null} title="Duplicar produto" aria-label={`Duplicar ${produto.nome}`} className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-40">{duplicatingId === produto.id ? <LoaderCircle size={16} className="animate-spin" /> : <Copy size={16} />}</button>
              <button type="button" onClick={() => void openHistory(produto)} title="Histórico de vendas" aria-label={`Histórico de vendas de ${produto.nome}`} className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-700"><ChartNoAxesCombined size={16} /></button>
              <button type="button" onClick={() => void openRules(produto)} title="Disponibilidade e promoções" aria-label={`Regras comerciais de ${produto.nome}`} className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-700"><CalendarClock size={16} /></button>
              <Link href={`/admin/estoque/ficha-tecnica?produtoId=${produto.id}`} title="Abrir ficha técnica" aria-label={`Ficha técnica de ${produto.nome}`} className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-700"><FlaskConical size={16} /></Link>
            </div>,
            onEdit: handleEdit,
            onDelete: (produto) => setDeleteConfirmationId(produto.id),
            editLabel: 'Editar produto',
            deleteLabel: 'Excluir produto',
          }}
          storageKey="admin-produtos"
          itemLabel="produtos"
          emptyMessage={searchTerm ? `Nenhum produto corresponde a “${searchTerm}”` : 'Nenhum produto cadastrado'}
          onPageChange={setPage}
          onPageSizeChange={(novoTamanho) => {
            setPageSize(novoTamanho)
            setPage(1)
          }}
          onSort={(campo, direcao) => {
            setSort(campo)
            setOrder(direcao)
            setPage(1)
          }}
          ariaLabel="Produtos do cardápio"
        />
      </div>

      {historyProduct && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="history-title"><section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="history-title" className="text-xl font-black text-slate-950">Vendas de {historyProduct.nome}</h2><p className="mt-1 text-sm text-slate-500">Últimos 30 dias, separados por canal.</p></div><button type="button" onClick={() => setHistoryProduct(null)} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header>{loadingHistory ? <div className="grid h-56 place-items-center"><LoaderCircle className="animate-spin text-orange-600" /></div> : salesHistory && <div className="p-5"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-100 p-4"><span className="text-sm text-slate-500">Quantidade vendida</span><strong className="mt-1 block text-2xl text-slate-950">{salesHistory.totalQuantidade}</strong></div><div className="rounded-xl bg-slate-100 p-4"><span className="text-sm text-slate-500">Valor vendido</span><strong className="mt-1 block text-2xl text-slate-950">{salesHistory.totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div></div><div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">Canal</th><th className="px-4 py-3 text-right">Quantidade</th><th className="px-4 py-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{salesHistory.porCanal.map(item => <tr key={item.canal}><td className="px-4 py-3 font-bold text-slate-800">{item.canal}</td><td className="px-4 py-3 text-right">{item.quantidade}</td><td className="px-4 py-3 text-right font-semibold">{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>)}</tbody></table>{salesHistory.porCanal.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nenhuma venda no período.</p>}</div></div>}</section></div>}

      {rulesProduct && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-black uppercase tracking-wider text-orange-600">Regras comerciais</p><h2 id="rules-title" className="mt-1 text-xl font-black text-slate-950">{rulesProduct.nome}</h2><p className="mt-1 text-sm text-slate-500">Sem regras de horário, o produto permanece disponível o dia todo.</p></div><button type="button" onClick={() => setRulesProduct(null)} disabled={savingRules} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header>
          {loadingRules ? <div className="grid h-72 place-items-center"><LoaderCircle className="animate-spin text-orange-600" /></div> : <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5">
            <section><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">Disponibilidade</h3><p className="text-sm text-slate-500">Dias, horários e canais em que o item pode ser vendido.</p></div><button type="button" onClick={() => setAvailability(items => [...items, { diaSemana: 1, inicioMinuto: 0, fimMinuto: 1440, canal: 'SALAO', ativo: true }])} className="rounded-lg border border-orange-200 px-3 py-2 text-sm font-black text-orange-700 hover:bg-orange-50">+ Horário</button></div>
              <div className="mt-3 space-y-2">{availability.map((rule, index) => <div key={rule.id ?? index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1.25fr_1fr_1fr_1.4fr_auto]">
                <select aria-label={`Dia da regra ${index + 1}`} value={rule.diaSemana} onChange={event => setAvailability(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, diaSemana: Number(event.target.value) } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{WEEK_DAYS.map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select>
                <input aria-label={`Início da regra ${index + 1}`} type="time" value={minutesToTime(rule.inicioMinuto)} onChange={event => setAvailability(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, inicioMinuto: timeToMinutes(event.target.value) } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <input aria-label={`Fim da regra ${index + 1}`} type="time" value={minutesToTime(rule.fimMinuto === 1440 ? 1439 : rule.fimMinuto)} onChange={event => setAvailability(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, fimMinuto: timeToMinutes(event.target.value) } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <select aria-label={`Canal da regra ${index + 1}`} value={rule.canal} onChange={event => setAvailability(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, canal: event.target.value as SalesChannel } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{SALES_CHANNELS.map(channel => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select>
                <button type="button" onClick={() => setAvailability(items => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover regra ${index + 1}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
              </div>)}{availability.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Disponível sem restrição de horário.</p>}</div>
            </section>
            <section><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">Promoções agendadas</h3><p className="text-sm text-slate-500">O maior número de prioridade vence quando períodos se sobrepõem.</p></div><button type="button" onClick={() => { const start = new Date(); const end = new Date(start.getTime() + 7 * 86400_000); setPromotions(items => [...items, { valor: '', inicio: toLocalDateTime(start.toISOString()), fim: toLocalDateTime(end.toISOString()), canal: 'SALAO', prioridade: 0, ativo: true }]) }} className="rounded-lg border border-orange-200 px-3 py-2 text-sm font-black text-orange-700 hover:bg-orange-50">+ Promoção</button></div>
              <div className="mt-3 space-y-2">{promotions.map((promotion, index) => <div key={promotion.id ?? index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[.8fr_1.35fr_1.35fr_1fr_.65fr_auto]">
                <input aria-label={`Valor da promoção ${index + 1}`} type="number" min="0" step="0.01" placeholder="R$" value={promotion.valor} onChange={event => setPromotions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, valor: event.target.value } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <input aria-label={`Início da promoção ${index + 1}`} type="datetime-local" value={promotion.inicio} onChange={event => setPromotions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, inicio: event.target.value } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <input aria-label={`Fim da promoção ${index + 1}`} type="datetime-local" value={promotion.fim} onChange={event => setPromotions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, fim: event.target.value } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <select aria-label={`Canal da promoção ${index + 1}`} value={promotion.canal} onChange={event => setPromotions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, canal: event.target.value as SalesChannel } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{SALES_CHANNELS.map(channel => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select>
                <input aria-label={`Prioridade da promoção ${index + 1}`} type="number" step="1" value={promotion.prioridade} onChange={event => setPromotions(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, prioridade: Number(event.target.value) } : item))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <button type="button" onClick={() => setPromotions(items => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover promoção ${index + 1}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
              </div>)}{promotions.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Nenhuma promoção agendada.</p>}</div>
            </section>
          </div>}
          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setRulesProduct(null)} disabled={savingRules} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700">Cancelar</button><button type="button" onClick={() => void saveRules()} disabled={loadingRules || savingRules} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-50">{savingRules && <LoaderCircle size={16} className="animate-spin" />} Salvar regras</button></footer>
        </section>
      </div>}

      {/* Modal Add/Edit Product */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl border border-gray-200 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={resetForm} className="rounded-lg p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 scrollbar-hide">
              <form id="product-form" onSubmit={handleSave} className="space-y-4">
                {/* Image Upload */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 w-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors relative overflow-hidden group"
                >
                  {foto ? (
                    <>
                      <div className="relative w-full h-full">
                        <Image 
                          src={tenantResourceUrl(foto)}
                          alt="Preview" 
                          fill
                          className="object-cover opacity-80 group-hover:opacity-60 transition-opacity" 
                          unoptimized
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Pencil className="text-white drop-shadow-md" size={24} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">Toque para adicionar foto</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Nome do Produto</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                    placeholder="Ex: Hambúrguer"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Código</label>
                    <input
                      type="text"
                      value={codigo}
                      onChange={e => setCodigo(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                      placeholder="SKU ou PLU"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Ordem</label>
                    <input
                      type="number"
                      value={ordemProduto}
                      onChange={e => setOrdemProduto(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Descrição</label>
                  <textarea
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    className="w-full min-h-20 bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none text-sm resize-none"
                    placeholder="Detalhes exibidos no cardápio"
                  />
                </div>

                {/* Price & Category */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={preco}
                      onChange={e => setPreco(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Promo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorPromo}
                      onChange={e => setValorPromo(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Custo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={custo}
                      onChange={e => setCusto(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Categoria</label>
                    <select
                      value={categoriaId}
                      onChange={e => {
                        const newId = e.target.value
                        setCategoriaId(newId)
                        
                        // Auto-detect sector based on category name
                        const cat = categorias.find(c => c.id.toString() === newId)
                        if (cat) {
                          const catNome = cat.nome.toLowerCase()
                          
                          if (catNome.includes('bebida') || catNome.includes('drink') || catNome.includes('cerveja') || catNome.includes('refrigerante') || catNome.includes('suco') || catNome.includes('água') || catNome.includes('vinho') || catNome.includes('dose') || catNome.includes('bar')) {
                              setIsDrink(true)
                              setIsFood(false)
                          } else if (catNome.includes('prato') || catNome.includes('entrada') || catNome.includes('comida') || catNome.includes('lanche') || catNome.includes('sobremesa') || catNome.includes('porção') || catNome.includes('petisco') || catNome.includes('hambúrguer') || catNome.includes('pizza') || catNome.includes('salada') || catNome.includes('cozinha')) {
                              setIsFood(true)
                              setIsDrink(false)
                          }
                        }
                      }}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    >
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Tipo de Preço</label>
                    <select
                      value={tipo}
                      onChange={e => setTipo(e.target.value as 'COMUM' | 'POR_TAMANHO')}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    >
                      <option value="COMUM">Preço único</option>
                      <option value="POR_TAMANHO">Por tabela de tamanhos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Tabela de Tamanhos</label>
                    <select
                      value={tipoTamanhoId}
                      onChange={e => setTipoTamanhoId(e.target.value)}
                      disabled={tipo !== 'POR_TAMANHO'}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">Selecione</option>
                      {tiposTamanho.map(item => (
                        <option key={item.id} value={item.id}>{item.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Impressoras de produção</label>
                  <button
                    type="button"
                    onClick={() => {
                      setImpressorasRascunho(dispositivoIds)
                      setImpressorasModalAberto(true)
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-gray-800 transition-colors hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Printer className="h-4 w-4 shrink-0 text-orange-600" />
                      <span className="truncate">
                        {dispositivoIds.length === 0
                          ? 'Usar roteamento por categoria/praça'
                          : dispositivos.filter(item => dispositivoIds.includes(item.id)).map(item => item.nome).join(', ')}
                      </span>
                    </span>
                    <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{dispositivoIds.length}</span>
                  </button>
                </div>

                <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Grupos de Complementos</label>
                    <span className="text-[10px] text-gray-600">{gruposComplementoIds.length} vinculados</span>
                  </div>
                  {gruposComplemento.length === 0 ? (
                    <p className="text-xs text-gray-500">Cadastre grupos em Cardápio &gt; Complementos.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                      {gruposComplemento.map(grupo => {
                        const marcado = gruposComplementoIds.includes(grupo.id)
                        return (
                          <button
                            key={grupo.id}
                            type="button"
                            onClick={() => setGruposComplementoIds(prev => marcado ? prev.filter(id => id !== grupo.id) : [...prev, grupo.id])}
                            className={clsx(
                              "flex items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-colors",
                              marcado ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-200"
                            )}
                          >
                            <span>
                              <span className="block text-sm font-bold text-gray-800">{grupo.nome}</span>
                              <span className="block text-[10px] text-gray-500">
                                {grupo.obrigatorio ? 'Obrigatório' : 'Opcional'} · min {grupo.minEscolhas} · max {grupo.maxEscolhas ?? 'livre'}
                              </span>
                            </span>
                            <span className={clsx(
                              "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                              marcado ? "bg-orange-600 border-orange-600" : "border-gray-400 bg-white"
                            )}>
                              {marcado && <Check size={14} className="text-white" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Option Type */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Tipo de Opção</label>
                  <select
                    value={tipoOpcao}
                    onChange={e => {
                      const proximoTipo = e.target.value as Exclude<Produto['tipoOpcao'], undefined>
                      setTipoOpcao(proximoTipo)
                      if (proximoTipo === 'sabores_com_tamanho') setTipo('POR_TAMANHO')
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  >
                    <option value="padrao">Padrão (Sem variações)</option>
                    <option value="tamanho_pg">Tamanho (P/G)</option>
                    <option value="refrigerante">Refrigerante (Lata/Litro/KS + Normal/Zero)</option>
                    <option value="sabores">Apenas Sabores/Variações</option>
                    <option value="sabores_com_tamanho">Sabores + Tamanho (P/G)</option>
                    <option value="combinado">Combinado (Escolha Múltipla)</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 gap-2">
                  {/* Active Status */}
                  <div 
                    className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition-colors" 
                    onClick={() => setAtivo(!ativo)}
                  >
                    <div className={clsx(
                      "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                      ativo ? "bg-green-600 border-green-600" : "border-gray-400 bg-white"
                    )}>
                      {ativo && <Check size={14} className="text-white" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-700">Disponível / Ativo?</span>
                      <p className="text-xs leading-5 text-gray-500">Se desmarcar, o produto some do cardápio</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition-colors" 
                      onClick={() => setFavorito(!favorito)}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                        favorito ? "bg-amber-500 border-amber-500" : "border-gray-400 bg-white"
                      )}>
                        {favorito && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-bold text-gray-700">Favorito</span>
                    </div>

                    <div 
                      className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition-colors" 
                      onClick={() => setDestaque(!destaque)}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                        destaque ? "bg-amber-500 border-amber-500" : "border-gray-400 bg-white"
                      )}>
                        {destaque && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-bold text-gray-700">Destaque</span>
                    </div>

                    <div 
                      className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition-colors" 
                      onClick={() => setControlaEstoque(!controlaEstoque)}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                        controlaEstoque ? "bg-emerald-600 border-emerald-600" : "border-gray-400 bg-white"
                      )}>
                        {controlaEstoque && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-bold text-gray-700">Estoque</span>
                    </div>

                    <div 
                      className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition-colors" 
                      onClick={() => setFiscal(!fiscal)}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                        fiscal ? "bg-indigo-600 border-indigo-600" : "border-gray-400 bg-white"
                      )}>
                        {fiscal && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-bold text-gray-700">Fiscal</span>
                    </div>

                    <div 
                      className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition-colors" 
                      onClick={() => setAutoatendimento(!autoatendimento)}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                        autoatendimento ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white"
                      )}>
                        {autoatendimento && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-bold text-gray-700">Autoatendimento</span>
                    </div>
                  </div>

                  {/* Permitir Gelo e Limão */}
                  <div 
                    className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-200 cursor-pointer active:bg-gray-100 transition-colors" 
                    onClick={() => setPermiteGeloLimao(!permiteGeloLimao)}
                  >
                    <div className={clsx(
                      "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                      permiteGeloLimao ? "bg-blue-600 border-blue-600" : "border-gray-400 bg-white"
                    )}>
                      {permiteGeloLimao && <Check size={14} className="text-white" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-700">Gelo e Limão?</span>
                      <p className="text-xs leading-5 text-gray-500">Exibir botões de Gelo/Limão</p>
                    </div>
                  </div>
                </div>

                {fiscal && (
                  <div className="space-y-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Fiscal</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={ncm}
                        onChange={e => setNcm(e.target.value)}
                        className="w-full bg-white border border-indigo-100 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="NCM"
                      />
                      <input
                        type="text"
                        value={cfop}
                        onChange={e => setCfop(e.target.value)}
                        className="w-full bg-white border border-indigo-100 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="CFOP"
                      />
                      <input
                        type="text"
                        value={cstCsosn}
                        onChange={e => setCstCsosn(e.target.value)}
                        className="w-full bg-white border border-indigo-100 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="CST/CSOSN"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={aliquotaIcms}
                        onChange={e => setAliquotaIcms(e.target.value)}
                        className="w-full bg-white border border-indigo-100 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        placeholder="ICMS %"
                      />
                    </div>
                  </div>
                )}

                {/* Observações rápidas */}
                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <Switch
                    checked={permitirObservacao}
                    onCheckedChange={setPermitirObservacao}
                    label="Observações"
                    description="Adicione opções rápidas para o pedido, como “Sem cebola” ou “Molho à parte”."
                    size="sm"
                    className="w-full"
                  />

                  <div className={clsx('space-y-2 transition-opacity', !permitirObservacao && 'opacity-60')}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newObservacao}
                        onChange={(event) => setNewObservacao(event.target.value)}
                        placeholder="Nova observação..."
                        disabled={!permitirObservacao}
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-100"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleAddObservacao(event)
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddObservacao}
                        disabled={!permitirObservacao || !newObservacao.trim()}
                        aria-label="Adicionar observação"
                        className="rounded-lg bg-gray-800 p-2 text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                      {observacoes.map((observacao) => (
                        <div key={observacao} className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800">
                          <span>{observacao}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveObservacao(observacao)}
                            disabled={!permitirObservacao}
                            aria-label={`Remover observação ${observacao}`}
                            className="rounded-full p-0.5 text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {observacoes.length === 0 && (
                        <p className="w-full py-1 text-center text-xs italic text-gray-600">Nenhuma observação cadastrada</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sabores List */}
                {(tipoOpcao === 'sabores' || tipoOpcao === 'sabores_com_tamanho' || tipoOpcao === 'combinado' || tipoOpcao === 'refrigerante') && (
                  <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sabores/Variações</label>
                    {tipoOpcao === 'refrigerante' && (
                      <p className="text-[10px] text-gray-500 mb-2">
                        Se deixar vazio, usará os tamanhos padrão: Lata, KS, 1 Litro.
                        <br/>Adicione tamanhos personalizados se desejar (ex: 600ml, 2 Litros).
                      </p>
                    )}
                    {tipoOpcao === 'sabores_com_tamanho' && (
                      <p className="text-[10px] text-gray-500 mb-2">
                        Adicione os sabores disponíveis para os tamanhos P e G (ex: Camarão, Peixe, Carne).
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSabor}
                        onChange={e => setNewSabor(e.target.value)}
                        placeholder="Novo sabor..."
                        className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddSabor(e)
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSabor}
                        disabled={!newSabor}
                        className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                      {sabores.map(sabor => (
                        <div key={sabor} className="bg-white text-gray-700 text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1 border border-gray-200">
                          <span>{sabor}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSabor(sabor)}
                            className="rounded-full p-0.5 text-gray-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {sabores.length === 0 && (
                        <p className="w-full py-1 text-center text-xs italic text-gray-600">Nenhuma variação</p>
                      )}
                    </div>

                    {tipoOpcao === 'sabores_com_tamanho' && tipo === 'POR_TAMANHO' && sabores.length > 0 && (
                      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                        <input
                          type="checkbox"
                          checked={usarPrecosSaborTamanho}
                          onChange={event => setUsarPrecosSaborTamanho(event.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-orange-600"
                        />
                        <span>
                          <span className="block text-sm font-bold text-gray-800">Preços diferentes por sabor e tamanho</span>
                          <span className="block text-xs text-gray-600">Ative para preencher o valor de cada combinação, como Pirão P de Frango e Pirão G de Carne de Sol.</span>
                        </span>
                      </label>
                    )}

                    {tipoOpcao === 'sabores_com_tamanho' && tipo === 'POR_TAMANHO' && usarPrecosSaborTamanho && sabores.length > 0 && (
                      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                        {(() => {
                          const tamanhos = tiposTamanho.find(item => String(item.id) === tipoTamanhoId)?.tamanhos ?? []
                          if (tamanhos.length === 0) {
                            return <p className="p-3 text-xs text-amber-700">Selecione uma tabela que possua tamanhos cadastrados.</p>
                          }
                          return (
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                  <th className="px-3 py-2 text-left">Sabor</th>
                                  {tamanhos.map(tamanho => <th key={tamanho.id} className="px-3 py-2 text-left">{tamanho.nome}</th>)}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sabores.map(sabor => (
                                  <tr key={sabor}>
                                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">{sabor}</th>
                                    {tamanhos.map(tamanho => {
                                      const chave = `${tamanho.id}:${sabor}`
                                      return (
                                        <td key={tamanho.id} className="px-2 py-2">
                                          <label className="flex min-w-28 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                                            <span className="text-xs text-gray-500">R$</span>
                                            <input
                                              type="number"
                                              min="0.01"
                                              step="0.01"
                                              value={precosSaborTamanho[chave] ?? ''}
                                              onChange={event => setPrecosSaborTamanho(current => ({ ...current, [chave]: event.target.value }))}
                                              aria-label={`Preço de ${sabor} no tamanho ${tamanho.nome}`}
                                              className="w-20 bg-transparent py-2 text-sm text-gray-900 outline-none"
                                              placeholder="0,00"
                                            />
                                          </label>
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-gray-200 shrink-0 bg-gray-50 rounded-b-2xl">
              <button
                type="submit"
                form="product-form"
                disabled={!nome || ((tipoOpcao === 'sabores' || tipoOpcao === 'sabores_com_tamanho' || tipoOpcao === 'combinado') && sabores.length === 0)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-blue-900/20"
              >
                {editingId ? 'Salvar Alterações' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {impressorasModalAberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="impressoras-produto-title">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <h2 id="impressoras-produto-title" className="text-lg font-bold text-slate-900">Impressoras do produto</h2>
                <p className="mt-1 text-sm text-slate-600">Selecione todas as impressoras que devem receber este item.</p>
              </div>
              <button type="button" onClick={() => setImpressorasModalAberto(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-4">
              {dispositivos.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">Nenhuma impressora ativa cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {dispositivos.map(impressora => {
                    const marcada = impressorasRascunho.includes(impressora.id)
                    return (
                      <button
                        key={impressora.id}
                        type="button"
                        onClick={() => setImpressorasRascunho(atuais => marcada ? atuais.filter(id => id !== impressora.id) : [...atuais, impressora.id])}
                        className={clsx(
                          'flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left transition-colors',
                          marcada ? 'border-orange-500 bg-orange-50 text-orange-950' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Printer className={clsx('h-5 w-5 shrink-0', marcada ? 'text-orange-600' : 'text-slate-500')} />
                          <span className="truncate text-sm font-semibold">{impressora.nome}</span>
                        </span>
                        <span className={clsx('flex h-5 w-5 shrink-0 items-center justify-center rounded border', marcada ? 'border-orange-600 bg-orange-600' : 'border-slate-400 bg-white')}>
                          {marcada && <Check size={14} className="text-white" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <span className="text-sm font-medium text-slate-600">{impressorasRascunho.length} selecionada(s)</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setImpressorasModalAberto(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancelar</button>
                <button type="button" onClick={() => { setDispositivoIds(impressorasRascunho); setImpressorasModalAberto(false) }} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteConfirmationId}
        onClose={() => setDeleteConfirmationId(null)}
        onConfirm={confirmDelete}
        title="Excluir Produto?"
        description="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />

      {/* Aviso explícito: é operação de LOTE sobre o cardápio inteiro, não sobre a
          página visível. Sem dizer isso, o operador poderia achar que corrigiu
          apenas o que está na tela (ou pior, achar que corrigiu tudo quando não). */}
      <ConfirmationModal
        isOpen={confirmarFixSetores}
        onClose={() => setConfirmarFixSetores(false)}
        onConfirm={handleFixSectors}
        title="Corrigir setores de produção?"
        description={`Isto vai reprocessar TODO o cardápio (${totalProdutos} produtos), não apenas a página atual, e ajustar Cozinha/Bar de cada item com base no nome da categoria. Produtos de categorias não reconhecidas ficam como estão.`}
        confirmText="Corrigir tudo"
        variant="warning"
      />
    </div>
  )
}
