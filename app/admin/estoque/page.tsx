'use client'

import Link from '@/app/components/TenantLink'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, LockKeyhole, RefreshCw, Trash2 } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { formatarNumeroQuantidade, formatarQuantidade } from '@/app/lib/quantity'
import { ConfirmationModal } from '@/app/components/ConfirmationModal'
import { LoadingValue, PageLoader } from '@/app/components/ui/PageLoader'
import { ActionableError } from '@/app/components/ui/ActionableError'
import { useToast } from '@/contexts/ToastContext'

type Meta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type Lista<T> = {
  data: T[]
  meta: Meta
}

type Insumo = {
  id: number
  codigo: string
  nome: string
  unidade: string
  saldoAtual: number | string
  estoqueMin: number | string
  estoqueMax: number | string
  subgrupo?: { nome: string; grupo?: { nome: string } }
}

type Movimento = {
  id: number
  tipo: string
  sentido: 'ENTRADA' | 'SAIDA' | 'NEUTRO'
  quantidade: number | string
  criadoEm: string
  motivo: string | null
  documento: string | null
  insumo?: { id: number; codigo: string; nome: string; unidade: string }
}

type RelatorioEstoque = {
  valorEstoque: number
  movimentos: number
  porTipo: Array<{ tipo: string; quantidadeMovimentos: number; quantidade: number; valor: number }>
}

function formatarData(valor: string): string {
  return new Date(valor).toLocaleString('pt-BR')
}

async function carregarResumo() {
  const [insumos, alertas, movimentos, relatorio] = await Promise.all([
    apiFetch<Lista<Insumo>>('/insumos?page=1&pageSize=10&ativo=true&sort=nome&order=asc'),
    apiFetch<Lista<Insumo>>('/insumos/alertas?page=1&pageSize=10&sort=saldoAtual&order=asc'),
    apiFetch<Lista<Movimento>>('/insumos/movimentos?page=1&pageSize=5&sort=criadoEm&order=desc'),
    apiFetch<RelatorioEstoque>('/insumos/relatorios/resumo')
  ])

  return { insumos, alertas, movimentos, relatorio }
}

