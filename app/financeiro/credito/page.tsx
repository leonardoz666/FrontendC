'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CircleDollarSign, LoaderCircle, LockKeyhole, Search, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { useToast } from '@/contexts/ToastContext'

type Client = { id: number; nome: string; documento?: string | null; telefone?: string | null }
type Agreement = { id: number; nome: string; documento: string | null; limiteCredito: number; diaVencimento: number; bloqueiaAtraso: boolean; ativo: boolean; _count: { clientes: number } }
type Plan = { id: number; nome: string; codigo?: string | null }
type Credit = { autorizado: boolean; limiteCredito: number; diaVencimento: number; bloqueiaAtraso: boolean; bloqueadoEm: string | null; motivoBloqueio: string | null; convenio: Agreement | null }
type Statement = { cliente: Client & { credito: Credit | null }; titulos: Array<{ id: number; descricao: string; competencia: string; valorTotal: number; status: string; parcelas: Array<{ id: number; vencimento: string; valor: number; valorBaixado: number; juros: number; multa: number; desconto: number; status: string }> }>; resumo: { limite: number; aberto: number; disponivel: number; vencido: number } }

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
const today = () => new Date().toISOString().slice(0, 10)
const inputClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100'

export default function CreditPage() {
  const { showToast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [clientId, setClientId] = useState('')
  const [search, setSearch] = useState('')
  const [statement, setStatement] = useState<Statement | null>(null)
  const [saving, setSaving] = useState(false)
  const [agreementForm, setAgreementForm] = useState({ nome: '', documento: '', limiteCredito: '', diaVencimento: '10', bloqueiaAtraso: true })
  const [creditForm, setCreditForm] = useState({ convenioId: '', autorizado: true, limiteCredito: '', diaVencimento: '10', bloqueiaAtraso: true, bloqueado: false, motivoBloqueio: '' })
  const [sale, setSale] = useState({ comandaId: '', planoContaId: '', vencimento: today() })

  const load = useCallback(async () => {
    try {
      const [clientPayload, agreementPayload, planPayload] = await Promise.all([
        apiFetch<Client[] | { data: Client[] }>('/clientes?ativo=true&pageSize=100'),
        apiFetch<Agreement[]>('/financeiro/convenios'),
        apiFetch<Plan[] | { data: Plan[] }>('/plano-contas?ativo=true&pageSize=200'),
      ])
      setClients(Array.isArray(clientPayload) ? clientPayload : clientPayload.data)
      setAgreements(agreementPayload)
      setPlans(Array.isArray(planPayload) ? planPayload : planPayload.data)
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao carregar crédito.', 'error') }
  }, [showToast])
  useEffect(() => { void load() }, [load])

  const selectClient = useCallback(async (id: number) => {
    setClientId(String(id))
    try {
      const next = await apiFetch<Statement>(`/financeiro/clientes/${id}/extrato`); setStatement(next)
      const credit = next.cliente.credito
      setCreditForm({ convenioId: String(credit?.convenio?.id ?? ''), autorizado: credit?.autorizado ?? false, limiteCredito: String(credit?.limiteCredito ?? ''), diaVencimento: String(credit?.diaVencimento ?? 10), bloqueiaAtraso: credit?.bloqueiaAtraso ?? true, bloqueado: Boolean(credit?.bloqueadoEm), motivoBloqueio: credit?.motivoBloqueio ?? '' })
    } catch (error) { showToast(error instanceof Error ? error.message : 'Falha ao carregar extrato do cliente.', 'error') }
  }, [showToast])

  const filteredClients = useMemo(() => clients.filter(item => `${item.nome} ${item.documento ?? ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))), [clients, search])

  const saveAgreement = async () => {
    setSaving(true)
    try { await apiFetch('/financeiro/convenios', { method: 'POST', body: { ...agreementForm, limiteCredito: Number(agreementForm.limiteCredito), diaVencimento: Number(agreementForm.diaVencimento) } }); setAgreementForm({ nome: '', documento: '', limiteCredito: '', diaVencimento: '10', bloqueiaAtraso: true }); showToast('Convênio cadastrado.', 'success'); await load() }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível cadastrar.', 'error') }
    finally { setSaving(false) }
  }

  const saveCredit = async () => {
    if (!clientId) return
    setSaving(true)
    try { await apiFetch(`/financeiro/clientes/${clientId}/credito`, { method: 'PUT', body: { ...creditForm, convenioId: creditForm.convenioId ? Number(creditForm.convenioId) : null, limiteCredito: Number(creditForm.limiteCredito || 0), diaVencimento: Number(creditForm.diaVencimento) } }); showToast('Política de crédito atualizada.', 'success'); await selectClient(Number(clientId)) }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível atualizar.', 'error') }
    finally { setSaving(false) }
  }

  const createCreditSale = async () => {
    if (!clientId) return
    setSaving(true)
    try { await apiFetch('/financeiro/fiado', { method: 'POST', body: { comandaId: Number(sale.comandaId), clienteId: Number(clientId), planoContaId: Number(sale.planoContaId), vencimento: `${sale.vencimento}T12:00:00` } }); setSale({ ...sale, comandaId: '' }); showToast('Venda fechada no fiado e título gerado.', 'success'); await selectClient(Number(clientId)) }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível lançar no fiado.', 'error') }
    finally { setSaving(false) }
  }

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6"><div className="mx-auto max-w-[1550px] space-y-5">
    <header><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-600"><ShieldCheck size={14} /> Crédito controlado</div><h1 className="text-3xl font-black tracking-tight text-slate-950">Convênios e fiado</h1><p className="mt-1 text-sm text-slate-500">Autorize limites, bloqueie inadimplentes e transforme a comanda em conta a receber.</p></header>

    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-4"><h2 className="font-black text-slate-900">Clientes</h2><label className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3"><Search size={15} className="text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou documento" className="min-w-0 flex-1 text-sm outline-none" /></label></div><div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">{filteredClients.map(client => <button key={client.id} onClick={() => void selectClient(client.id)} className={`w-full px-4 py-3 text-left ${clientId === String(client.id) ? 'bg-orange-50 ring-2 ring-inset ring-orange-400' : 'hover:bg-slate-50'}`}><strong className="block text-sm text-slate-900">{client.nome}</strong><small className="text-slate-500">{client.documento || client.telefone || `cliente #${client.id}`}</small></button>)}</div></aside>

      <section className="space-y-5"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{statement?.cliente.nome ?? 'Selecione um cliente'}</h2><p className="text-xs text-slate-500">Extrato individual e disponibilidade em tempo real.</p></div>{statement?.cliente.credito?.bloqueadoEm && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800"><LockKeyhole size={13} /> bloqueado</span>}</div></div>{statement ? <><div className="grid divide-y divide-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0"><Metric label="Limite" value={statement.resumo.limite} /><Metric label="Em aberto" value={statement.resumo.aberto} tone="out" /><Metric label="Disponível" value={statement.resumo.disponivel} tone="in" /><Metric label="Vencido" value={statement.resumo.vencido} tone="out" /></div><div className="max-h-[390px] overflow-y-auto border-t border-slate-200"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-4 py-3">Lançamento</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{statement.titulos.flatMap(title => title.parcelas.map(parcel => { const balance = Number(parcel.valor) + Number(parcel.juros) + Number(parcel.multa) - Number(parcel.desconto) - Number(parcel.valorBaixado); return <tr key={parcel.id}><td className="px-4 py-3"><strong className="block text-slate-900">{title.descricao}</strong><small className="text-slate-400">título #{title.id}</small></td><td className="px-4 py-3 text-slate-600">{date(parcel.vencimento)}</td><td className="px-4 py-3 text-right font-black">{money(balance)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${parcel.status === 'PAGA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{parcel.status.toLocaleLowerCase('pt-BR')}</span></td></tr> }))}</tbody></table>{!statement.titulos.length && <div className="grid h-40 place-items-center text-sm text-slate-400">Cliente sem movimentações financeiras.</div>}</div></> : <div className="grid h-[390px] place-items-center px-8 text-center text-sm text-slate-400"><UserRoundCheck size={36} className="mb-3" />Escolha um cliente para consultar e configurar o crédito.</div>}</div>

        {statement && <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-950">Fechar comanda no fiado</h2><p className="mb-4 mt-1 text-xs text-slate-500">A comanda deve estar aberta, vinculada ao cliente e sem pagamentos anteriores.</p><div className="grid gap-3 sm:grid-cols-3"><label><span className="mb-1 block text-xs font-bold text-slate-600">Comanda</span><input type="number" className={inputClass} value={sale.comandaId} onChange={event => setSale({ ...sale, comandaId: event.target.value })} /></label><label><span className="mb-1 block text-xs font-bold text-slate-600">Plano de contas</span><select className={inputClass} value={sale.planoContaId} onChange={event => setSale({ ...sale, planoContaId: event.target.value })}><option value="">Selecione</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.codigo ? `${plan.codigo} · ` : ''}{plan.nome}</option>)}</select></label><label><span className="mb-1 block text-xs font-bold text-slate-600">Vencimento</span><input type="date" className={inputClass} value={sale.vencimento} onChange={event => setSale({ ...sale, vencimento: event.target.value })} /></label></div><button disabled={saving || !sale.comandaId || !sale.planoContaId} onClick={() => void createCreditSale()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-black text-white disabled:opacity-40"><CircleDollarSign size={16} /> Lançar no fiado</button></div>}
      </section>

      <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><UserRoundCheck size={18} className="text-orange-600" /><h2 className="font-black text-slate-950">Política do cliente</h2></div><div className="mt-4 space-y-3"><label><span className="mb-1 block text-xs font-bold text-slate-600">Convênio</span><select className={inputClass} disabled={!statement} value={creditForm.convenioId} onChange={event => setCreditForm({ ...creditForm, convenioId: event.target.value })}><option value="">Sem convênio</option>{agreements.filter(item => item.ativo).map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><Field label="Limite"><input type="number" className={inputClass} value={creditForm.limiteCredito} onChange={event => setCreditForm({ ...creditForm, limiteCredito: event.target.value })} /></Field><Field label="Dia de vencimento"><input type="number" min="1" max="28" className={inputClass} value={creditForm.diaVencimento} onChange={event => setCreditForm({ ...creditForm, diaVencimento: event.target.value })} /></Field></div><CheckField label="Autorizado a comprar" checked={creditForm.autorizado} onChange={checked => setCreditForm({ ...creditForm, autorizado: checked })} /><CheckField label="Bloquear quando atrasado" checked={creditForm.bloqueiaAtraso} onChange={checked => setCreditForm({ ...creditForm, bloqueiaAtraso: checked })} /><CheckField label="Bloqueio manual" checked={creditForm.bloqueado} onChange={checked => setCreditForm({ ...creditForm, bloqueado: checked })} />{creditForm.bloqueado && <Field label="Motivo"><input className={inputClass} value={creditForm.motivoBloqueio} onChange={event => setCreditForm({ ...creditForm, motivoBloqueio: event.target.value })} /></Field>}<button disabled={!statement || saving} onClick={() => void saveCredit()} className="h-10 w-full rounded-lg bg-slate-950 text-sm font-black text-white disabled:opacity-40">Salvar política</button></div></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Building2 size={18} className="text-orange-600" /><h2 className="font-black text-slate-950">Novo convênio</h2></div><div className="mt-4 space-y-3"><Field label="Nome"><input className={inputClass} value={agreementForm.nome} onChange={event => setAgreementForm({ ...agreementForm, nome: event.target.value })} /></Field><Field label="Documento"><input className={inputClass} value={agreementForm.documento} onChange={event => setAgreementForm({ ...agreementForm, documento: event.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Limite padrão"><input type="number" className={inputClass} value={agreementForm.limiteCredito} onChange={event => setAgreementForm({ ...agreementForm, limiteCredito: event.target.value })} /></Field><Field label="Vencimento"><input type="number" min="1" max="28" className={inputClass} value={agreementForm.diaVencimento} onChange={event => setAgreementForm({ ...agreementForm, diaVencimento: event.target.value })} /></Field></div><CheckField label="Bloquear por atraso" checked={agreementForm.bloqueiaAtraso} onChange={checked => setAgreementForm({ ...agreementForm, bloqueiaAtraso: checked })} /><button disabled={saving || !agreementForm.nome} onClick={() => void saveAgreement()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 text-sm font-black text-white disabled:opacity-40">{saving && <LoaderCircle size={15} className="animate-spin" />} Cadastrar convênio</button></div><div className="mt-4 border-t border-slate-100 pt-3">{agreements.slice(0, 4).map(item => <div key={item.id} className="flex items-center justify-between py-2 text-sm"><span className="font-bold text-slate-700">{item.nome}</span><small className="text-slate-400">{item._count.clientes} clientes</small></div>)}</div></section></aside>
    </div>
  </div></main>
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'in' | 'out' }) { return <div className="p-4"><span className="text-xs font-bold text-slate-500">{label}</span><strong className={`mt-1 block text-lg font-black ${tone === 'in' ? 'text-emerald-700' : tone === 'out' ? 'text-rose-700' : 'text-slate-950'}`}>{money(value)}</strong></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>{children}</label> }
function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"><span>{label}</span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-orange-600" /></label> }
