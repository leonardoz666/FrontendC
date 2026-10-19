'use client'

import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'

type TextPromptModalProps = {
  open: boolean
  title: string
  description?: string
  label: string
  initialValue?: string
  placeholder?: string
  minLength?: number
  required?: boolean
  multiline?: boolean
  confirmLabel: string
  isLoading?: boolean
  onClose: () => void
  onConfirm: (value: string) => void | Promise<void>
}

export function TextPromptModal({
  open,
  title,
  description,
  label,
  initialValue = '',
  placeholder,
  minLength = 0,
  required = false,
  multiline = false,
  confirmLabel,
  isLoading = false,
  onClose,
  onConfirm,
}: TextPromptModalProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setValue(initialValue)
    setError('')
  }, [initialValue, open])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = value.trim()
    if (required && !normalized) {
      setError('Preencha este campo para continuar.')
      inputRef.current?.focus()
      return
    }
    if (normalized.length < minLength) {
      setError(`Use pelo menos ${minLength} caracteres.`)
      inputRef.current?.focus()
      return
    }
    await onConfirm(normalized)
  }

  const fieldClass = `mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 ${error ? 'border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-orange-500 focus:ring-orange-100'}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      role="alertdialog"
      isLoading={isLoading}
      initialFocusRef={inputRef}
      mobileSheet
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={isLoading} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button type="submit" form="text-prompt-form" disabled={isLoading} className="min-h-11 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-50">{isLoading ? 'Aguarde…' : confirmLabel}</button>
        </div>
      )}
    >
      <form id="text-prompt-form" onSubmit={submit} className="p-5" noValidate>
        <label className="block text-sm font-bold text-slate-800">
          {label}
          {multiline ? (
            <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={value} onChange={event => { setValue(event.target.value); setError('') }} placeholder={placeholder} rows={4} aria-invalid={Boolean(error)} aria-describedby={error ? 'text-prompt-error' : undefined} className={`${fieldClass} resize-y`} />
          ) : (
            <input ref={inputRef as React.RefObject<HTMLInputElement>} value={value} onChange={event => { setValue(event.target.value); setError('') }} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? 'text-prompt-error' : undefined} className={fieldClass} />
          )}
        </label>
        {error && <p id="text-prompt-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
      </form>
    </Modal>
  )
}
