'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleDollarSign, FileText, Users, X } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { LoadingMark } from '@/app/components/ui/PageLoader'
import { Modal } from '@/app/components/ui/Modal'

interface RequestBillModalProps {
  isOpen: boolean
  mesaId: number | string
  onClose: () => void
  onRequestSuccess?: () => void
}

export function RequestBillModal({ isOpen, mesaId, onClose, onRequestSuccess }: RequestBillModalProps) {
  const { showToast } = useToast()
  const [splitPeople, setSplitPeople] = useState('1')
  const [pendingAction, setPendingAction] = useState<'request' | 'print' | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setSplitPeople('1')
  }, [isOpen])

  const handleRequestBill = async () => {
    setPendingAction('request')
    try {
      await apiFetch(`/tables/${mesaId}/request-bill`, {
        method: 'POST',
        body: { splitPeople: Math.max(1, Number(splitPeople) || 1) }
      })
      showToast('Conta enviada para fechamento.', 'success')
      onClose()
      onRequestSuccess?.()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao solicitar a conta', 'error')
    } finally {
      setPendingAction(null)
    }
  }

  const handlePrintPartialBill = async () => {
    setPendingAction('print')
    try {
      await apiFetch(`/tables/${mesaId}/print-partial`, {
        method: 'POST',
        body: { splitPeople: Math.max(1, Number(splitPeople) || 1) }
      })
      showToast('Conta parcial enviada para a impressora.', 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao imprimir conta parcial', 'error')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={<span className="flex items-center gap-2"><CircleDollarSign size={22} aria-hidden="true" /> Solicitação de conta</span>} description="Selecione uma opção abaixo." size="sm" isLoading={Boolean(pendingAction)} mobileSheet>
        <div className="space-y-6 p-6">
          <div>
            <label htmlFor="request-bill-people" className="mb-2 block text-sm font-bold text-black">Dividir para quantas pessoas?</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-800" size={22} />
              <input
                id="request-bill-people"
                type="number"
                min={1}
                max={99}
                value={splitPeople}
                onChange={(event) => setSplitPeople(event.target.value)}
                className="h-14 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-lg font-bold text-black outline-none transition-[color,background-color,border-color,box-shadow] focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="grid gap-3">
            <button type="button" onClick={handleRequestBill} disabled={Boolean(pendingAction)} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 font-bold text-white shadow-lg shadow-green-200 transition-colors hover:bg-green-700 disabled:opacity-50">
              {pendingAction === 'request' ? <LoadingMark /> : <CheckCircle2 size={20} />}
              Solicitar fechamento
            </button>
            <button type="button" onClick={handlePrintPartialBill} disabled={Boolean(pendingAction)} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-bold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 disabled:opacity-50">
              {pendingAction === 'print' ? <LoadingMark /> : <FileText size={20} />}
              Conta parcial
            </button>
            <button type="button" onClick={onClose} disabled={Boolean(pendingAction)} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 font-bold text-black transition-colors hover:bg-gray-200 disabled:opacity-50">
              <X size={20} className="text-pink-500" /> Cancelar
            </button>
          </div>
        </div>
    </Modal>
  )
}
