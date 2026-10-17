'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeLocalDataChanges } from '@/app/lib/data-sync'
import { connectTableSocket } from '@/app/lib/table-socket'

// Agrupa importações e ações em lote para não refazer todas as consultas a
// cada item salvo individualmente.
const INVALIDATION_DELAY_MS = 500

export function DataSyncBridge() {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const invalidate = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void queryClient.invalidateQueries()
      }, INVALIDATION_DELAY_MS)
    }

    const unsubscribeLocal = subscribeLocalDataChanges(window, invalidate)
    let socket: Awaited<ReturnType<typeof connectTableSocket>> = null
    let cancelled = false
    if (pathname !== '/login') {
      void connectTableSocket().then(connected => {
        if (cancelled) {
          connected?.disconnect()
          return
        }
        socket = connected
        socket?.on('data:changed', invalidate)
      })
    }

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      unsubscribeLocal()
      socket?.off('data:changed', invalidate)
      socket?.disconnect()
    }
  }, [pathname, queryClient])

  return null
}
