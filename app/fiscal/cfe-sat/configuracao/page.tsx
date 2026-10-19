'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Settings2, ShieldCheck } from 'lucide-react'
import TenantLink from '@/app/components/TenantLink'
import { Button } from '@/app/components/ui/Button'
import { ActionableError } from '@/app/components/ui/ActionableError'
import { apiFetch } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'

type SatConfiguration = {
  empresaFiscalId: number | null
  razaoSocial: string | null
  cnpjEmitente: string | null
  ambiente: string
  cnpjSoftwareHouse: string
  codigoAtivacaoConfigurado: boolean
  assinaturaAcConfigurada: boolean
  ativo: boolean
  atualizadoEm: string | null
}

type FormState = {
  cnpjSoftwareHouse: string
  codigoAtivacao: string
  assinaturaAc: string
  ativo: boolean
}

const INITIAL_FORM: FormState = {
  cnpjSoftwareHouse: '',
  codigoAtivacao: '',
  assinaturaAc: '',
  ativo: false,
}

const fieldClassName = 'mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-600 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600'

function formatCnpj(value: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function ConfiguracaoSatPage() {
  const { showToast } = useToast()
  const [configuration, setConfiguration] = useState<SatConfiguration | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showActivationCode, setShowActivationCode] = useState(false)

  const loadConfiguration = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await apiFetch<SatConfiguration>('/fiscal/cfe-sat/configuracao', { signal })
      if (signal?.aborted) return
      setConfiguration(data)
      setForm({
        cnpjSoftwareHouse: formatCnpj(data.cnpjSoftwareHouse),
        codigoAtivacao: '',
        assinaturaAc: '',
        ativo: data.ativo,
      })
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar a configuração do SAT')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadConfiguration(controller.signal)
    return () => controller.abort()
  }, [loadConfiguration])

  const generateActivationCode = async () => {
    setGenerating(true)
    try {
      const result = await apiFetch<{ codigoAtivacao: string }>('/fiscal/cfe-sat/configuracao/gerar-codigo-ativacao', { method: 'POST' })
      setForm(current => ({ ...current, codigoAtivacao: result.codigoAtivacao }))
      setShowActivationCode(true)
      showToast('Código gerado. Salve a configuração para armazená-lo.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível gerar o código de ativação', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const copyActivationCode = async () => {
    if (!form.codigoAtivacao) return
    try {
      await navigator.clipboard.writeText(form.codigoAtivacao)
      showToast('Código de ativação copiado', 'success')
    } catch {
      showToast('Selecione e copie o código manualmente', 'warning')
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const data = await apiFetch<SatConfiguration>('/fiscal/cfe-sat/configuracao', {
        method: 'PUT',
        body: {
          cnpjSoftwareHouse: form.cnpjSoftwareHouse,
          codigoAtivacao: form.codigoAtivacao || undefined,
          assinaturaAc: form.assinaturaAc || undefined,
          ativo: form.ativo,
        },
      })
      setConfiguration(data)
      setForm(current => ({
        ...current,
        cnpjSoftwareHouse: formatCnpj(data.cnpjSoftwareHouse),
        codigoAtivacao: '',
        assinaturaAc: '',
      }))
      setShowActivationCode(false)
      showToast('Configuração do SAT salva', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar a configuração do SAT', 'error')
    } finally {
      setSaving(false)
    }
  }

  const activationReady = Boolean(form.codigoAtivacao || configuration?.codigoAtivacaoConfigurado)
  const signatureReady = Boolean(form.assinaturaAc || configuration?.assinaturaAcConfigurada)
  const canActivate = activationReady && signatureReady && Boolean(configuration?.empresaFiscalId)

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-6 [overflow-wrap:anywhere] sm:px-6 lg:px-8">
      <TenantLink href="/fiscal/cfe-sat" className="text-sm font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline">← Voltar para CF-e SAT</TenantLink>

      <div className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Configuração do SAT</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Vincule o aplicativo comercial ao equipamento SAT e guarde as credenciais do estabelecimento de forma protegida.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          <Settings2 size={18} aria-hidden="true" />
          Ambiente: {configuration?.ambiente === 'PRODUCAO' ? 'Produção' : 'Homologação'}
        </div>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando configuração do SAT" className="mt-8 grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="h-[520px] rounded-2xl bg-slate-100" />
          <div className="h-72 rounded-2xl bg-slate-100" />
        </div>
      ) : loadError ? (
        <ActionableError error={loadError} fallback="Não foi possível carregar a configuração do SAT." onRetry={() => loadConfiguration()} className="mt-8" />
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form onSubmit={save} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!configuration?.empresaFiscalId ? (
              <div role="alert" className="flex gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 sm:px-6">
                <AlertTriangle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
                <div>
                  <p className="font-bold">Cadastre primeiro a empresa fiscal</p>
                  <p className="mt-1">O CNPJ emitente vem da configuração fiscal e não pode ser digitado separadamente aqui.</p>
                  <TenantLink href="/admin/fiscal" className="mt-2 inline-block font-semibold text-amber-950 underline underline-offset-4">Abrir configuração fiscal</TenantLink>
                </div>
              </div>
            ) : null}

            <fieldset className="p-5 sm:p-6" disabled={!configuration?.empresaFiscalId || saving}>
              <legend className="text-lg font-bold text-slate-950">Identificação fiscal</legend>
              <p className="mt-1 text-sm leading-6 text-slate-600">Os dois CNPJs formam a base usada pela software house para produzir a Assinatura AC.</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">CNPJ da software house
                  <input
                    value={form.cnpjSoftwareHouse}
                    onChange={event => setForm(current => ({ ...current, cnpjSoftwareHouse: formatCnpj(event.target.value) }))}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="00.000.000/0000-00"
                    className={fieldClassName}
                    required
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">CNPJ emitente
                  <input value={formatCnpj(configuration?.cnpjEmitente ?? '')} className={fieldClassName} disabled aria-describedby="sat-issuer-help" />
                  <span id="sat-issuer-help" className="mt-1.5 block text-xs font-normal leading-5 text-slate-500">{configuration?.razaoSocial ?? 'Empresa fiscal não cadastrada'}</span>
                </label>
              </div>
            </fieldset>

            <fieldset className="border-t border-slate-200 p-5 sm:p-6" disabled={!configuration?.empresaFiscalId || saving}>
              <legend className="flex items-center gap-2 text-lg font-bold text-slate-950"><KeyRound size={20} aria-hidden="true" /> Código de ativação</legend>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Use de 8 a 32 caracteres alfanuméricos. O código é exibido somente enquanto está sendo criado ou substituído.</p>
              <label className="mt-5 block text-sm font-semibold text-slate-700">Novo código de ativação
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={form.codigoAtivacao}
                      onChange={event => setForm(current => ({ ...current, codigoAtivacao: event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 32) }))}
                      type={showActivationCode ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder={configuration?.codigoAtivacaoConfigurado ? 'Código já configurado' : 'Digite ou gere um código'}
                      className={`${fieldClassName} mt-0 pr-12 font-mono tracking-wide`}
                      minLength={8}
                      maxLength={32}
                    />
                    <button type="button" onClick={() => setShowActivationCode(value => !value)} aria-label={showActivationCode ? 'Ocultar código de ativação' : 'Mostrar código de ativação'} className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                      {showActivationCode ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" onClick={generateActivationCode} isLoading={generating}>Gerar código</Button>
                  <Button type="button" variant="ghost" onClick={copyActivationCode} disabled={!form.codigoAtivacao} aria-label="Copiar código de ativação"><Copy size={18} /> Copiar</Button>
                </div>
              </label>
            </fieldset>

            <fieldset className="border-t border-slate-200 p-5 sm:p-6" disabled={!configuration?.empresaFiscalId || saving}>
              <legend className="flex items-center gap-2 text-lg font-bold text-slate-950"><ShieldCheck size={20} aria-hidden="true" /> Assinatura AC</legend>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">O código de vinculação deve ser fornecido pela software house, assinado com o e-CNPJ dela e ser exclusivo para este CNPJ emitente.</p>
              <label className="mt-5 block text-sm font-semibold text-slate-700">Nova Assinatura AC
                <textarea
                  value={form.assinaturaAc}
                  onChange={event => setForm(current => ({ ...current, assinaturaAc: event.target.value.slice(0, 4096) }))}
                  rows={5}
                  autoComplete="off"
                  placeholder={configuration?.assinaturaAcConfigurada ? 'Assinatura já configurada. Cole outra somente para substituir.' : 'Cole aqui o código de vinculação fornecido pela software house'}
                  className={`${fieldClassName} resize-y py-3 font-mono text-xs leading-5`}
                />
              </label>
            </fieldset>

            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={event => setForm(current => ({ ...current, ativo: event.target.checked }))}
                  disabled={!canActivate || saving}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span><span className="block font-bold text-slate-900">Ativar integração SAT</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Disponível somente quando o código e a Assinatura AC estiverem configurados.</span></span>
              </label>
              <Button type="submit" isLoading={saving} disabled={!configuration?.empresaFiscalId}>Salvar configuração</Button>
            </div>
          </form>

          <aside className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold">Estado da configuração</h2>
              <div className="mt-5 space-y-4 text-sm">
                {[
                  { label: 'Empresa fiscal', ready: Boolean(configuration?.empresaFiscalId) },
                  { label: 'CNPJ da software house', ready: form.cnpjSoftwareHouse.replace(/\D/g, '').length === 14 },
                  { label: 'Código de ativação', ready: activationReady },
                  { label: 'Assinatura AC', ready: signatureReady },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4 border-b border-slate-700 pb-3 last:border-0 last:pb-0">
                    <span className="text-slate-300">{item.label}</span>
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${item.ready ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {item.ready ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      {item.ready ? 'Pronto' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`border-t px-5 py-4 text-sm sm:px-6 ${configuration?.ativo ? 'border-emerald-700 bg-emerald-950 text-emerald-100' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>
              <p className="font-bold">{configuration?.ativo ? 'Integração ativa' : 'Integração desativada'}</p>
              <p className="mt-1 text-xs leading-5">{configuration?.atualizadoEm ? `Última alteração em ${new Date(configuration.atualizadoEm).toLocaleString('pt-BR')}.` : 'A configuração ainda não foi salva.'}</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
