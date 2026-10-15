'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Braces, CheckCircle2, CircleAlert, Eye, EyeOff, RotateCcw, Server, Wifi } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import {
  clearBackendBoundBrowserState,
  clearBackendSession,
  clearBackendUrl,
  normalizeBackendUrl,
  readConfiguredBackendUrl,
  saveBackendUrl,
  writeBackendCookie,
} from '@/app/lib/backend-config'
import { clearOfflineData, getOfflineStatus } from '@/app/lib/offline'
import { useToast } from '@/contexts/ToastContext'

type ConnectionState =
  | { kind: 'idle'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

async function checkConnection(url: string): Promise<string> {
  const previous = readConfiguredBackendUrl()
  writeBackendCookie(url)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch('/api', {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
    const body = await response.json().catch(() => null) as { message?: string } | null
    if (!response.ok) throw new Error(body?.message || `Servidor respondeu com erro ${response.status}`)
    return body?.message || 'Backend respondeu corretamente'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('O backend demorou mais de 12 segundos para responder')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
    writeBackendCookie(previous)
  }
}

export default function ApiSettingsPage() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [configuredUrl, setConfiguredUrl] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [connection, setConnection] = useState<ConnectionState>({
    kind: 'idle',
    message: 'Teste o endereço antes de salvar para confirmar que o backend está acessível.',
  })

  useEffect(() => {
    const saved = readConfiguredBackendUrl()
    setConfiguredUrl(saved)
    setUrl(saved ?? '')
  }, [])

  const normalizedInput = () => normalizeBackendUrl(url)

  const testar = async () => {
    setTesting(true)
    try {
      const normalized = normalizedInput()
      const message = await checkConnection(normalized)
      setConnection({ kind: 'success', message })
      showToast('Conexão com o backend confirmada', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível conectar ao backend'
      setConnection({ kind: 'error', message })
      showToast(message, 'error')
    } finally {
      setTesting(false)
    }
  }

  const salvar = async () => {
    setSaving(true)
    try {
      const offline = await getOfflineStatus()
      if (offline.pending > 0) {
        throw new Error('Sincronize as operações offline pendentes antes de trocar o backend')
      }

      const normalized = normalizedInput()
      await checkConnection(normalized)
      await clearBackendSession()
      await clearBackendBoundBrowserState()
      saveBackendUrl(normalized)
      await clearOfflineData()
      queryClient.clear()
      setConfiguredUrl(normalized)
      setUrl(normalized)
      setConnection({ kind: 'success', message: 'Backend salvo. Entrando no servidor configurado…' })
      showToast('Backend configurado com sucesso', 'success')
      window.setTimeout(() => window.location.assign('/login'), 500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o backend'
      setConnection({ kind: 'error', message })
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const restaurar = async () => {
    setRestoring(true)
    try {
      const offline = await getOfflineStatus()
      if (offline.pending > 0) {
        throw new Error('Sincronize as operações offline pendentes antes de trocar o backend')
      }
      await clearBackendSession()
      await clearBackendBoundBrowserState()
      clearBackendUrl()
      await clearOfflineData()
      queryClient.clear()
      setConfiguredUrl(null)
      setUrl('')
      setConnection({ kind: 'success', message: 'Configuração padrão restaurada.' })
      showToast('Backend padrão restaurado', 'success')
      window.setTimeout(() => window.location.assign('/login'), 500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível restaurar a configuração'
      setConnection({ kind: 'error', message })
      showToast(message, 'error')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-7 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
          <Braces size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">API</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Defina qual backend este dispositivo usa para autenticação, dados, impressão e sincronização.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">Servidor do sistema</h2>
              <p className="mt-1 text-sm text-slate-500">A configuração fica salva somente neste navegador ou programa instalado.</p>
            </div>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${configuredUrl ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
              <Server size={14} />
              {configuredUrl ? 'Personalizado' : 'Padrão da implantação'}
            </span>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <label htmlFor="backend-url" className="block text-sm font-bold text-slate-900">Endereço do backend</label>
            <span className="mt-1 block text-xs leading-5 text-slate-500">Use a URL principal do servidor, sem adicionar caminhos como /api ou /auth.</span>
            <div className="relative mt-2">
              <input
                id="backend-url"
                type={showUrl ? 'url' : 'password'}
                value={url}
                onChange={event => {
                  setUrl(event.target.value)
                  setConnection({ kind: 'idle', message: 'Teste o endereço antes de salvar para confirmar que o backend está acessível.' })
                }}
                placeholder="https://seu-backend.exemplo.com"
                autoComplete="off"
                spellCheck={false}
                className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 pr-12 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              <button
                type="button"
                onClick={() => setShowUrl(value => !value)}
                aria-label={showUrl ? 'Ocultar endereço do backend' : 'Mostrar endereço do backend'}
                aria-pressed={showUrl}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
              >
                {showUrl ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div
            role="status"
            className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${connection.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : connection.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-700'}`}
          >
            {connection.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : connection.kind === 'error' ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <Wifi className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{connection.message}</span>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => void restaurar()} isLoading={restoring} disabled={!configuredUrl || testing || saving}>
              <RotateCcw size={16} />
              Restaurar padrão
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => void testar()} isLoading={testing} disabled={!url.trim() || saving || restoring}>
                <Wifi size={16} />
                Testar conexão
              </Button>
              <Button type="button" onClick={() => void salvar()} isLoading={saving} disabled={!url.trim() || testing || restoring}>
                Salvar backend
              </Button>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Ao salvar ou restaurar, o sistema limpa apenas os dados offline deste dispositivo e abre o login do backend escolhido. Cadastros e dados do servidor não são alterados.
      </p>
    </div>
  )
}
