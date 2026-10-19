'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const TOAST_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 9000,
}

const TOAST_LABEL: Record<ToastType, string> = {
  success: 'Sucesso',
  error: 'Erro',
  info: 'Informação',
  warning: 'Atenção',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const removeToast = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId.current
    setToasts(prev => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      timers.current.delete(id)
      removeToast(id)
    }, TOAST_DURATION[type])
    timers.current.set(id, timer)
  }, [removeToast])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer))
      activeTimers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-label="Notificações"
        aria-live="polite"
        aria-relevant="additions text"
        className="fixed inset-x-3 bottom-3 z-[140] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            className={`
              flex w-full min-w-0 max-w-md items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg sm:min-w-[300px]
              animate-in slide-in-from-right fade-in duration-300
              ${toast.type === 'success' ? 'bg-green-500' : ''}
              ${toast.type === 'error' ? 'bg-red-500' : ''}
              ${toast.type === 'info' ? 'bg-blue-500' : ''}
              ${toast.type === 'warning' ? 'bg-orange-500' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle aria-hidden="true" size={20} />}
            {toast.type === 'error' && <AlertCircle aria-hidden="true" size={20} />}
            {toast.type === 'info' && <Info aria-hidden="true" size={20} />}
            {toast.type === 'warning' && <AlertCircle aria-hidden="true" size={20} />}
            
            <p className="min-w-0 flex-1 break-words text-sm font-medium">
              <span className="sr-only">{TOAST_LABEL[toast.type]}: </span>
              {toast.message}
            </p>
            
            <button
              type="button"
              aria-label={`Fechar notificação: ${toast.message}`}
              onClick={() => removeToast(toast.id)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
