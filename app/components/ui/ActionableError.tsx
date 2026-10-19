'use client'

import { useState } from 'react'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { errorMessageFromUnknown } from '@/app/lib/error-message'

type ActionableErrorProps = {
  error?: unknown
  fallback: string
  onRetry?: () => void | Promise<unknown>
  className?: string
}

/** Estado de erro persistente para páginas, sempre com orientação e recuperação. */
export function ActionableError({ error, fallback, onRetry, className = '' }: ActionableErrorProps) {
  const [retrying, setRetrying] = useState(false)
  const message = errorMessageFromUnknown(error, fallback)

  const retry = async () => {
    if (!onRetry || retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div role="alert" aria-live="assertive" className={`flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        <CircleAlert size={20} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
        <p className="text-sm font-semibold leading-6">{message}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={() => void retry()} disabled={retrying} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-red-300 bg-white px-4 text-sm font-bold text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:self-auto">
          <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} aria-hidden="true" />
          {retrying ? 'Tentando novamente' : 'Tentar novamente'}
        </button>
      ) : null}
    </div>
  )
}
