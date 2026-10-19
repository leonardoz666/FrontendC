'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleDollarSign, KeyRound, LoaderCircle, RefreshCw, RotateCcw, ShieldCheck, WalletCards, XCircle } from 'lucide-react'
import { apiFetch } from '@/app/lib/api'
import { createIdempotencyKey } from '@/app/lib/offline'
import { useToast } from '@/contexts/ToastContext'

type Config = { provedor: string; ambiente: string; ativo: boolean; credenciaisConfiguradas: boolean; webhookSecretConfigurado: boolean; atualizadoEm: string | null }
type Transaction = { id: string; provedorTransacaoId: string; referenciaPedido: string; status: string; valorBruto: number; valorTaxa: number; valorLiquido: number; conciliadoEm: string | null; criadoEm: string }
type Report = { quantidade: number; bruto: number; taxa: number; liquido: number; conciliadas: number; pendentesConciliacao: number; porStatus: Record<string, number> }

const inputClass = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR')

export default function GatewayPage() {
  const { showToast } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [form, setForm] = useState({ provedor: 'FAKE', ambiente: 'SANDBOX', credenciais: '', webhookSecret: '', ativo: false })
  const [intent, setIntent] = useState({ referenciaPedido: '', valor: '', taxa: '0' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextConfig, list, summary] = await Promise.all([
        apiFetch<Config>('/gateway/configuracao'),
        apiFetch<{ data: Transaction[] }>('/gateway/transacoes?pageSize=50'),
        apiFetch<Report>('/gateway/relatorio'),
      ])
      setConfig(nextConfig); setTransactions(list.data); setReport(summary)
      setForm(current => ({ ...current, provedor: nextConfig.provedor, ambiente: nextConfig.ambiente, ativo: nextConfig.ativo }))
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar o gateway.', 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    setWorking(true)
    try {
      await apiFetch('/gateway/configuracao', { method: 'PUT', body: form })
      setForm(current => ({ ...current, credenciais: '', webhookSecret: '' }))
      showToast('Configuração do gateway salva.', 'success'); await load()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error') }
    finally { setWorking(false) }
  }

  const createIntent = async () => {
    if (!intent.referenciaPedido.trim() || Number(intent.valor) <= 0) return showToast('Informe a referência e o valor.', 'error')
    setWorking(true)
    try {
      await apiFetch('/gateway/intencoes', { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() }, body: { referenciaPedido: intent.referenciaPedido, valor: Number(intent.valor), taxa: Number(intent.taxa || 0) } })
      setIntent({ referenciaPedido: '', valor: '', taxa: '0' }); showToast('Intenção autorizada no sandbox.', 'success'); await load()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível criar a intenção.', 'error') }
    finally { setWorking(false) }
  }

  const transition = async (transaction: Transaction, action: 'capturar' | 'cancelar' | 'estornar') => {
    setWorking(true)
    try {
      await apiFetch(`/gateway/transacoes/${transaction.id}/${action}`, { method: 'POST', headers: { 'Idempotency-Key': createIdempotencyKey() } })
      showToast(action === 'capturar' ? 'Pagamento capturado.' : action === 'cancelar' ? 'Pagamento cancelado.' : 'Pagamento estornado.', 'success'); await load()
    } catch (error) { showToast(error instanceof Error ? error.message : 'A operação não foi concluída.', 'error') }
    finally { setWorking(false) }
  }

  const rate = useMemo(() => report?.quantidade ? Math.round((report.conciliadas / report.quantidade) * 100) : 0, [report])

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6"><div className="mx-auto max-w-[1500px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-orange-600"><WalletCards size={14} /> Financeiro conectado</div><h1 className="text-3xl font-black tracking-tight text-slate-950">Pagamentos online</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Autorize, capture e confira cada valor recebido. Dados de cartão não passam nem ficam salvos no ControlaÊ.</p></div><button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar</button></header>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]"><div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-black text-slate-950">Conexão do provedor</h2><p className="mt-1 text-xs text-slate-500">O modo fake é determinístico e seguro para testar o fluxo completo.</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${form.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{form.ativo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{form.ativo ? 'Ativo' : 'Inativo'}</span></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Provedor<select className={`${inputClass} mt-1.5`} value={form.provedor} onChange={event => setForm({ ...form, provedor: event.target.value })}><option value="FAKE">Fake / sandbox</option><option value="PAGARME">Pagar.me (aguarda homologação)</option><option value="CIELO">Cielo (aguarda homologação)</option></select></label><label className="text-xs font-bold text-slate-600">Ambiente<select className={`${inputClass} mt-1.5`} value={form.ambiente} onChange={event => setForm({ ...form, ambiente: event.target.value })}><option value="SANDBOX">Sandbox</option><option value="PRODUCAO">Produção</option></select></label><label className="text-xs font-bold text-slate-600">Credenciais<input type="password" autoComplete="new-password" className={`${inputClass} mt-1.5`} value={form.credenciais} onChange={event => setForm({ ...form, credenciais: event.target.value })} placeholder={config?.credenciaisConfiguradas ? 'Configuradas — deixe vazio para manter' : 'Chave fornecida pelo provedor'} /></label><label className="text-xs font-bold text-slate-600">Segredo do webhook<input type="password" autoComplete="new-password" className={`${inputClass} mt-1.5`} value={form.webhookSecret} onChange={event => setForm({ ...form, webhookSecret: event.target.value })} placeholder={config?.webhookSecretConfigurado ? 'Configurado — deixe vazio para manter' : 'Opcional no fake'} /></label></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={form.ativo} onChange={event => setForm({ ...form, ativo: event.target.checked })} /> Permitir novas transações</label><button disabled={working} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">{working ? <LoaderCircle size={16} className="animate-spin" /> : <KeyRound size={16} />} Salvar conexão</button></div></div>
      <div className="bg-slate-950 p-5 text-white"><div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="text-orange-400" size={19} /> Estado operacional</div><div className="mt-7 grid grid-cols-[1fr_auto] gap-x-4 gap-y-5"><Metric dark label="Volume bruto" value={money(report?.bruto ?? 0)} /><Metric dark label="Taxas" value={`− ${money(report?.taxa ?? 0)}`} /><Metric dark label="Valor líquido" value={money(report?.liquido ?? 0)} strong /><Metric dark label="Conciliação" value={`${rate}%`} /></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${rate}%` }} /></div><p className="mt-2 text-xs text-slate-400">{report?.pendentesConciliacao ?? 0} captura(s) ainda sem vínculo com o razão financeiro.</p></div></div></section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-[1fr_160px_130px_auto]"><div><h2 className="font-black text-slate-950">Nova cobrança de teste</h2><p className="mt-1 text-xs text-slate-500">Use uma referência interna; a resposta fake será sempre reproduzível pela chave idempotente.</p><input className={`${inputClass} mt-3`} value={intent.referenciaPedido} onChange={event => setIntent({ ...intent, referenciaPedido: event.target.value })} placeholder="Ex.: delivery-1842" /></div><label className="self-end text-xs font-bold text-slate-600">Valor bruto<input type="number" min="0.01" step="0.01" className={`${inputClass} mt-1.5`} value={intent.valor} onChange={event => setIntent({ ...intent, valor: event.target.value })} /></label><label className="self-end text-xs font-bold text-slate-600">Taxa<input type="number" min="0" step="0.01" className={`${inputClass} mt-1.5`} value={intent.taxa} onChange={event => setIntent({ ...intent, taxa: event.target.value })} /></label><button disabled={working || !form.ativo} onClick={() => void createIntent()} className="mt-auto h-11 rounded-xl bg-orange-600 px-5 text-sm font-black text-white disabled:opacity-40">Autorizar teste</button></div>
      <div className="divide-y divide-slate-100 md:hidden">{transactions.map(item => <article key={item.id} className="space-y-3 p-4"><div><strong className="block text-slate-950">{item.referenciaPedido}</strong><span className="text-xs text-slate-500">{dateTime(item.criadoEm)} · {item.provedorTransacaoId}</span></div><StatusTrack status={item.status} reconciled={Boolean(item.conciliadoEm)} /><dl className="grid grid-cols-3 gap-2 text-xs"><div><dt className="text-slate-500">Bruto</dt><dd className="font-bold text-slate-800">{money(item.valorBruto)}</dd></div><div><dt className="text-slate-500">Taxa</dt><dd className="font-bold text-rose-700">− {money(item.valorTaxa)}</dd></div><div><dt className="text-slate-500">Líquido</dt><dd className="font-black text-emerald-700">{money(item.valorLiquido)}</dd></div></dl><div className="flex gap-2">{item.status === 'AUTHORIZED' && <><button onClick={() => void transition(item, 'capturar')} className="h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-black text-white">Capturar</button><button onClick={() => void transition(item, 'cancelar')} className="h-10 flex-1 rounded-lg border border-rose-300 text-sm font-black text-rose-700">Cancelar</button></>}{item.status === 'CAPTURED' && <button onClick={() => void transition(item, 'estornar')} className="h-10 w-full rounded-lg border border-slate-300 text-sm font-black text-slate-700">Estornar</button>}</div></article>)}{!transactions.length && <div className="grid min-h-36 place-items-center px-6 text-center text-sm text-slate-400">Ative o sandbox e crie a primeira cobrança de teste.</div>}</div>
      <div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-4 py-3">Referência</th><th className="px-4 py-3">Trilho da operação</th><th className="px-4 py-3 text-right">Bruto</th><th className="px-4 py-3 text-right">Taxa</th><th className="px-4 py-3 text-right">Líquido</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{transactions.map(item => <tr key={item.id}><td className="px-4 py-3"><strong className="block text-slate-900">{item.referenciaPedido}</strong><small className="text-slate-400">{dateTime(item.criadoEm)} · {item.provedorTransacaoId}</small></td><td className="px-4 py-3"><StatusTrack status={item.status} reconciled={Boolean(item.conciliadoEm)} /></td><td className="px-4 py-3 text-right font-bold">{money(item.valorBruto)}</td><td className="px-4 py-3 text-right text-rose-700">− {money(item.valorTaxa)}</td><td className="px-4 py-3 text-right font-black text-emerald-700">{money(item.valorLiquido)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1">{item.status === 'AUTHORIZED' && <><Action title="Capturar" onClick={() => void transition(item, 'capturar')}><CircleDollarSign size={15} /></Action><Action title="Cancelar" onClick={() => void transition(item, 'cancelar')}><XCircle size={15} /></Action></>}{item.status === 'CAPTURED' && <Action title="Estornar" onClick={() => void transition(item, 'estornar')}><RotateCcw size={15} /></Action>}</div></td></tr>)}</tbody></table>{!transactions.length && <div className="grid min-h-36 place-items-center px-6 text-center text-sm text-slate-400">Ative o sandbox e crie a primeira cobrança de teste.</div>}</div>
    </section>
  </div></main>
}

function Metric({ label, value, strong, dark }: { label: string; value: string; strong?: boolean; dark?: boolean }) { return <><span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span><strong className={`${strong ? 'text-xl text-emerald-400' : 'text-sm'} text-right`}>{value}</strong></> }
function Action({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) { return <button title={title} aria-label={title} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-700">{children}</button> }
function StatusTrack({ status, reconciled }: { status: string; reconciled: boolean }) { const steps = ['AUTHORIZED', 'CAPTURED', 'CONCILIADO']; const position = status === 'AUTHORIZED' ? 0 : status === 'CAPTURED' ? 1 : reconciled ? 2 : -1; const terminal = ['CANCELED', 'REFUNDED', 'FAILED'].includes(status); return <div className="min-w-[220px]"><div className="flex items-center"><span className={`h-2.5 w-2.5 rounded-full ${terminal ? 'bg-rose-500' : 'bg-emerald-500'}`} />{steps.slice(1).map((step, index) => <span key={step} className="flex flex-1 items-center"><span className={`h-px flex-1 ${!terminal && position > index ? 'bg-emerald-500' : 'bg-slate-200'}`} /><span className={`h-2.5 w-2.5 rounded-full ${!terminal && position > index ? 'bg-emerald-500' : 'bg-slate-200'}`} /></span>)}</div><div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400"><span>{terminal ? status : 'autorizado'}</span><span>capturado</span><span>conciliado</span></div></div> }
