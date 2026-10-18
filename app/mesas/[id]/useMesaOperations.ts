import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/app/lib/api'
import { resolveTableTransferTarget } from '@/app/lib/table-transfer'
import type { SubmittedItem } from '@/types'

export const CUSTOM_CANCELLATION_REASON = '__CUSTOM__'
export const CANCELLATION_REASONS = ['Erro de lançamento', 'Desistência', 'Falta do produto'] as const

type Toast = (message: string, type: 'success' | 'error') => void

type Options = {
  mesaId: number
  mesaNumero: number
  tableStatus: string
  userPermissions: string[]
  navigate: (path: string) => void
  showToast: Toast
  refreshTable: () => Promise<void>
  setSubmittedItems: React.Dispatch<React.SetStateAction<SubmittedItem[]>>
}

export function useMesaOperations(options: Options) {
  const { mesaId, mesaNumero, tableStatus, userPermissions, navigate, showToast, refreshTable, setSubmittedItems } = options
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [availableTables, setAvailableTables] = useState<Array<{ id: number; numero: number; status: string }>>([])
  const [targetTableNumber, setTargetTableNumber] = useState('')
  const [availableWaiters, setAvailableWaiters] = useState<Array<{ id: number; nome: string }>>([])
  const [selectedWaiterId, setSelectedWaiterId] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [showItemTransferModal, setShowItemTransferModal] = useState(false)
  const [selectedTransferItemIds, setSelectedTransferItemIds] = useState<number[]>([])
  const [itemTransferTargetId, setItemTransferTargetId] = useState<number | null>(null)
  const [isTransferringItems, setIsTransferringItems] = useState(false)
  const [showCancelItemsModal, setShowCancelItemsModal] = useState(false)
  const [selectedCancelItemIds, setSelectedCancelItemIds] = useState<number[]>([])
  const [selectedCancellationReason, setSelectedCancellationReason] = useState('')
  const [customCancellationReason, setCustomCancellationReason] = useState('')
  const [isCancellingItems, setIsCancellingItems] = useState(false)

  const transferTarget = useMemo(() => resolveTableTransferTarget(
    availableTables,
    { id: mesaId, numero: mesaNumero },
    targetTableNumber
  ), [availableTables, mesaId, mesaNumero, targetTableNumber])

  const cancellationReason = selectedCancellationReason === CUSTOM_CANCELLATION_REASON
    ? customCancellationReason.trim()
    : selectedCancellationReason

  useEffect(() => {
    if (!showTransferModal && !showItemTransferModal) return
    apiFetch<Array<{ id: number; numero: number; status: string }>>('/tables')
      .then(data => setAvailableTables(data.filter(table => table.id !== mesaId)))
      .catch(error => console.error('Error fetching tables:', error))
  }, [showTransferModal, showItemTransferModal, mesaId])

  useEffect(() => {
    if (!showTransferModal) return
    apiFetch<Array<{ id: number; nome: string }>>('/tables/waiters')
      .then(setAvailableWaiters)
      .catch(error => {
        console.error('Error fetching waiters:', error)
        setAvailableWaiters([])
        showToast('Não foi possível carregar os garçons', 'error')
      })
  }, [showTransferModal, showToast])

  const transferTable = async () => {
    if (!transferTarget.ok) {
      if (targetTableNumber.trim()) showToast(transferTarget.message, 'error')
      return
    }
    const waiterId = Number(selectedWaiterId)
    if (!Number.isInteger(waiterId) || waiterId <= 0) {
      showToast('Selecione o garçom responsável pela mesa', 'error')
      return
    }
    setIsTransferring(true)
    try {
      const result = await apiFetch<{ targetTableId: number; targetTableNumber: number; created: boolean; waiter: { id: number; nome: string } }>(`/tables/${mesaId}/transfer`, {
        method: 'POST', body: { targetTableNumber: transferTarget.numero, waiterId }
      })
      showToast(`Mesa ${result.targetTableNumber} transferida para ${result.waiter.nome}!`, 'success')
      setShowTransferModal(false)
      navigate(`/mesas/${result.targetTableId}`)
    } catch (error) {
      console.error('Error transferring table:', error)
      showToast(error instanceof Error ? error.message : 'Erro ao conectar com o servidor', 'error')
    } finally {
      setIsTransferring(false)
    }
  }

  const transferItems = async () => {
    if (!itemTransferTargetId || selectedTransferItemIds.length === 0) return
    setIsTransferringItems(true)
    try {
      const result = await apiFetch<{ sourceEmptied: boolean; targetTableId: number }>(`/tables/${mesaId}/transfer-items`, {
        method: 'POST', body: { targetTableId: itemTransferTargetId, itemIds: selectedTransferItemIds }
      })
      showToast(`${selectedTransferItemIds.length} lançamento(s) transferido(s) com sucesso!`, 'success')
      setShowItemTransferModal(false)
      setSelectedTransferItemIds([])
      setItemTransferTargetId(null)
      if (result.sourceEmptied) navigate(`/mesas/${result.targetTableId}`)
      else await refreshTable()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao transferir itens', 'error')
    } finally {
      setIsTransferringItems(false)
    }
  }

  const cancelItems = async () => {
    const reason = cancellationReason.trim()
    if (selectedCancelItemIds.length === 0 || reason.length < 3) return
    setIsCancellingItems(true)
    try {
      const result = await apiFetch<{ cancelledItemIds: number[] }>('/orders/items/cancel', {
        method: 'POST', body: { itemIds: selectedCancelItemIds, motivo: reason }
      })
      const cancelledIds = new Set(result.cancelledItemIds)
      setSubmittedItems(current => current.map(item => cancelledIds.has(item.id) ? { ...item, status: 'CANCELADO' } : item))
      showToast(`${result.cancelledItemIds.length} lançamento(s) cancelado(s) e devolvido(s) ao estoque.`, 'success')
      setShowCancelItemsModal(false)
      setSelectedCancelItemIds([])
      setSelectedCancellationReason('')
      setCustomCancellationReason('')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao cancelar itens', 'error')
    } finally {
      setIsCancellingItems(false)
    }
  }

  return {
    availableTables, availableWaiters, cancellationReason, customCancellationReason, itemTransferTargetId,
    isCancellingItems, isTransferring, isTransferringItems, selectedCancellationReason,
    selectedCancelItemIds, selectedTransferItemIds, selectedWaiterId, showCancelItemsModal,
    showItemTransferModal, showTransferModal, targetTableNumber, transferTarget,
    canCancelItems: tableStatus === 'OCUPADA' && userPermissions.includes('pedidos.cancelar'),
    canTransferItems: tableStatus === 'OCUPADA' && userPermissions.includes('mesas.transferir_itens'),
    canTransferTable: tableStatus === 'OCUPADA' && userPermissions.includes('mesas.transferir'),
    handleCancelItems: cancelItems,
    handleTransferItems: transferItems,
    handleTransferTable: transferTable,
    setCustomCancellationReason, setItemTransferTargetId, setSelectedCancellationReason,
    setSelectedCancelItemIds, setSelectedTransferItemIds, setSelectedWaiterId,
    setShowCancelItemsModal, setShowItemTransferModal, setShowTransferModal, setTargetTableNumber,
  }
}
