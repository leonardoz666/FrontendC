'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDownToLine, Banknote, CircleAlert, ReceiptText } from 'lucide-react'
import TenantLink from '@/app/components/TenantLink'
import { Button } from '@/app/components/ui/Button'
import { PageLoader } from '@/app/components/ui/PageLoader'
import { apiFetch } from '@/app/lib/api'
import { useTenantRouter } from '@/app/lib/tenant-router'
import { useToast } from '@/contexts/ToastContext'

type CashStatus = {
  aberto: boolean
  caixa: { id: number; abertoEm: string } | null
  dinheiroEsperado?: number | string
}

type WithdrawalResult = { impressao?: { success: boolean } }

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fieldClassName = 'mt-2 block h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500'

export default function SangriaPage() {
  const [status, setStatus] = useState<CashStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const router = useTenantRouter()
  const { showToast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setStatus(await apiFetch<CashStatus>('/caixa/status?resumo=true'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao consultar o caixa', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { void load() }, [load])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(valor.replace(',', '.'))
    const disponivel = Number(status?.dinheiroEsperado ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Informe um valor maior que zero.', 'error')
      return
    }
    if (amount > disponivel) {
      showToast('O valor da sangria é maior que o saldo disponível em dinheiro.', 'error')
      return
    }
    if (motivo.trim().length < 5) {
      showToast('Informe o motivo da sangria com pelo menos 5 caracteres.', 'error')
      return
    }

    try {
      setSaving(true)
      const result = await apiFetch<WithdrawalResult>('/caixa/movimentos', {
        method: 'POST',
        body: { tipo: 'SANGRIA', valor: amount, descricao: motivo.trim() },
      })
      showToast(
        result.impressao?.success ? 'Sangria registrada e comprovante impresso.' : 'Sangria registrada. O comprovante não foi impresso.',
        result.impressao?.success ? 'success' : 'warning',
      )
      router.push('/caixa')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao registrar sangria', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader compact message="Carregando sangria" detail="Conferindo o saldo disponível" />

  const saldoDisponivel = Number(status?.dinheiroEsperado ?? 0)

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
      <TenantLink href="/caixa" className="text-sm font-bold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline">← Voltar para Caixa do Dia</TenantLink>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)] lg:items-start">
        <section>
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700"><ArrowDownToLine size={23} aria-hidden="true" /></span>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Registrar sangria</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Retire dinheiro do caixa aberto e deixe o motivo registrado para conferência e auditoria.</p>
            </div>
          </div>

          {!status?.aberto || !status.caixa ? (
            <div className="mt-8 rounded-2xl bg-amber-50 p-6 text-amber-950" role="status">
              <div className="flex items-center gap-3"><CircleAlert size={21} /><h2 className="font-black">Não há caixa aberto</h2></div>
              <p className="mt-2 text-sm leading-6">Abra o Caixa do Dia antes de registrar uma retirada.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 border-t border-slate-200 pt-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold text-slate-700">Valor da sangria
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-[1.15rem] font-semibold text-slate-500">R$</span>
                    <input value={valor} onChange={event => setValor(event.target.value)} inputMode="decimal" placeholder="0,00" className={`${fieldClassName} pl-12 text-lg font-bold tabular-nums`} autoFocus required />
                  </div>
                </label>
                <div className="rounded-xl bg-slate-950 px-5 py-4 text-white">
                  <p className="text-sm font-semibold text-slate-300">Disponível em dinheiro</p>
                  <p className="mt-1 text-2xl font-black tabular-nums">{money.format(saldoDisponivel)}</p>
                </div>
              </div>
              <label className="mt-5 block text-sm font-bold text-slate-700">Motivo da retirada
                <textarea value={motivo} onChange={event => setMotivo(event.target.value)} rows={4} maxLength={240} placeholder="Ex.: pagamento emergencial ao fornecedor" className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-6 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100" required />
                <span className="mt-2 block text-xs font-medium text-slate-500">Mínimo de 5 caracteres. Esse texto aparecerá no histórico e no comprovante.</span>
              </label>
              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                <TenantLink href="/caixa" className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancelar</TenantLink>
                <Button type="submit" isLoading={saving} variant="danger"><ArrowDownToLine size={17} className="mr-2" /> Confirmar sangria</Button>
              </div>
            </form>
          )}
        </section>

        <aside className="rounded-2xl bg-slate-50 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-orange-700 shadow-sm"><ReceiptText size={20} aria-hidden="true" /></div>
          <h2 className="mt-5 text-lg font-black text-slate-950">O que acontece depois</h2>
          <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <li className="flex gap-3"><Banknote size={18} className="mt-1 shrink-0 text-slate-900" /><span>O valor é abatido imediatamente do dinheiro esperado no caixa.</span></li>
            <li className="flex gap-3"><ReceiptText size={18} className="mt-1 shrink-0 text-slate-900" /><span>O sistema tenta imprimir o comprovante na impressora configurada para o caixa.</span></li>
          </ul>
        </aside>
      </div>
    </main>
  )
}
