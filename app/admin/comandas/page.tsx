'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Printer, RotateCcw, Save, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/app/lib/api'
import {
  DEFAULT_COMANDA_CONFIG,
  type BillTicketStyle,
  type ComandaConfig,
  type OrderTicketStyle,
  type TicketStyle
} from '@/app/lib/comanda-config'
import { Button } from '@/app/components/ui/Button'
import { Switch } from '@/app/components/ui/Switch'
import { PageLoader } from '@/app/components/ui/PageLoader'
import { useToast } from '@/contexts/ToastContext'

type Tab = 'geral' | 'pedido' | 'parcial' | 'fechamento'
type Paper = 58 | 80

const tabs: Array<{ id: Tab; label: string; detail: string }> = [
  { id: 'geral', label: 'Geral', detail: 'Identificação e papel' },
  { id: 'pedido', label: 'Pedidos', detail: 'Produção e cozinha' },
  { id: 'parcial', label: 'Parcial', detail: 'Conferência da mesa' },
  { id: 'fechamento', label: 'Fechamento', detail: 'Recibo após pagamento' }
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block">
    <span className="block text-sm font-bold text-slate-800">{label}</span>
    {hint && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{hint}</span>}
    <span className="mt-2 block">{children}</span>
  </label>
}

const inputClass = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'

function BooleanGrid({ values, onChange, bill = false }: {
  values: OrderTicketStyle | BillTicketStyle
  onChange: (key: string, value: boolean) => void
  bill?: boolean
}) {
  const common: Array<[keyof TicketStyle, string, string]> = [
    ['tituloGrande', 'Título grande', 'Destaca o tipo do documento sem aumentar sua largura.'],
    ['itensGrandes', 'Itens grandes', 'Aumenta a altura das letras para leitura à distância.'],
    ['itensEmNegrito', 'Itens em negrito', 'Reforça nomes e quantidades.'],
    ['itensMaiusculos', 'Itens em maiúsculas', 'Padroniza os nomes impressos.'],
    ['mostrarData', 'Mostrar data', 'Exibe a data da emissão.'],
    ['mostrarHora', 'Mostrar hora', 'Exibe hora e minuto da emissão.']
  ]
  const order: Array<[keyof OrderTicketStyle, string, string]> = [
    ['mostrarNumeroComanda', 'Número da comanda', 'Identificador no título.'],
    ['mostrarNumeroPedido', 'Número do pedido', 'Identificador do envio para a produção.'],
    ['mostrarMesa', 'Número da mesa', 'Mesa que originou o pedido.'],
    ['mostrarGarcom', 'Nome do garçom', 'Responsável pelo atendimento.'],
    ['mostrarObservacoes', 'Observações dos itens', 'Imprime recados para a produção.']
  ]
  const account: Array<[keyof BillTicketStyle, string, string]> = [
    ['mostrarEstabelecimento', 'Nome do estabelecimento', 'Cabeçalho da conta.'],
    ['mostrarEndereco', 'Endereço', 'Usa o endereço definido em Geral.'],
    ['mostrarDocumento', 'CNPJ ou documento', 'Usa o documento definido em Geral.'],
    ['mostrarPrecoUnitario', 'Preço unitário', 'Detalha quantidade vezes preço.'],
    ['mostrarSubtotal', 'Subtotal', 'Mostra o valor antes dos adicionais.'],
    ['mostrarServico', 'Taxa de serviço', 'Mostra a taxa quando houver.'],
    ['mostrarDesconto', 'Desconto', 'Mostra o abatimento quando houver.'],
    ['mostrarPagamento', 'Forma de pagamento', 'Forma, valor pago e troco.'],
    ['mostrarSaldo', 'Saldo restante', 'Útil para parciais e pagamentos incompletos.'],
    ['mostrarRodape', 'Mensagem de rodapé', 'Usa o texto definido em Geral.']
  ]
  const options = [...common, ...(bill ? account : order)]
  return <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
    {options.map(([key, label, description]) => <Switch
      key={String(key)} checked={Boolean(values[key as keyof typeof values])}
      onCheckedChange={checked => onChange(String(key), checked)}
      label={label} description={description} className="py-3.5"
    />)}
  </div>
}

