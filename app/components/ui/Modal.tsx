'use client'

import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  role?: 'dialog' | 'alertdialog'
  isLoading?: boolean
  closeOnBackdrop?: boolean
  mobileSheet?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  isLoading = false,
  closeOnBackdrop = false,
  mobileSheet = false,
  initialFocusRef,
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const loadingRef = useRef(isLoading)
  onCloseRef.current = onClose
  loadingRef.current = isLoading

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const firstFocusable = initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
    requestAnimationFrame(() => (firstFocusable ?? panel)?.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loadingRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter(element => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      requestAnimationFrame(() => previousFocus?.focus())
    }
  }, [initialFocusRef, open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[130] flex bg-slate-950/60 p-0 sm:items-center sm:justify-center sm:p-4 ${mobileSheet ? 'items-end' : 'items-center justify-center p-3'}`}
      onMouseDown={event => {
        if (closeOnBackdrop && !isLoading && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={isLoading || undefined}
        tabIndex={-1}
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl ${SIZE_CLASS[size]} ${mobileSheet ? 'rounded-t-2xl' : 'rounded-2xl'}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-bold leading-tight text-slate-950">{title}</h2>
            {description && <div id={descriptionId} className="mt-1 text-sm leading-6 text-slate-600">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Fechar janela"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-wait disabled:opacity-40"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body
  )
}
