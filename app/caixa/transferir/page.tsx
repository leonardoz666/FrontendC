'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowRightLeft, CircleAlert, ShieldCheck, UserRound } from 'lucide-react'
import TenantLink from '@/app/components/TenantLink'
import { Button } from '@/app/components/ui/Button'
import { PageLoader } from '@/app/components/ui/PageLoader'
import { apiFetch } from '@/app/lib/api'
import { useTenantRouter } from '@/app/lib/tenant-router'
import { useToast } from '@/contexts/ToastContext'

type Responsible = { id: number; nome: string; role: string }
type CashStatus = {
  aberto: boolean
  caixa: { id: number; abertoEm: string } | null
  responsavelAtual: Responsible | null
  dinheiroEsperado?: number | string
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const roleNames: Record<string, string> = { DONO: 'Dono', ADMIN: 'Administrador', GERENTE: 'Gerente', CAIXA: 'Caixa' }

export default function TransferirCaixaPage() {
  const [status, setStatus] = useState<CashStatus | null>(null)
  const [responsaveis, setResponsaveis] = useState<Responsible[]>([])
  const [novoResponsavelId, setNovoResponsavelId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useTenantRouter()
  const { showToast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [cash, users] = await Promise.all([
        apiFetch<CashStatus>('/caixa/status?resumo=true'),
        apiFetch<Responsible[]>('/caixa/responsaveis'),
      ])
      setStatus(cash)
      setResponsaveis(users)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao preparar a transferência', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { void load() }, [load])

  const disponiveis = useMemo(
    () => responsaveis.filter(user => user.id !== status?.responsavelAtual?.id),
    [responsaveis, status?.responsavelAtual?.id],
  )
  const selecionado = disponiveis.find(user => user.id === Number(novoResponsavelId))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const targetId = Number(novoResponsavelId)
    if (!Number.isInteger(targetId) || targetId <= 0) {
      showToast('Selecione quem assumirá o caixa.', 'error')
      return
    }
    try {
      setSaving(true)
      await apiFetch('/caixa/transferir', {
        method: 'POST',
        body: { novoResponsavelId: targetId, motivo: motivo.trim() || undefined },
      })
      showToast(`Caixa transferido para ${selecionado?.nome ?? 'o novo responsável'}.`, 'success')
      router.push('/caixa')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao transferir o caixa', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader compact message="Carregando transferência" detail="Consultando caixa e responsáveis" />

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
      <TenantLink href="/caixa" className="text-sm font-bold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline">← Voltar para Caixa do Dia</TenantLink>
      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><ArrowRightLeft size={23} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Transferir caixa</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Passe a responsabilidade do caixa aberto para outro operador sem encerrar o turno ou alterar o saldo.</p>
        </div>
      </div>

      {!status?.aberto || !status.caixa ? (
        <div className="mt-8 max-w-2xl rounded-2xl bg-amber-50 p-6 text-amber-950" role="status">
          <div className="flex items-center gap-3"><CircleAlert size={21} /><h2 className="font-black">Não há caixa aberto para transferir</h2></div>
          <p className="mt-2 text-sm leading-6">Abra o Caixa do Dia antes de definir outro responsável.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.65fr)] lg:items-start">
          <section className="border-t border-slate-200 pt-7">
            <h2 className="text-lg font-black text-slate-950">Escolha quem assume</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Somente usuários ativos com perfil de caixa, gerente, administrador ou dono aparecem aqui.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <div className="rounded-2xl bg-slate-100 p-5">
                <p className="text-sm font-semibold text-slate-500">Responsável atual</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700"><UserRound size={20} /></span>
                  <div><p className="font-black text-slate-950">{status.responsavelAtual?.nome ?? 'Não informado'}</p><p className="text-sm text-slate-600">{roleNames[status.responsavelAtual?.role ?? ''] ?? status.responsavelAtual?.role ?? 'Operador'}</p></div>
                </div>
              </div>
              <span className="flex items-center justify-center text-orange-700"><ArrowRight className="rotate-90 sm:rotate-0" size={24} aria-hidden="true" /></span>
              <div className={`rounded-2xl p-5 ${selecionado ? 'bg-orange-50' : 'bg-slate-50'}`}>
                <p className="text-sm font-semibold text-slate-500">Novo responsável</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-700"><UserRound size={20} /></span>
                  <div><p className="font-black text-slate-950">{selecionado?.nome ?? 'Selecione abaixo'}</p><p className="text-sm text-slate-600">{selecionado ? roleNames[selecionado.role] ?? selecionado.role : 'Aguardando escolha'}</p></div>
                </div>
              </div>
            </div>

            <label className="mt-6 block text-sm font-bold text-slate-700">Novo responsável
              <select value={novoResponsavelId} onChange={event => setNovoResponsavelId(event.target.value)} className="mt-2 block h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" required>
                <option value="">Selecione um usuário</option>
                {disponiveis.map(user => <option key={user.id} value={user.id}>{user.nome} · {roleNames[user.role] ?? user.role}</option>)}
              </select>
            </label>
            <label className="mt-5 block text-sm font-bold text-slate-700">Observação
              <textarea value={motivo} onChange={event => setMotivo(event.target.value)} rows={3} maxLength={240} placeholder="Opcional: motivo ou orientação para o próximo responsável" className="mt-2 block w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-6 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
            </label>
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <TenantLink href="/caixa" className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancelar</TenantLink>
              <Button type="submit" isLoading={saving}><ArrowRightLeft size={17} className="mr-2" /> Confirmar transferência</Button>
            </div>
          </section>

          <aside className="rounded-2xl bg-slate-950 p-6 text-white">
            <ShieldCheck size={24} className="text-orange-400" aria-hidden="true" />
            <h2 className="mt-5 text-lg font-black">O movimento fica registrado</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="font-semibold text-slate-400">Caixa</dt><dd className="mt-1 font-bold">#{status.caixa.id}</dd></div>
              <div><dt className="font-semibold text-slate-400">Aberto em</dt><dd className="mt-1 font-bold">{dateTime.format(new Date(status.caixa.abertoEm))}</dd></div>
              <div><dt className="font-semibold text-slate-400">Saldo em dinheiro</dt><dd className="mt-1 text-xl font-black tabular-nums">{money.format(Number(status.dinheiroEsperado ?? 0))}</dd></div>
            </dl>
            <p className="mt-6 border-t border-slate-700 pt-5 text-sm leading-6 text-slate-300">A transferência não retira dinheiro, não encerra comandas e não fecha o caixa.</p>
          </aside>
        </form>
      )}
    </main>
  )
}