function Preview({ config, tab, paper }: { config: ComandaConfig; tab: Tab; paper: Paper }) {
  const doc = tab === 'geral' ? 'pedido' : tab
  const style = config[doc]
  const bill = doc !== 'pedido'
  const billStyle = bill ? style as BillTicketStyle : null
  const orderStyle = !bill ? style as OrderTicketStyle : null
  const divider = config.geral.separador.repeat(paper === 58 ? 32 : 42)
  const itemName = style.itensMaiusculos ? 'ABARÁ DO REI' : 'Abará do Rei'
  const date = [style.mostrarData && '14/10/2026', style.mostrarHora && '19:46'].filter(Boolean).join(' ')
  const pad = config.geral.margemEsquerda * (paper === 58 ? 2 : 2.3)

  return <div className="flex min-h-[34rem] items-start justify-center rounded-xl bg-slate-900 p-4 sm:p-7">
    <div
      className="min-h-[30rem] bg-[#fffef8] px-4 py-6 text-[#171717] shadow-[0_18px_36px_rgba(0,0,0,.28)] transition-[width] duration-300"
      style={{ width: paper === 58 ? '17rem' : '22rem', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}
      aria-label={`Prévia da impressão em papel ${paper} milímetros`}
    >
      {bill && billStyle?.mostrarEstabelecimento && <p className="text-center text-sm font-bold">{config.geral.nomeEstabelecimento}</p>}
      {bill && billStyle?.mostrarEndereco && config.geral.endereco && <p className="text-center text-[10px]">{config.geral.endereco}</p>}
      {bill && billStyle?.mostrarDocumento && config.geral.documento && <p className="text-center text-[10px]">{config.geral.documento}</p>}
      <p className={`mt-2 break-words text-center font-bold leading-tight ${style.tituloGrande ? 'text-xl' : 'text-sm'}`}>
        {style.titulo}{orderStyle?.mostrarNumeroComanda ? ' #0005' : ''}
      </p>
      <p className="my-2 overflow-hidden whitespace-nowrap text-[9px] tracking-[-.08em]">{divider}</p>
      <div style={{ paddingLeft: `${pad}px` }}>
        {(orderStyle?.mostrarMesa || bill) && <p className={orderStyle ? 'text-lg font-bold' : 'text-xs'}>MESA: 10</p>}
        {orderStyle?.mostrarGarcom && <p className="text-lg font-bold">GARÇOM: DONO</p>}
        {orderStyle?.mostrarNumeroPedido && <p className="text-sm font-bold">PEDIDO: #108</p>}
        {date && <p className="mt-1 text-[10px]">{date}</p>}
      </div>
      <p className="my-2 overflow-hidden whitespace-nowrap text-[9px] tracking-[-.08em]">{divider}</p>
      <div style={{ paddingLeft: `${pad}px` }}>
        <p className={`${style.itensGrandes ? 'text-lg' : 'text-xs'} ${style.itensEmNegrito ? 'font-bold' : ''}`}>01X&nbsp; {itemName}</p>
        {billStyle?.mostrarPrecoUnitario && <p className="mt-1 text-[10px]">1 x R$ 18,00</p>}
        {bill && <p className="text-right text-xs">R$ 18,00</p>}
        {orderStyle?.mostrarObservacoes && <p className="mt-3 text-[10px]">OBS: SEM PIMENTA</p>}
      </div>
      {bill && <>
        <p className="my-2 overflow-hidden whitespace-nowrap text-[9px] tracking-[-.08em]">{divider}</p>
        <div className="space-y-1 text-right text-xs">
          {billStyle?.mostrarSubtotal && <p>SUBTOTAL: R$ 18,00</p>}
          {billStyle?.mostrarServico && <p>SERVIÇO: R$ 1,80</p>}
          {billStyle?.mostrarDesconto && <p>DESCONTO: -R$ 2,00</p>}
          <p className="font-bold">TOTAL: R$ 19,80</p>
        </div>
        {billStyle?.mostrarPagamento && <div className="mt-4 text-xs"><p>FORMA PAGTO: PIX</p><p>VALOR PAGO: R$ 19,80</p></div>}
        {billStyle?.mostrarSaldo && <p className="mt-4 text-xs font-bold">SALDO RESTANTE: R$ 19,80</p>}
        {billStyle?.mostrarRodape && <div className="mt-6 whitespace-pre-line text-center text-[10px]">{config.geral.rodape}</div>}
      </>}
      <p className="mt-8 text-center text-[9px] text-slate-400">corte</p>
    </div>
  </div>
}

export default function ComandasPage() {
  const { showToast } = useToast()
  const [config, setConfig] = useState<ComandaConfig>(DEFAULT_COMANDA_CONFIG)
  const [original, setOriginal] = useState<ComandaConfig>(DEFAULT_COMANDA_CONFIG)
  const [tab, setTab] = useState<Tab>('pedido')
  const [paper, setPaper] = useState<Paper>(58)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(original), [config, original])

  useEffect(() => {
    apiFetch<ComandaConfig>('/comandas/configuracao')
      .then(value => { setConfig(value); setOriginal(value) })
      .catch(error => showToast(error instanceof Error ? error.message : 'Falha ao carregar configurações', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const updateGeneral = <K extends keyof ComandaConfig['geral']>(key: K, value: ComandaConfig['geral'][K]) =>
    setConfig(current => ({ ...current, geral: { ...current.geral, [key]: value } }))
  const updateStyle = (key: string, value: string | number | boolean) => {
    const target = tab === 'geral' ? 'pedido' : tab
    setConfig(current => ({ ...current, [target]: { ...current[target], [key]: value } }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await apiFetch<ComandaConfig>('/comandas/configuracao', { method: 'PUT', body: config })
      setConfig(saved); setOriginal(saved)
      showToast('Configuração das comandas salva', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar', 'error')
    } finally { setSaving(false) }
  }

  const reset = async () => {
    if (!resetArmed) { setResetArmed(true); return }
    setSaving(true)
    try {
      const saved = await apiFetch<ComandaConfig>('/comandas/configuracao/restaurar', { method: 'POST' })
      setConfig(saved); setOriginal(saved); setResetArmed(false)
      showToast('Padrão de fábrica restaurado', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível restaurar', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader compact message="Carregando comandas" detail="Preparando configurações e prévia" />
  const currentStyle = tab === 'geral' ? config.pedido : config[tab]

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1480px]">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-700"><ArrowLeft size={16} /> Painel</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Comandas impressas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Configure pedidos, parciais e fechamentos. A prévia acompanha cada alteração; o papel real continua definido em cada impressora.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={resetArmed ? 'danger' : 'outline'} onClick={() => void reset()} disabled={saving}>
            <RotateCcw size={16} />{resetArmed ? 'Confirmar restauração' : 'Restaurar padrão'}
          </Button>
          <Button onClick={() => void save()} disabled={!dirty} isLoading={saving}><Save size={16} />Salvar alterações</Button>
        </div>
      </header>

      {dirty && <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"><span className="h-2 w-2 rounded-full bg-amber-500" />Há alterações ainda não salvas.</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <nav className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 lg:grid-cols-4" aria-label="Tipos de comanda">
            {tabs.map(item => <button key={item.id} type="button" onClick={() => { setTab(item.id); setResetArmed(false) }} className={`min-h-16 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 ${tab === item.id ? 'bg-white text-orange-700 shadow-[inset_0_-3px_0_#ea580c]' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}>
              <span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-[11px]">{item.detail}</span>
            </button>)}
          </nav>

          <div className="p-4 sm:p-6">
            {tab === 'geral' ? <div className="space-y-6">
              <div><h2 className="text-lg font-bold text-slate-950">Identidade e acabamento</h2><p className="mt-1 text-sm text-slate-500">Esses dados podem aparecer nas contas parcial e final.</p></div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nome do estabelecimento"><input className={inputClass} value={config.geral.nomeEstabelecimento} maxLength={60} onChange={e => updateGeneral('nomeEstabelecimento', e.target.value)} /></Field>
                <Field label="CNPJ ou documento"><input className={inputClass} value={config.geral.documento} maxLength={60} placeholder="00.000.000/0001-00" onChange={e => updateGeneral('documento', e.target.value)} /></Field>
                <Field label="Endereço"><input className={inputClass} value={config.geral.endereco} maxLength={100} placeholder="Rua, número — bairro" onChange={e => updateGeneral('endereco', e.target.value)} /></Field>
                <Field label="Separador" hint="O caractere = foi removido porque algumas impressoras o duplicam visualmente."><span className="relative block"><select className={`${inputClass} appearance-none pr-10`} value={config.geral.separador} onChange={e => updateGeneral('separador', e.target.value as '-' | '.' | '_')}><option value="-">Traços  —————</option><option value=".">Pontos  ···········</option><option value="_">Sublinhado  ______</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-slate-400" /></span></Field>
                <Field label="Margem esquerda" hint="Ajuda impressoras cuja cabeça corta os primeiros caracteres."><input type="range" min={0} max={4} value={config.geral.margemEsquerda} onChange={e => updateGeneral('margemEsquerda', Number(e.target.value))} className="w-full accent-orange-600" /><span className="mt-1 block text-xs font-bold text-slate-600">{config.geral.margemEsquerda} coluna(s)</span></Field>
                <Field label="Avanço antes do corte"><input type="range" min={1} max={6} value={config.geral.linhasAntesCorte} onChange={e => updateGeneral('linhasAntesCorte', Number(e.target.value))} className="w-full accent-orange-600" /><span className="mt-1 block text-xs font-bold text-slate-600">{config.geral.linhasAntesCorte} linha(s)</span></Field>
              </div>
              <Field label="Mensagem de rodapé" hint="Uma linha por mensagem; usada quando o rodapé estiver ativo."><textarea className={`${inputClass} min-h-24 resize-y py-3`} value={config.geral.rodape} maxLength={120} onChange={e => updateGeneral('rodape', e.target.value)} /></Field>
            </div> : <div className="space-y-6">
              <div><h2 className="text-lg font-bold text-slate-950">{tabs.find(item => item.id === tab)?.label}</h2><p className="mt-1 text-sm text-slate-500">Escolha o conteúdo e a hierarquia deste tipo de impressão.</p></div>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <Field label="Título impresso"><input className={inputClass} value={currentStyle.titulo} maxLength={40} onChange={e => updateStyle('titulo', e.target.value)} /></Field>
                <Field label="Número de cópias"><select className={inputClass} value={currentStyle.copias} onChange={e => updateStyle('copias', Number(e.target.value))}><option value={1}>1 cópia</option><option value={2}>2 cópias</option><option value={3}>3 cópias</option></select></Field>
              </div>
              <BooleanGrid values={currentStyle} bill={tab !== 'pedido'} onChange={updateStyle} />
            </div>}
          </div>
        </section>

        <aside className="xl:sticky xl:top-5 xl:self-start">
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-[0_16px_34px_rgba(15,23,42,.18)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-white">
              <div className="flex items-center gap-2"><Printer size={17} /><span className="text-sm font-bold">Prévia aproximada</span></div>
              <div className="flex rounded-lg bg-slate-800 p-1" aria-label="Largura do papel">
                {[58, 80].map(width => <button key={width} onClick={() => setPaper(width as Paper)} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${paper === width ? 'bg-orange-600 text-white' : 'text-slate-300 hover:text-white'}`}>{width} mm</button>)}
              </div>
            </div>
            <Preview config={config} tab={tab} paper={paper} />
            <div className="flex gap-2 border-t border-slate-800 px-4 py-3 text-xs leading-5 text-slate-300"><SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0" /><p>A largura final vem da impressora cadastrada. A prévia serve para conferir conteúdo e destaque.</p></div>
          </div>
          {!dirty && <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700"><Check size={14} />Configuração sincronizada</p>}
        </aside>
      </div>
    </div>
  </main>
}
