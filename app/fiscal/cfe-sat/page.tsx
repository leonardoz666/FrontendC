'use client'

import TenantLink from '@/app/components/TenantLink'
import { DataTable, type DataTableColumn } from '@/app/components/ui/DataTable'
import { ActionableError } from '@/app/components/ui/ActionableError'
import { formatarMoeda, paginaAtual, useListaCrud } from '@/app/lib/crud-client'
import { usePagedQuery } from '@/app/lib/pagination'

type CfeSat = {
  id: number
  numero: number
  serie: string
  status: string
  ambiente: string
  valorTotal: number | string
  chave: string | null
  motivoRejeicao: string | null
  emitidaEm: string
}

const columns: Array<DataTableColumn<CfeSat>> = [
  { key: 'numero', header: 'Número', sortKey: 'numero', render: item => <span className="font-mono text-xs">{item.serie}/{item.numero}</span> },
  { key: 'status', header: 'Status', sortKey: 'status', render: item => <span className="font-semibold text-slate-900">{item.status}</span> },
  { key: 'ambiente', header: 'Ambiente', hideOnMobile: true, render: item => <span>{item.ambiente}</span> },
  { key: 'valor', header: 'Valor', align: 'right', render: item => <span>{formatarMoeda(item.valorTotal)}</span> },
  { key: 'emissao', header: 'Emissão', sortKey: 'emitidaEm', hideOnMobile: true, render: item => <span>{new Date(item.emitidaEm).toLocaleString('pt-BR')}</span> },
  { key: 'chave', header: 'Chave CF-e', hideOnMobile: true, render: item => <span className="font-mono text-xs text-slate-600">{item.chave ?? '—'}</span> },
  { key: 'motivo', header: 'Retorno', hideOnMobile: true, render: item => <span className="text-slate-600">{item.motivoRejeicao ?? '—'}</span> },
]

export default function ListaCfeSatPage() {
  const ui = useListaCrud('/fiscal/cfe-sat')
  const query = usePagedQuery<CfeSat>(ui.listaParams)
  const pagina = paginaAtual(query, ui.page, ui.pageSize)

  return (
    <main className="mx-auto min-w-0 max-w-7xl px-4 py-6 [overflow-wrap:anywhere] sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">CF-e (SAT)</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Cupons enviados ao equipamento SAT deste estabelecimento. O módulo pode ser desligado sem alterar NFC-e ou NF-e.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <TenantLink href="/fiscal/cfe-sat/configuracao" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
            Configurar SAT
          </TenantLink>
          <TenantLink href="/fiscal/cfe-sat/emitir" className="inline-flex h-10 items-center justify-center rounded-lg border border-orange-700 bg-orange-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
            Emitir CF-e (SAT)
          </TenantLink>
        </div>
      </div>

      {query.isError ? (
        <ActionableError error={query.error} fallback="Não foi possível carregar os CF-e SAT." onRetry={() => query.refetch()} className="mb-4" />
      ) : null}

      <DataTable
        ariaLabel="Cupons fiscais eletrônicos SAT"
        columns={columns}
        data={pagina.data}
        getRowId={item => item.id}
        meta={pagina.meta}
        loading={query.isLoading}
        itemLabel="cupons"
        storageKey="fiscal-cfe-sat"
        emptyMessage="Nenhum CF-e SAT encontrado"
        emptyHint="Emita um cupom quando o equipamento SAT e o ACBrMonitor estiverem configurados."
        onPageChange={ui.setPage}
        onPageSizeChange={ui.setPageSize}
        onSearch={ui.definirBusca}
        onSort={ui.definirOrdenacao}
      />
    </main>
  )
}
