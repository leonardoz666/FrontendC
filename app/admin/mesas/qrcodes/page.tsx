'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckSquare, LoaderCircle, Printer, QrCode, RefreshCw, Square } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { apiFetch, fetchList } from '@/app/lib/api'
import { PageLoader } from '@/app/components/ui/PageLoader'
import { ActionableError } from '@/app/components/ui/ActionableError'

type MesaResumo = {
  id: number
  numero: number
  status: string
  praca?: { id: number; nome: string } | null
}

type MesaQrCode = {
  mesaId: number
  numero: number
  payload: string
  svg: string
}

export default function MesaQrCodesPage() {
  const [mesas, setMesas] = useState<MesaResumo[]>([])
  const [selecionadas, setSelecionadas] = useState<number[]>([])
  const [qrcodes, setQrcodes] = useState<MesaQrCode[]>([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [renovandoId, setRenovandoId] = useState<number | null>(null)

  const carregarMesas = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const lista = await fetchList<MesaResumo>('/tables')
      const ordenadas = [...lista].sort((a, b) => a.numero - b.numero)
      setMesas(ordenadas)
      setSelecionadas(ordenadas.map((mesa) => mesa.id))
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar as mesas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void carregarMesas()
  }, [carregarMesas])

  const mesasSelecionadas = useMemo(() => {
    const ids = new Set(selecionadas)
    return mesas.filter((mesa) => ids.has(mesa.id))
  }, [mesas, selecionadas])

  const todasSelecionadas = mesas.length > 0 && selecionadas.length === mesas.length

  const alternarTodas = () => {
    setSelecionadas(todasSelecionadas ? [] : mesas.map((mesa) => mesa.id))
    setQrcodes([])
  }

  const alternarMesa = (id: number) => {
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]
    )
    setQrcodes([])
  }

  const gerar = async () => {
    if (selecionadas.length === 0) {
      setErro('Selecione pelo menos uma mesa')
      return
    }

    setGerando(true)
    setErro('')
    try {
      const resposta = await apiFetch<{ data: MesaQrCode[] }>(
        `/tables/qrcodes?ids=${selecionadas.join(',')}`
      )
      setQrcodes(resposta.data)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao gerar QR-Codes')
    } finally {
      setGerando(false)
    }
  }

  const renovar = async (mesaId: number) => {
    setRenovandoId(mesaId)
    setErro('')
    try {
      await apiFetch(`/tables/${mesaId}/public-token/rotate`, { method: 'POST' })
      await gerar()
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao renovar o QR-Code')
    } finally { setRenovandoId(null) }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          .qr-print-sheet {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10mm;
          }
          .qr-print-card {
            break-inside: avoid;
            border: 1px solid #111 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <h1 className="mb-2 text-3xl font-bold text-black">QR-Code das mesas</h1>
        <p className="mb-6 text-sm text-gray-600">
          Selecione as mesas e gere uma folha pronta para impressão.
        </p>

        {erro && (
          <ActionableError error={erro} fallback="Não foi possível concluir a operação com os QR Codes." onRetry={carregarMesas} className="mb-4" />
        )}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={alternarTodas}
            disabled={loading || mesas.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {todasSelecionadas ? (
              <CheckSquare className="h-4 w-4 text-orange-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {todasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">
              {selecionadas.length} de {mesas.length} mesa(s)
            </span>
            <Button type="button" onClick={gerar} isLoading={gerando} disabled={loading}>
              <QrCode className="mr-1 h-4 w-4" />
              Gerar QR-Codes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              disabled={qrcodes.length === 0}
            >
              <Printer className="mr-1 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <PageLoader compact message="Carregando mesas" detail="Preparando os QR Codes" />
          </div>
        ) : (
          <div className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {mesas.map((mesa) => {
              const marcada = selecionadas.includes(mesa.id)
              return (
                <button
                  key={mesa.id}
                  type="button"
                  onClick={() => alternarMesa(mesa.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    marcada
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-orange-300'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-900">Mesa {mesa.numero}</span>
                    {marcada ? (
                      <CheckSquare className="h-4 w-4 text-orange-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {mesa.praca?.nome ?? 'Não definida'} · {mesa.status}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {qrcodes.length > 0 ? (
        <div className="qr-print-sheet grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {qrcodes.map((qr) => {
            const mesa = mesasSelecionadas.find((item) => item.id === qr.mesaId)
            return (
              <article
                key={qr.mesaId}
                className="qr-print-card rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm"
              >
                <div
                  aria-label={`QR-Code da mesa ${qr.numero}`}
                  className="mx-auto h-40 w-40 [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qr.svg }}
                />
                <h2 className="mt-3 text-2xl font-bold text-gray-900">Mesa {qr.numero}</h2>
                <p className="mt-1 text-sm text-gray-500">{mesa?.praca?.nome ?? 'Não definida'}</p>
                <p className="mt-2 break-all text-[10px] text-gray-600">{qr.payload}</p>
                <button type="button" onClick={() => void renovar(qr.mesaId)} disabled={renovandoId !== null} className="no-print mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:border-orange-300 hover:text-orange-700 disabled:opacity-50">{renovandoId === qr.mesaId ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />} Revogar e gerar outro</button>
              </article>
            )
          })}
        </div>
      ) : (
        !loading && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Os QR-Codes gerados aparecerão aqui.
          </p>
        )
      )}
    </div>
  )
}