export default function EstoquePage() {
  const { showToast } = useToast()
  const [modalZeragemAberto, setModalZeragemAberto] = useState(false)
  const [senhaDono, setSenhaDono] = useState('')
  const [zerando, setZerando] = useState(false)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['estoque-resumo'],
    queryFn: carregarResumo,
  })
  const { data: sessao } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiFetch<{ user?: { role?: string; permissions?: string[] } }>('/auth/me'),
  })

  const totalInsumos = data?.insumos.meta.total ?? 0
  const totalAlertas = data?.alertas.meta.total ?? 0
  const totalMovimentos = data?.movimentos.meta.total ?? 0
  const podeZerar = sessao?.user?.role === 'DONO' || sessao?.user?.permissions?.includes('estoque.ajustar')

  const fecharModalZeragem = () => {
    if (zerando) return
    setModalZeragemAberto(false)
    setSenhaDono('')
  }

  const zerarEstoque = async () => {
    if (zerando) return
    if (!senhaDono.trim()) {
      showToast('Informe a senha do dono', 'warning')
      return
    }

    setZerando(true)
    try {
      const resultado = await apiFetch<{ saldosZerados: number; movimentosExcluidos: number }>('/insumos/zerar-tudo', {
        method: 'POST',
        body: { senhaDono },
      })
      await refetch()
      setModalZeragemAberto(false)
      setSenhaDono('')
      showToast(`Estoque zerado: ${resultado.saldosZerados} saldo(s) e ${resultado.movimentosExcluidos} movimento(s) removidos`, 'success')
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : 'Não foi possível zerar o estoque', 'error')
    } finally {
      setZerando(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Estoque de insumos</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Gestão de matéria-prima separada do estoque comercial de produtos, com saldos auditados por movimentação.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {isError && (
        <ActionableError error={error} fallback="Não foi possível carregar o resumo do estoque." onRetry={() => refetch()} className="mb-4" />
      )}

      <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Insumos ativos</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{isLoading ? <LoadingValue /> : totalInsumos}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Abaixo do mínimo</p>
          <p className={`mt-2 text-3xl font-bold ${totalAlertas > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            {isLoading ? <LoadingValue /> : totalAlertas}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Movimentos auditados</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{isLoading ? <LoadingValue /> : totalMovimentos}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Valor em estoque</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? <LoadingValue /> : Number(data?.relatorio.valorEstoque ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </section>

      {totalAlertas > 0 && (
        <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-sm font-bold">Alertas de estoque mínimo</h2>
            </div>
            <Link href="/admin/estoque/insumos" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:text-amber-900">
              Ver insumos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data?.alertas.data.map((insumo) => (
              <Link
                key={insumo.id}
                href={`/admin/estoque/movimentacoes?insumoId=${insumo.id}`}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 hover:bg-amber-50"
              >
                <p className="text-sm font-semibold text-gray-900">{insumo.nome}</p>
                <p className="text-xs text-gray-600">
                  Saldo {formatarQuantidade(insumo.saldoAtual, insumo.unidade)} · mínimo {formatarQuantidade(insumo.estoqueMin, insumo.unidade)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">Últimas movimentações</h2>
        </div>
        {isLoading ? (
          <PageLoader compact message="Carregando movimentações" detail="Atualizando o estoque" />
        ) : data?.movimentos.data.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Nenhuma movimentação registrada.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data?.movimentos.data.map((movimento) => (
              <li key={movimento.id} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{movimento.insumo?.nome ?? `Insumo #${movimento.id}`}</p>
                  <p className="text-xs text-gray-500">{movimento.tipo} · {movimento.motivo ?? movimento.documento ?? 'Sem observação'}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-gray-700">{formatarQuantidade(movimento.quantidade, movimento.insumo?.unidade)}</p>
                  <p className="text-xs text-gray-500">{formatarData(movimento.criadoEm)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">Movimentações dos últimos 30 dias por tipo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Registros</th><th className="px-4 py-3 text-right">Quantidade líquida</th><th className="px-4 py-3 text-right">Valor líquido</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.relatorio.porTipo.map((item) => (
                <tr key={item.tipo}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.tipo}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.quantidadeMovimentos}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatarNumeroQuantidade(item.quantidade)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
              ))}
              {!isLoading && data?.relatorio.porTipo.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhuma movimentação no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {podeZerar && (
        <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="flex gap-3">
            <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700"><Trash2 className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold text-red-950">Zerar todo o estoque</h2>
              <p className="mt-1 max-w-3xl text-sm text-red-800">
                Zera os saldos e apaga todo o histórico de movimentações. Os insumos e produtos cadastrados não serão excluídos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalZeragemAberto(true)}
            className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 sm:mt-0 sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            Zerar tudo
          </button>
        </section>
      )}

      <ConfirmationModal
        isOpen={modalZeragemAberto}
        onClose={fecharModalZeragem}
        onConfirm={() => void zerarEstoque()}
        title="Zerar estoque e histórico?"
        description="Esta ação não pode ser desfeita. Todos os saldos ficarão em zero e todas as movimentações serão apagadas. Nenhum produto ou insumo cadastrado será excluído."
        confirmText={zerando ? 'Zerando...' : 'Zerar tudo'}
        cancelText="Cancelar"
        variant="danger"
        closeOnConfirm={false}
        isLoading={zerando}
      >
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-800">
            <LockKeyhole className="h-4 w-4" />
            Senha do dono
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={senhaDono}
            onChange={evento => setSenhaDono(evento.target.value)}
            onKeyDown={evento => {
              if (evento.key === 'Enter') {
                evento.preventDefault()
                void zerarEstoque()
              }
            }}
            disabled={zerando}
            autoFocus
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:bg-gray-100"
            placeholder="Digite a senha para autorizar"
          />
          <span className="mt-1.5 block text-xs text-gray-500">Somente a senha de um usuário DONO ativo autoriza esta operação.</span>
        </label>
      </ConfirmationModal>
    </main>
  )
}
