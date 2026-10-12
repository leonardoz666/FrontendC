'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Delete as DeleteIcon } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch, redirectToLogin } from '@/app/lib/api'
import { LoadingMark, PageLoader } from '@/app/components/ui/PageLoader'

type Mesa = {
  id: number
  numero: number
  status: string
}

export default function Home() {
  const { showToast } = useToast()
  const [input, setInput] = useState('')
  const [tables, setTables] = useState<Mesa[]>([])
  const [canCreateTable, setCanCreateTable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [targetTable, setTargetTable] = useState<Mesa | null>(null)
  const [openingTable, setOpeningTable] = useState(false)
  const router = useRouter()

  // Haptic feedback for tactile response on mobile
  const triggerHaptic = useCallback((ms = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms)
      } catch {}
    }
  }, [])

  useEffect(() => {
    // Auth check and fetch tables
    const init = async () => {
      try {
        const meData = await apiFetch<{ user?: { permissions?: string[] } }>('/auth/me')
        if (!meData.user) {
          redirectToLogin()
          return
        }
        setCanCreateTable(Array.isArray(meData.user.permissions) && meData.user.permissions.includes('cadastros.editar'))

        setTables(await apiFetch<Mesa[]>('/tables'))
      } catch (err) {
        console.error('Home init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleNumber = useCallback((num: number) => {
    triggerHaptic(12)
    if (input.length < 3) { // Limit to 3 digits usually enough for tables
      setInput(prev => prev + num.toString())
    }
  }, [input, triggerHaptic])

  const handleBackspace = useCallback(() => {
    triggerHaptic(18)
    setInput(prev => prev.slice(0, -1))
  }, [triggerHaptic])

  const handleClear = useCallback(() => {
    triggerHaptic(20)
    setInput('')
  }, [triggerHaptic])

  const handleEnter = useCallback(() => {
    if (!input) return
    triggerHaptic(25)

    const tableNum = parseInt(input)
    let table = tables.find(t => t.numero === tableNum)

    if (!table) {
      if (!canCreateTable) {
        showToast(`Mesa ${tableNum} não cadastrada`, 'error')
        return
      }
      table = { id: -1, numero: tableNum, status: 'LIVRE' }
    }

    if (table.status === 'LIVRE') {
      setTargetTable(table)
      setShowConfirmModal(true)
    } else {
      router.push(`/mesas/${table.id}`)
    }
  }, [input, tables, canCreateTable, router, showToast, triggerHaptic])

  // Real-time matching table status preview
  const matchingTable = useMemo(() => {
    if (!input) return null
    const num = parseInt(input)
    return tables.find(t => t.numero === num) || null
  }, [input, tables])

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key >= '0' && e.key <= '9') {
        handleNumber(parseInt(e.key))
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Enter') {
        handleEnter()
      } else if (e.key === 'Escape') {
        handleClear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNumber, handleBackspace, handleEnter, handleClear])

  const confirmOpen = async () => {
    if (!targetTable) return

    setOpeningTable(true)
    try {
      let tableId = targetTable.id
      if (tableId === -1) {
        // Create table first
        const newTable = await apiFetch<Mesa>('/tables', {
          method: 'POST',
          body: { numero: targetTable.numero },
        })
        tableId = newTable.id
      }

      await apiFetch(`/tables/${tableId}/open`, { method: 'POST' })
      showToast(`Mesa ${targetTable.numero} aberta com sucesso!`, 'success')
      router.push(`/mesas/${tableId}`)
    } catch (error) {
      console.error('Error opening table:', error)
      showToast(error instanceof Error ? error.message : 'Erro ao abrir mesa', 'error')
    } finally {
      setOpeningTable(false)
      setShowConfirmModal(false)
    }
  }

  if (loading) {
    return <PageLoader message="Carregando mesas" detail="Preparando o atendimento" />
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] select-none flex-col items-center justify-center bg-[#f4f6f8] px-4 py-6 touch-manipulation">
      <header className="mb-5 text-center sm:mb-7">
        <h1 className="text-[26px] font-bold tracking-[-0.025em] text-slate-950 sm:text-[34px]">Número da Mesa</h1>
        <p className="mt-1 text-[13px] font-medium text-slate-500 sm:text-[16px]">Toque no teclado ou digite</p>
      </header>

      <section className="w-full max-w-[360px] rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:max-w-[480px] sm:p-8">
        <div
          id="numero-mesa"
          role="textbox"
          aria-label={input ? `Mesa ${input}` : 'Digite o número da mesa'}
          aria-readonly="true"
          tabIndex={0}
          className="mb-5 flex h-[98px] w-full flex-col items-center justify-center rounded-lg border border-orange-500 bg-white px-4 outline-none transition-shadow focus:ring-2 focus:ring-orange-100 sm:h-[118px] sm:mb-6"
        >
          {input ? (
            <>
              <strong className="font-mono text-[37px] font-black leading-none tracking-[0.14em] text-slate-900 sm:text-[48px]">
                MESA {input}
              </strong>
              {matchingTable && (
                <span className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold sm:text-[12px] ${
                  matchingTable.status === 'LIVRE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : matchingTable.status === 'OCUPADA'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${matchingTable.status === 'LIVRE' ? 'bg-emerald-500' : matchingTable.status === 'OCUPADA' ? 'bg-amber-500' : 'bg-red-500'}`} aria-hidden="true" />
                  {matchingTable.status === 'LIVRE'
                    ? 'Livre (Abrir)'
                    : matchingTable.status === 'OCUPADA'
                      ? 'Ocupada (Entrar)'
                      : 'Em fechamento'}
                </span>
              )}
            </>
          ) : (
            <span className="text-[15px] text-slate-400 sm:text-[17px]">Digite o número...</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              type="button"
              key={num}
              onClick={() => handleNumber(num)}
              className="flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[19px] font-medium text-slate-800 transition-colors hover:border-orange-200 hover:bg-orange-50 active:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:h-[72px] sm:text-[24px]"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Apagar dígito"
            className="flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-orange-200 hover:bg-orange-50 active:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:h-[72px]"
          >
            <DeleteIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => handleNumber(0)}
            className="flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[19px] font-medium text-slate-800 transition-colors hover:border-orange-200 hover:bg-orange-50 active:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:h-[72px] sm:text-[24px]"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!input}
            className="flex h-14 items-center justify-center rounded-lg bg-orange-600 text-[11px] font-bold text-white transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:h-[72px] sm:text-[14px]"
          >
            ENTRAR
          </button>
        </div>

      </section>

      {/* Modal Confirm Open Table */}
      {showConfirmModal && targetTable && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white p-6 sm:p-8 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-sm w-full animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden"></div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">Abrir Mesa {targetTable.numero}?</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Esta mesa está livre e pronta para ser aberta para novos pedidos.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 px-4 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={confirmOpen}
                disabled={openingTable}
                className="flex-1 py-3.5 px-4 rounded-xl bg-green-600 font-bold text-white hover:bg-green-700 active:scale-95 shadow-lg shadow-green-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {openingTable ? <><LoadingMark /> Abrindo</> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
