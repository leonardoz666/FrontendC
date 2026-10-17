'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Clock3, Download, FileSpreadsheet, LoaderCircle, Plus, ReceiptText, Upload, UserRound, X } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/app/components/ui/DataTable'
import { ExportMenu } from '@/app/components/ui/ExportMenu'
import { apiFetch, apiRequest } from '@/app/lib/api'
import type { PaginationMeta, SortOrder } from '@/app/lib/pagination'
import { useToast } from '@/contexts/ToastContext'

type Cliente = { id: number; nome: string; telefone: string | null; documento: string | null; email: string | null; dataNascimento?: string | null; observacoes?: string | null; ativo: boolean; criadoEm: string }
type Form = { nome: string; telefone: string; documento: string; email: string; dataNascimento: string; observacoes: string; ativo: boolean }
type Historico = {
  cliente: Cliente & { enderecos: Array<{ id: number; apelido: string | null; logradouro: string; numero: string | null; bairro: string; cidade: string; uf: string; principal: boolean }>; consentimentos: Array<{ id: number; finalidade: string; canal: string; concedido: boolean; registradoEm: string }> }
  summary: { atendimentos: number; totalGasto: number; ultimaVisita: string | null }
  comandas: Array<{ id: number; canal: string; status: string; total: number; abertaEm: string; fechadaEm: string | null; mesa: { numero: number } | null; pedidos: Array<{ id: number; itens: Array<{ id: number; quantidade: number; produto: { nome: string } }> }>; pagamentos: Array<{ tipo: string; valor: number; status: string }> }>
}
type ImportPreview = {
  hash: string
  linhas: Array<{ linha: number; nome: string; telefone: string | null; documento: string | null; email: string | null; clienteExistenteId?: number }>
  erros: Array<{ linha: number; coluna: string; mensagem: string }>
  resumo: { validas: number; invalidas: number; novos: number; atualizados: number }
}
const EMPTY: Form = { nome: '', telefone: '', documento: '', email: '', dataNascimento: '', observacoes: '', ativo: true }

