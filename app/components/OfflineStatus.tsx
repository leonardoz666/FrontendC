'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CloudOff, RefreshCw } from 'lucide-react'
import {
  getOfflineStatus,
  discardOfflineMutation,
  subscribeOfflineStatus,
  syncOfflineQueue,
  type OfflineStatus as OfflineStatusValue,
} from '@/app/lib/offline'
import { errorMessageFromUnknown } from '@/app/lib/error-message'

const INITIAL_STATUS: OfflineStatusValue = {
  offline: false,
  pending: 0,
  failed: 0,
  syncing: false,
}

export default function OfflineStatus() {
  const [status, setStatus] = useState(INITIAL_STATUS)
  const [showFailure, setShowFailure] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const refresh = useCallback(() => {
    void getOfflineStatus()
      .then(setStatus)
      .catch(() => setStatus(current => ({ ...current, offline: true })))
  }, [])

  const synchronize = useCallback((retryBlocked = false) => {
    void syncOfflineQueue({ retryBlocked }).catch(() => undefined).finally(refresh)
  }, [refresh])

  useEffect(() => {
    let active = true
    const update = () => {
      void getOfflineStatus()
        .then(next => {
          if (active) setStatus(next)
        })
        .catch(() => {
          if (active) setStatus(current => ({ ...current, offline: true }))
        })
    }
    const unsubscribe = subscribeOfflineStatus(update)
    const synchronizeWhenOnline = () => void syncOfflineQueue().catch(() => undefined).finally(update)
    window.addEventListener('online', synchronizeWhenOnline)
    update()
    if (navigator.onLine) void syncOfflineQueue().catch(() => undefined).finally(update)

    const interval = window.setInterval(() => {
      if (navigator.onLine) void syncOfflineQueue().catch(() => undefined).finally(update)
    }, 30_000)

    return () => {
      active = false
      unsubscribe()
      window.removeEventListener('online', synchronizeWhenOnline)
      window.clearInterval(interval)
    }
  }, [])

  if (!status.offline && status.pending === 0 && status.failed === 0) return null

  const hasFailure = status.failed > 0
  const label = hasFailure
    ? `${status.failed} operação(ões) precisam de atenção`
    : status.syncing
      ? `Sincronizando ${status.pending} operação(ões)`
      : status.offline
        ? `Modo offline${status.pending > 0 ? ` • ${status.pending} pendente(s)` : ''}`
        : `${status.pending} operação(ões) aguardando sincronização`

  const discard = () => {
    if (!status.failedMutationId) return
    void discardOfflineMutation(status.failedMutationId).then(() => {
      setConfirmDiscard(false)
      setShowFailure(false)
      refresh()
    })
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-[70] max-w-[calc(100vw-2rem)] rounded-xl border px-3 py-2 text-sm font-semibold shadow-lg ${
        hasFailure
          ? 'border-red-300 bg-red-50 text-red-900'
          : 'border-amber-300 bg-amber-50 text-amber-950'
      }`}
    >
      <div className="flex items-center gap-2">
        {hasFailure ? <AlertTriangle size={18} /> : <CloudOff size={18} />}
        <span>{label}</span>
        {status.pending > 0 && (
          <button
            type="button"
            onClick={() => hasFailure ? setShowFailure(value => !value) : synchronize(false)}
            disabled={status.syncing || (!hasFailure && !navigator.onLine)}
            className="ml-1 inline-flex h-8 items-center gap-1 rounded-lg border border-current/20 px-2 text-xs hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={status.syncing ? 'animate-spin' : ''} />
            {hasFailure ? 'Resolver' : 'Tentar agora'}
          </button>
        )}
      </div>
      {hasFailure && showFailure && (
        <div className="mt-2 max-w-md border-t border-red-200 pt-2 text-xs font-medium">
          <p className="break-words">{errorMessageFromUnknown(status.lastError, 'O servidor recusou esta operação.')}</p>
          {confirmDiscard ? (
            <div className="mt-2">
              <p className="font-bold">Descartar esta operação? Ela não será enviada ao servidor.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={discard} className="rounded-md bg-red-700 px-2 py-1 text-white hover:bg-red-800">Confirmar descarte</button>
                <button type="button" onClick={() => setConfirmDiscard(false)} className="rounded-md border border-red-300 px-2 py-1 hover:bg-red-100">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => synchronize(true)} disabled={!navigator.onLine || status.syncing} className="rounded-md border border-red-300 px-2 py-1 hover:bg-red-100 disabled:opacity-50">Tentar novamente</button>
              <button type="button" onClick={() => setConfirmDiscard(true)} className="rounded-md border border-red-300 px-2 py-1 hover:bg-red-100">Descartar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

