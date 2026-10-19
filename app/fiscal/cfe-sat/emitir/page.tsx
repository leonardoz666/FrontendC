'use client'

import { useState, type FormEvent } from 'react'
import TenantLink from '@/app/components/TenantLink'
import { Button } from '@/app/components/ui/Button'
import { apiFetch } from '@/app/lib/api'
import { useTenantRouter } from '@/app/lib/tenant-router'
import { useToast } from '@/contexts/ToastContext'

type EmissaoCfe = {
  status: string
  motivoRejeicao: string | null
}

type FormState = {
  numero: string
  serie: string
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO'
  valorTotal: string
  acbrIniPath: string
}

const INITIAL_FORM: FormState = {
  numero: '',
  serie: '1',
  ambiente: 'HOMOLOGACAO',
  valorTotal: '',
  acbrIniPath: '',
}

const fieldClassName = 'mt-1 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'

export default function EmitirCfeSatPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const router = useTenantRouter()
  const { showToast } = useToast()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numero = Number(form.numero)
    const valorTotal = Number(form.valorTotal.replace(',', '.'))
    if (!Number.isInteger(numero) || numero < 1 || !Number.isFinite(valorTotal) || valorTotal < 0) {
      showToast('Informe número e valor válidos', 'error')
      return
    }

    setSubmitting(true)
    try {
      const result = await apiFetch<EmissaoCfe>('/fiscal/cfe-sat', {
        method: 'POST',
        body: {
          ...form,
          numero,
          valorTotal,
          acbrIniPath: form.acbrIniPath.trim() || undefined,
        },
      })
      showToast(
        result.motivoRejeicao ?? (result.status === 'AUTORIZADA' ? 'CF-e autorizado pelo SAT' : 'CF-e registrado na fila SAT'),
        result.status === 'REJEITADA' ? 'error' : result.status === 'PENDENTE' ? 'warning' : 'success',
      )
      router.push('/fiscal/cfe-sat')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao emitir CF-e SAT', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <TenantLink href="/fiscal/cfe-sat" className="text-sm font-semibold text-orange-700 hover:text-orange-800">← Voltar para CF-e SAT</TenantLink>
      <h1 className="mt-6 text-3xl font-bold text-black">Emitir CF-e (SAT)</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">A transmissão usa o comando SAT.CriarEnviarCFe do ACBrMonitor. Faça primeiro a configuração do equipamento, da DLL do fabricante, da rede e do ambiente SAT.</p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Sem um caminho de INI acessível ao ACBrMonitor, o cupom será registrado como pendente e não será tratado como autorizado.
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Número
            <input value={form.numero} onChange={event => setForm(current => ({ ...current, numero: event.target.value }))} inputMode="numeric" className={fieldClassName} required />
          </label>
          <label className="text-sm font-semibold text-slate-700">Série
            <input value={form.serie} onChange={event => setForm(current => ({ ...current, serie: event.target.value }))} className={fieldClassName} required />
          </label>
          <label className="text-sm font-semibold text-slate-700">Ambiente
            <select value={form.ambiente} onChange={event => setForm(current => ({ ...current, ambiente: event.target.value as FormState['ambiente'] }))} className={fieldClassName}>
              <option value="HOMOLOGACAO">Homologação</option>
              <option value="PRODUCAO">Produção</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Valor total
            <input value={form.valorTotal} onChange={event => setForm(current => ({ ...current, valorTotal: event.target.value }))} inputMode="decimal" placeholder="0,00" className={fieldClassName} required />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Caminho do arquivo INI no computador do ACBrMonitor
            <input value={form.acbrIniPath} onChange={event => setForm(current => ({ ...current, acbrIniPath: event.target.value }))} placeholder="C:\\ACBrMonitorPLUS\\Entrada\\CFe.ini" className={fieldClassName} />
            <span className="mt-1.5 block font-normal text-slate-500">Opcional para registrar em modo pendente; obrigatório para transmissão real.</span>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <TenantLink href="/fiscal/cfe-sat" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</TenantLink>
          <Button type="submit" isLoading={submitting}>Emitir CF-e</Button>
        </div>
      </form>
    </main>
  )
}