export default function ClientesPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<Cliente[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, pageSize: 25, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<string | null>('nome')
  const [order, setOrder] = useState<SortOrder | null>('asc')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<Historico | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [mergeSource, setMergeSource] = useState<Cliente | null>(null)
  const [mergeSearch, setMergeSearch] = useState('')
  const [mergeCandidates, setMergeCandidates] = useState<Cliente[]>([])
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)
  const [merging, setMerging] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(meta.page), pageSize: String(meta.pageSize), search, sort: sort ?? 'nome', order: order ?? 'asc' })
      const response = await apiFetch<{ data: Cliente[]; meta: PaginationMeta }>(`/clients?${params}`)
      setData(response.data); setMeta(response.meta)
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível carregar os clientes.', 'error') }
    finally { setLoading(false) }
  }, [meta.page, meta.pageSize, order, search, showToast, sort])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => {
    if (!mergeSource) return
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiFetch<{ data: Cliente[] }>(`/clients?page=1&pageSize=100&search=${encodeURIComponent(mergeSearch)}&sort=nome&order=asc`)
        setMergeCandidates(response.data.filter(item => item.id !== mergeSource.id))
      } catch { setMergeCandidates([]) }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [mergeSearch, mergeSource])

  const edit = (cliente: Cliente) => {
    setEditing(cliente)
    setForm({ nome: cliente.nome, telefone: cliente.telefone ?? '', documento: cliente.documento ?? '', email: cliente.email ?? '', dataNascimento: cliente.dataNascimento?.slice(0, 10) ?? '', observacoes: cliente.observacoes ?? '', ativo: cliente.ativo })
    setOpen(true)
  }
  const create = () => { setEditing(null); setForm(EMPTY); setOpen(true) }
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!form.nome.trim()) return
    setSaving(true)
    try {
      await apiFetch(editing ? `/clients/${editing.id}` : '/clients', { method: editing ? 'PUT' : 'POST', body: form })
      showToast(editing ? 'Cliente atualizado.' : 'Cliente cadastrado.', 'success'); setOpen(false); await load()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível salvar o cliente.', 'error') }
    finally { setSaving(false) }
  }
  const openHistory = async (cliente: Cliente) => {
    setHistoryLoading(true)
    try { setHistory(await apiFetch<Historico>(`/clients/${cliente.id}/history`)) }
    catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível abrir o histórico.', 'error') }
    finally { setHistoryLoading(false) }
  }
  const startMerge = (cliente: Cliente) => { setMergeSource(cliente); setMergeSearch(''); setMergeTargetId(null); setMergeCandidates([]) }
  const merge = async () => {
    if (!mergeSource || !mergeTargetId) return
    setMerging(true)
    try {
      await apiFetch(`/clients/${mergeSource.id}/merge`, { method: 'POST', body: { targetId: mergeTargetId } })
      showToast('Clientes mesclados. Histórico e vínculos foram preservados.', 'success'); setMergeSource(null); await load()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível mesclar os clientes.', 'error') }
    finally { setMerging(false) }
  }
  const exportRows = async () => {
    const response = await apiFetch<{ data: Cliente[]; meta: { truncated: boolean } }>(`/clients/export?search=${encodeURIComponent(search)}`)
    if (response.meta.truncated) showToast('A exportação foi limitada aos primeiros 10.000 clientes.', 'warning')
    return response.data.map(item => ({ id: item.id, nome: item.nome, telefone: item.telefone || '', documento: item.documento || '', email: item.email || '', status: item.ativo ? 'Ativo' : 'Inativo', cadastro: new Date(item.criadoEm).toLocaleDateString('pt-BR') }))
  }
  const columns: Array<DataTableColumn<Cliente>> = [
    { key: 'nome', header: 'Cliente', sortKey: 'nome', render: item => <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-700"><UserRound size={17} /></span><div><strong className="block text-sm text-slate-900">{item.nome}</strong><span className="text-xs text-slate-500">Desde {new Date(item.criadoEm).toLocaleDateString('pt-BR')}</span></div></div> },
    { key: 'telefone', header: 'Telefone', render: item => item.telefone || '—' },
    { key: 'documento', header: 'Documento', render: item => item.documento || '—', hideOnMobile: true },
    { key: 'email', header: 'E-mail', render: item => item.email || '—', hideOnMobile: true },
    { key: 'ativo', header: 'Status', render: item => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span> },
  ]

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-7xl"><header className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-slate-950">Clientes</h1><p className="mt-1 text-sm text-slate-500">Cadastro, histórico de consumo e consolidação de duplicidades.</p></div><div className="flex flex-wrap gap-2"><ExportMenu fileName="clientes" title="Cadastro de clientes" getRows={exportRows} disabled={loading} /><button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 hover:border-orange-300 hover:text-orange-700"><Upload size={18} /> Importar</button><button type="button" onClick={create} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white hover:bg-orange-700"><Plus size={18} /> Novo cliente</button></div></header><DataTable columns={columns} data={data} getRowId={item => item.id} meta={meta} loading={loading} itemLabel="clientes" storageKey="admin-clientes" onSearch={value => { setSearch(value); setMeta(current => ({ ...current, page: 1 })) }} onPageChange={page => setMeta(current => ({ ...current, page }))} onPageSizeChange={pageSize => setMeta(current => ({ ...current, pageSize, page: 1 }))} onSort={(field, direction) => { setSort(field); setOrder(direction); setMeta(current => ({ ...current, page: 1 })) }} rowActions={{ onEdit: edit, editLabel: 'Editar cliente', extra: item => <><button type="button" onClick={() => void openHistory(item)} disabled={historyLoading} title="Ver histórico" aria-label="Ver histórico" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-orange-700"><Clock3 size={16} /></button><button type="button" onClick={() => startMerge(item)} title="Mesclar duplicado" aria-label="Mesclar duplicado" className="rounded-lg p-1.5 text-violet-600 hover:bg-violet-50"><ArrowRightLeft size={16} /></button></> }} emptyMessage="Nenhum cliente cadastrado" ariaLabel="Clientes" /></div>

    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="client-form-title"><form onSubmit={save} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 id="client-form-title" className="text-xl font-black text-slate-950">{editing ? 'Editar cliente' : 'Novo cliente'}</h2><p className="mt-1 text-sm text-slate-500">Dados usados no atendimento e relacionamento.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header><div className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Nome" required value={form.nome} onChange={value => setForm(current => ({ ...current, nome: value }))} wide /><Field label="Telefone" value={form.telefone} onChange={value => setForm(current => ({ ...current, telefone: value }))} /><Field label="Documento" value={form.documento} onChange={value => setForm(current => ({ ...current, documento: value }))} /><Field label="E-mail" type="email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} /><Field label="Nascimento" type="date" value={form.dataNascimento} onChange={value => setForm(current => ({ ...current, dataNascimento: value }))} /><label className="text-sm font-bold text-slate-700 sm:col-span-2">Observações<textarea value={form.observacoes} onChange={event => setForm(current => ({ ...current, observacoes: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-orange-400" /></label><label className="flex items-center gap-2 text-sm font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={form.ativo} onChange={event => setForm(current => ({ ...current, ativo: event.target.checked }))} className="h-4 w-4 accent-orange-600" /> Cliente ativo</label></div><footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700">Cancelar</button><button type="submit" disabled={saving || !form.nome.trim()} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving && <LoaderCircle size={16} className="animate-spin" />} Salvar cliente</button></footer></form></div>}

    {history && <HistoryModal value={history} onClose={() => setHistory(null)} />}
    {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImported={async () => { setImportOpen(false); await load() }} />}
    {mergeSource && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="merge-title"><section className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="merge-title" className="text-xl font-black text-slate-950">Mesclar cliente duplicado</h2><p className="mt-1 text-sm text-slate-500">Origem: <strong>{mergeSource.nome}</strong>. O cadastro será inativado após mover todo o histórico.</p></div><button type="button" onClick={() => setMergeSource(null)} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header><div className="space-y-3 p-5"><label className="block text-sm font-bold text-slate-700">Localizar cadastro de destino<input autoFocus type="search" value={mergeSearch} onChange={event => { setMergeSearch(event.target.value); setMergeTargetId(null) }} placeholder="Nome, telefone, documento ou e-mail" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-orange-400" /></label><div className="max-h-64 space-y-2 overflow-y-auto">{mergeCandidates.map(candidate => <label key={candidate.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${mergeTargetId === candidate.id ? 'border-orange-400 bg-orange-50' : 'border-slate-200'}`}><input type="radio" name="merge-target" checked={mergeTargetId === candidate.id} onChange={() => setMergeTargetId(candidate.id)} className="mt-1 accent-orange-600" /><span><strong className="block text-sm text-slate-900">{candidate.nome}</strong><span className="text-xs text-slate-500">{candidate.telefone || 'Sem telefone'} · {candidate.documento || 'Sem documento'}</span></span></label>)}</div><p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">A mesclagem move comandas, endereços, consentimentos e sessões públicas para o destino. A operação fica registrada na auditoria.</p></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => setMergeSource(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700">Cancelar</button><button type="button" onClick={() => void merge()} disabled={!mergeTargetId || merging} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{merging && <LoaderCircle size={16} className="animate-spin" />} Confirmar mesclagem</button></footer></section></div>}
  </main>
}

function Field({ label, value, onChange, type = 'text', required = false, wide = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean }) {
  return <label className={`text-sm font-bold text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}<input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-orange-400" /></label>
}

function HistoryModal({ value, onClose }: { value: Historico; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="history-title"><section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 id="history-title" className="text-xl font-black text-slate-950">Histórico de {value.cliente.nome}</h2><p className="mt-1 text-sm text-slate-500">Últimos 50 atendimentos e vínculos do cadastro.</p></div><button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header><div className="space-y-5 p-5"><section className="grid gap-3 sm:grid-cols-3"><Stat label="Atendimentos" value={String(value.summary.atendimentos)} /><Stat label="Total registrado" value={Number(value.summary.totalGasto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /><Stat label="Última visita" value={value.summary.ultimaVisita ? new Date(value.summary.ultimaVisita).toLocaleDateString('pt-BR') : '—'} /></section><section><h3 className="mb-2 font-black text-slate-900">Atendimentos</h3><div className="space-y-2">{value.comandas.map(comanda => <article key={comanda.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-700"><ReceiptText size={17} /></span><div><strong className="block text-sm text-slate-900">Comanda #{comanda.id} · {comanda.canal}</strong><span className="text-xs text-slate-500">{new Date(comanda.abertaEm).toLocaleString('pt-BR')}{comanda.mesa ? ` · Mesa ${comanda.mesa.numero}` : ''}</span></div></div><strong className="text-sm text-slate-950">{Number(comanda.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div className="mt-3 flex flex-wrap gap-1.5">{comanda.pedidos.flatMap(pedido => pedido.itens).map(item => <span key={item.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{item.quantidade}× {item.produto.nome}</span>)}</div></article>)}{value.comandas.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">Nenhum atendimento vinculado.</p>}</div></section></div></section></div>
}

function Stat({ label, value }: { label: string; value: string }) { return <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><strong className="mt-1 block text-xl text-slate-950">{value}</strong></article> }

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => Promise<void> }) {
  const { showToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [busy, setBusy] = useState<'model' | 'preview' | 'confirm' | null>(null)

  const formData = (hash?: string) => { const data = new FormData(); if (file) data.append('arquivo', file); if (hash) data.append('hash', hash); return data }
  const downloadModel = async () => {
    setBusy('model')
    try {
      const response = await apiRequest('/clients/import/model')
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = 'modelo-clientes.xlsx'; link.click(); URL.revokeObjectURL(url)
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível baixar o modelo.', 'error') }
    finally { setBusy(null) }
  }
  const validate = async (selected: File) => {
    setFile(selected); setPreview(null); setBusy('preview')
    try {
      const data = new FormData(); data.append('arquivo', selected)
      const result = await apiFetch<ImportPreview>('/clients/import/preview', { method: 'POST', body: data })
      setPreview(result); showToast(result.erros.length ? 'Revise os erros antes de importar.' : 'Arquivo validado e pronto para importar.', result.erros.length ? 'warning' : 'success')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível validar o arquivo.', 'error') }
    finally { setBusy(null) }
  }
  const importClients = async () => {
    if (!file || !preview || preview.erros.length) return
    setBusy('confirm')
    try {
      await apiFetch('/clients/import/confirm', { method: 'POST', body: formData(preview.hash) })
      showToast(`${preview.resumo.novos} clientes criados e ${preview.resumo.atualizados} atualizados.`, 'success'); await onImported()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Não foi possível importar os clientes.', 'error') }
    finally { setBusy(null) }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="import-title"><section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 id="import-title" className="text-xl font-black text-slate-950">Importar clientes</h2><p className="mt-1 text-sm text-slate-500">Valide a planilha antes de alterar os cadastros.</p></div><button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></header><div className="space-y-5 p-5"><section className="grid gap-3 rounded-2xl bg-slate-950 p-4 text-white md:grid-cols-[1fr_auto_auto] md:items-center"><div><strong className="block">1. Use o modelo do Rei</strong><span className="text-sm text-slate-400">Até 5.000 linhas em XLSX ou CSV.</span></div><button type="button" onClick={() => void downloadModel()} disabled={busy !== null} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-600 px-3 text-sm font-black hover:border-orange-400"><Download size={16} /> {busy === 'model' ? 'Baixando…' : 'Baixar modelo'}</button><label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black hover:bg-orange-700"><FileSpreadsheet size={16} /> {busy === 'preview' ? 'Validando…' : 'Selecionar arquivo'}<input type="file" accept=".xlsx,.csv" disabled={busy !== null} className="sr-only" onChange={event => { const selected = event.target.files?.[0]; if (selected) void validate(selected); event.target.value = '' }} /></label></section>{file && <p className="text-sm text-slate-600">Arquivo selecionado: <strong>{file.name}</strong></p>}{preview && <><section className="grid gap-3 sm:grid-cols-4"><Stat label="Linhas válidas" value={String(preview.resumo.validas)} /><Stat label="Com erro" value={String(preview.resumo.invalidas)} /><Stat label="Novos" value={String(preview.resumo.novos)} /><Stat label="Atualizações" value={String(preview.resumo.atualizados)} /></section>{preview.erros.length > 0 ? <section className="rounded-xl border border-red-200 bg-white"><h3 className="flex items-center gap-2 border-b border-red-100 px-4 py-3 font-black text-red-800"><AlertTriangle size={18} /> Corrija antes de continuar</h3><div className="max-h-48 overflow-y-auto divide-y divide-red-50">{preview.erros.map((error, index) => <p key={`${error.linha}-${error.coluna}-${index}`} className="px-4 py-2 text-sm text-slate-700"><strong>Linha {error.linha || '—'} · {error.coluna}:</strong> {error.mensagem}</p>)}</div></section> : <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="grid grid-cols-[4rem_1fr_1fr_7rem] gap-3 bg-slate-100 px-4 py-2 text-xs font-black text-slate-600"><span>Linha</span><span>Cliente</span><span>Contato</span><span>Ação</span></div>{preview.linhas.slice(0, 100).map(row => <div key={row.linha} className="grid grid-cols-[4rem_1fr_1fr_7rem] gap-3 border-t border-slate-100 px-4 py-2 text-sm"><span className="text-slate-500">{row.linha}</span><strong className="text-slate-900">{row.nome}</strong><span className="truncate text-slate-600">{row.telefone || row.email || '—'}</span><span className={row.clienteExistenteId ? 'text-blue-700' : 'text-emerald-700'}>{row.clienteExistenteId ? 'Atualizar' : 'Criar'}</span></div>)}</section>}</> }</div><footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700">Cancelar</button><button type="button" onClick={() => void importClients()} disabled={!preview || preview.erros.length > 0 || busy !== null} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy === 'confirm' && <LoaderCircle size={16} className="animate-spin" />} Confirmar importação</button></footer></section></div>
}
