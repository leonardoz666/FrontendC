'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock, Download, Power, PowerOff } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from '@/app/components/TenantLink'
import { DataTable, type DataTableColumn } from '@/app/components/ui/DataTable'
import { Button } from '@/app/components/ui/Button'
import { ActionableError } from '@/app/components/ui/ActionableError'
import { Input } from '@/app/components/ui/Input'
import { apiFetch, apiRequest, fetchList } from '@/app/lib/api'
import { usePagedQuery } from '@/app/lib/pagination'
import { paginaAtual, useListaCrud } from '@/app/lib/crud-client'
import { useToast } from '@/contexts/ToastContext'

type Funcionario = {
  id: number
  nome: string
  cpf: string
  email?: string | null
  telefone?: string | null
  status: string
}

type Registro = {
  id: number
  nsr: number
  cpf: string
  dataHora: string
  tipo: string
  origem: string
  nsrOriginal: number | null
  funcionario?: Funcionario
}

type Jornada = {
  id: number
  nome: string
  cargaDiariaMin: number
  cargaSemanalMin: number
  tolAtrasoMin: number
  tolExtraMin: number
  ativo: boolean
}

type Escala = {
  id: number
  funcionario: Funcionario
  jornada: Jornada
  inicio: string
  fim: string | null
  dias: Array<{
    diaSemana: number
    h1: string | null
    h2: string | null
    h3: string | null
    h4: string | null
  }>
}

type EspelhoDia = {
  data: string
  registros: Registro[]
  minutosTrabalhados: number
  pendencias: string[]
}

type Espelho = {
  funcionario: { id: number; nome: string; cpf: string }
  dias: EspelhoDia[]
  totalMinutos: number
}

type FuncionarioForm = {
  nome: string
  cpf: string
  email: string
  telefone: string
}

type FormErrors = Record<string, string>

const FUNCIONARIO_VAZIO: FuncionarioForm = { nome: '', cpf: '', email: '', telefone: '' }
const TIPOS = ['ENTRADA', 'SAIDA', 'INICIO_INTERVALO', 'FIM_INTERVALO'] as const
const DIAS_SEMANA = [
  { valor: 1, label: 'Seg' },
  { valor: 2, label: 'Ter' },
  { valor: 3, label: 'Qua' },
  { valor: 4, label: 'Qui' },
  { valor: 5, label: 'Sex' },
  { valor: 6, label: 'Sáb' },
  { valor: 0, label: 'Dom' },
] as const

function formatarMinutos(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return `${horas}h${String(resto).padStart(2, '0')}`
}

function focusFirstInvalid(form: HTMLFormElement, errors: FormErrors) {
  const firstField = Object.keys(errors)[0]
  if (!firstField) return
  requestAnimationFrame(() => {
    const field = form.elements.namedItem(firstField)
    if (field instanceof HTMLElement) field.focus()
  })
}

export default function PontoPage() {
  const pathname = usePathname()
  const area = pathname.endsWith('/registro')
    ? 'REGISTRO'
    : pathname.endsWith('/ajustes')
      ? 'AJUSTES'
      : pathname.endsWith('/relatorios')
        ? 'RELATORIOS'
        : 'EQUIPE'
  const { showToast } = useToast()
  const ui = useListaCrud('/ponto/registros')
  const { data, isLoading, isError, error, refetch } = usePagedQuery<Registro>(ui.listaParams)
  const pagina = paginaAtual({ data }, ui.page, ui.pageSize)

  const { data: funcionarios = [], refetch: refetchFuncionarios } = useQuery({
    queryKey: ['ponto-funcionarios-select'],
    queryFn: () => fetchList<Funcionario>('/ponto/funcionarios?page=1&pageSize=100'),
  })

  const { data: jornadas = [], refetch: refetchJornadas } = useQuery({
    queryKey: ['ponto-jornadas-select'],
    queryFn: () => fetchList<Jornada>('/ponto/jornadas?page=1&pageSize=100'),
  })

  const { data: escalas = [], refetch: refetchEscalas } = useQuery({
    queryKey: ['ponto-escalas-list'],
    queryFn: () => fetchList<Escala>('/ponto/escalas?page=1&pageSize=100&sort=inicio&order=desc'),
  })

  const funcionariosSelect = useMemo(
    () => funcionarios
      .filter((funcionario) => funcionario.status === 'ATIVO')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [funcionarios]
  )

  const [funcionarioForm, setFuncionarioForm] = useState<FuncionarioForm>(FUNCIONARIO_VAZIO)
  const [jornadaNome, setJornadaNome] = useState('')
  const [jornadaDiaria, setJornadaDiaria] = useState('480')
  const [jornadaSemanal, setJornadaSemanal] = useState('2400')
  const [jornadaTolAtraso, setJornadaTolAtraso] = useState('5')
  const [jornadaTolExtra, setJornadaTolExtra] = useState('5')
  const [escalaFuncionarioId, setEscalaFuncionarioId] = useState('')
  const [escalaJornadaId, setEscalaJornadaId] = useState('')
  const [escalaInicio, setEscalaInicio] = useState('')
  const [escalaFim, setEscalaFim] = useState('')
  const [escalaDias, setEscalaDias] = useState<number[]>([1, 2, 3, 4, 5])
  const [escalaH1, setEscalaH1] = useState('08:00')
  const [escalaH2, setEscalaH2] = useState('12:00')
  const [escalaH3, setEscalaH3] = useState('13:00')
  const [escalaH4, setEscalaH4] = useState('17:00')
  const [funcionarioId, setFuncionarioId] = useState('')
  const [tipo, setTipo] = useState('ENTRADA')
  const [ajusteNsr, setAjusteNsr] = useState('')
  const [ajusteFuncionarioId, setAjusteFuncionarioId] = useState('')
  const [ajusteDataHora, setAjusteDataHora] = useState('')
  const [ajusteTipo, setAjusteTipo] = useState('ENTRADA')
  const [ajusteJustificativa, setAjusteJustificativa] = useState('')
  const [afdInicio, setAfdInicio] = useState('')
  const [afdFim, setAfdFim] = useState('')
  const [aejFormato, setAejFormato] = useState<'json' | 'txt'>('json')
  const [espelhoFuncionarioId, setEspelhoFuncionarioId] = useState('')
  const [espelhoInicio, setEspelhoInicio] = useState('')
  const [espelhoFim, setEspelhoFim] = useState('')
  const [espelho, setEspelho] = useState<Espelho | null>(null)
  const [salvandoFuncionario, setSalvandoFuncionario] = useState(false)
  const [salvandoJornada, setSalvandoJornada] = useState(false)
  const [salvandoEscala, setSalvandoEscala] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [ajustando, setAjustando] = useState(false)
  const [baixandoAfd, setBaixandoAfd] = useState(false)
  const [baixandoAej, setBaixandoAej] = useState(false)
  const [carregandoEspelho, setCarregandoEspelho] = useState(false)
  const [alternandoFuncionario, setAlternandoFuncionario] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  const clearFieldError = (field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const criarFuncionario = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors: FormErrors = {}
    if (!funcionarioForm.nome.trim()) errors.funcionarioNome = 'Informe o nome do funcionário.'
    if (!funcionarioForm.cpf.trim()) errors.funcionarioCpf = 'Informe o CPF do funcionário.'
    if (funcionarioForm.email && !/^\S+@\S+\.\S+$/.test(funcionarioForm.email)) errors.funcionarioEmail = 'Informe um e-mail válido.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...errors }))
      focusFirstInvalid(event.currentTarget, errors)
      return
    }
    setSalvandoFuncionario(true)
    try {
      await apiFetch('/ponto/funcionarios', { method: 'POST', body: funcionarioForm })
      showToast('Funcionário criado', 'success')
      setFuncionarioForm(FUNCIONARIO_VAZIO)
      void refetchFuncionarios()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar funcionário', 'error')
    } finally {
      setSalvandoFuncionario(false)
    }
  }

  const criarJornada = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cargaDiariaMin = Number(jornadaDiaria)
    const cargaSemanalMin = Number(jornadaSemanal)
    const errors: FormErrors = {}
    if (!jornadaNome.trim()) errors.jornadaNome = 'Informe um nome para identificar a jornada.'
    if (!Number.isInteger(cargaDiariaMin) || cargaDiariaMin < 1) errors.jornadaDiaria = 'Informe a carga diária em minutos.'
    if (!Number.isInteger(cargaSemanalMin) || cargaSemanalMin < 1) errors.jornadaSemanal = 'Informe a carga semanal em minutos.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...errors }))
      focusFirstInvalid(event.currentTarget, errors)
      return
    }
    setSalvandoJornada(true)
    try {
      await apiFetch('/ponto/jornadas', {
        method: 'POST',
        body: {
          nome: jornadaNome,
          cargaDiariaMin,
          cargaSemanalMin,
          tolAtrasoMin: Number(jornadaTolAtraso) || 0,
          tolExtraMin: Number(jornadaTolExtra) || 0,
        },
      })
      showToast('Jornada criada', 'success')
      setJornadaNome('')
      void refetchJornadas()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar jornada', 'error')
    } finally {
      setSalvandoJornada(false)
    }
  }

  const criarEscala = async (event: React.FormEvent) => {
    event.preventDefault()
    const funcionarioIdNumero = Number(escalaFuncionarioId)
    const jornadaIdNumero = Number(escalaJornadaId)
    if (!Number.isInteger(funcionarioIdNumero) || funcionarioIdNumero < 1 || !Number.isInteger(jornadaIdNumero) || jornadaIdNumero < 1) {
      showToast('Selecione funcionário e jornada', 'error')
      return
    }
    if (!escalaInicio || escalaDias.length === 0) {
      showToast('Informe início e ao menos um dia da semana', 'error')
      return
    }

    setSalvandoEscala(true)
    try {
      await apiFetch('/ponto/escalas', {
        method: 'POST',
        body: {
          funcionarioId: funcionarioIdNumero,
          jornadaId: jornadaIdNumero,
          inicio: new Date(escalaInicio).toISOString(),
          fim: escalaFim ? new Date(escalaFim).toISOString() : null,
          dias: escalaDias.map((diaSemana) => ({
            diaSemana,
            h1: escalaH1 || null,
            h2: escalaH2 || null,
            h3: escalaH3 || null,
            h4: escalaH4 || null,
          })),
        },
      })
      showToast('Escala criada', 'success')
      setEscalaInicio('')
      setEscalaFim('')
      void refetchEscalas()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar escala', 'error')
    } finally {
      setSalvandoEscala(false)
    }
  }

  const alternarDiaEscala = (dia: number) => {
    setEscalaDias((atuais) =>
      atuais.includes(dia) ? atuais.filter((item) => item !== dia) : [...atuais, dia]
    )
  }

  const alternarFuncionario = async (funcionario: Funcionario) => {
    setAlternandoFuncionario(funcionario.id)
    try {
      const ativo = funcionario.status !== 'ATIVO'
      await apiFetch(`/ponto/funcionarios/${funcionario.id}/ativo`, {
        method: 'PATCH',
        body: { ativo },
      })
      showToast(`Funcionário ${ativo ? 'ativado' : 'inativado'}`, 'success')
      void refetchFuncionarios()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao alterar funcionário', 'error')
    } finally {
      setAlternandoFuncionario(null)
    }
  }

  const registrarPonto = async (event: React.FormEvent) => {
    event.preventDefault()
    const id = Number(funcionarioId)
    if (!Number.isInteger(id) || id < 1) {
      showToast('Selecione o funcionário', 'error')
      return
    }
    setRegistrando(true)
    try {
      await apiFetch('/ponto/registros', { method: 'POST', body: { funcionarioId: id, tipo } })
      showToast('Ponto registrado', 'success')
      void refetch()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao registrar ponto', 'error')
    } finally {
      setRegistrando(false)
    }
  }

  const ajustarPonto = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nsr = Number(ajusteNsr)
    const errors: FormErrors = {}
    if (!Number.isInteger(nsr) || nsr < 1) errors.ajusteNsr = 'Informe o número NSR do registro original.'
    if (!ajusteDataHora) errors.ajusteDataHora = 'Informe a nova data e hora.'
    if (ajusteJustificativa.trim().length < 15) errors.ajusteJustificativa = 'Explique o motivo usando pelo menos 15 caracteres.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...errors }))
      focusFirstInvalid(event.currentTarget, errors)
      return
    }

    const funcionarioAjuste = Number(ajusteFuncionarioId)
    setAjustando(true)
    try {
      await apiFetch(`/ponto/registros/${nsr}/ajustar`, {
        method: 'POST',
        body: {
          ...(Number.isInteger(funcionarioAjuste) && funcionarioAjuste > 0 ? { funcionarioId: funcionarioAjuste } : {}),
          dataHora: new Date(ajusteDataHora).toISOString(),
          tipo: ajusteTipo,
          justificativa: ajusteJustificativa,
        },
      })
      showToast('Ajuste registrado com novo NSR', 'success')
      setAjusteNsr('')
      setAjusteFuncionarioId('')
      setAjusteDataHora('')
      setAjusteJustificativa('')
      void refetch()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao ajustar ponto', 'error')
    } finally {
      setAjustando(false)
    }
  }

  const baixarAfd = async () => {
    const query = new URLSearchParams()
    if (afdInicio) query.set('inicio', new Date(afdInicio).toISOString())
    if (afdFim) query.set('fim', new Date(afdFim).toISOString())

    setBaixandoAfd(true)
    try {
      const res = await apiRequest(`/ponto/afd${query.toString() ? `?${query.toString()}` : ''}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'afd-controlae.txt'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao baixar AFD', 'error')
    } finally {
      setBaixandoAfd(false)
    }
  }

  const baixarAej = async () => {
    const query = new URLSearchParams({ formato: aejFormato })
    if (afdInicio) query.set('inicio', new Date(afdInicio).toISOString())
    if (afdFim) query.set('fim', new Date(afdFim).toISOString())

    setBaixandoAej(true)
    try {
      const res = await apiRequest(`/ponto/aej?${query.toString()}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aej-controlae.${aejFormato}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao baixar AEJ', 'error')
    } finally {
      setBaixandoAej(false)
    }
  }

  const gerarEspelho = async (event: React.FormEvent) => {
    event.preventDefault()
    const funcionarioIdNumero = Number(espelhoFuncionarioId)
    if (!Number.isInteger(funcionarioIdNumero) || funcionarioIdNumero < 1) {
      showToast('Selecione o funcionário do espelho', 'error')
      return
    }
    const query = new URLSearchParams({ funcionarioId: String(funcionarioIdNumero) })
    if (espelhoInicio) query.set('inicio', new Date(espelhoInicio).toISOString())
    if (espelhoFim) query.set('fim', new Date(espelhoFim).toISOString())

    setCarregandoEspelho(true)
    try {
      const resultado = await apiFetch<Espelho>(`/ponto/espelho?${query.toString()}`)
      setEspelho(resultado)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao gerar espelho', 'error')
    } finally {
      setCarregandoEspelho(false)
    }
  }

  const columns: Array<DataTableColumn<Registro>> = [
    { key: 'nsr', header: 'NSR', sortKey: 'nsr', render: (registro) => <span className="font-mono text-xs">{registro.nsr}</span> },
    { key: 'funcionario', header: 'Funcionário', render: (registro) => <span className="font-medium text-gray-900">{registro.funcionario?.nome ?? registro.cpf}</span> },
    { key: 'dataHora', header: 'Data/Hora', sortKey: 'dataHora', render: (registro) => <span>{new Date(registro.dataHora).toLocaleString('pt-BR')}</span> },
    { key: 'tipo', header: 'Tipo', render: (registro) => <span>{registro.tipo}</span> },
    {
      key: 'origem',
      header: 'Origem',
      hideOnMobile: true,
      render: (registro) => (
        <span>
          {registro.origem}
          {registro.nsrOriginal && <span className="ml-1 text-xs text-gray-500">ajusta #{registro.nsrOriginal}</span>}
        </span>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-2 text-3xl font-bold text-black">Controle de ponto</h1>
      <p className="mb-6 text-sm text-gray-600">
        Escolha uma área para trabalhar sem misturar cadastros, ajustes e relatórios.
      </p>

      <nav aria-label="Áreas do controle de ponto" className="mb-6 grid gap-2 rounded-xl bg-slate-100 p-2 sm:grid-cols-4">
        {([
          ['/ponto/registro', 'Registrar ponto'],
          ['/ponto/equipe', 'Equipe e jornadas'],
          ['/ponto/ajustes', 'Ajustes'],
          ['/ponto/relatorios', 'Relatórios'],
        ] as const).map(([href, label]) => {
          const selected = pathname === href || (href === '/ponto/equipe' && pathname === '/ponto')
          return <Link key={href} href={href} aria-current={selected ? 'page' : undefined} className={`flex min-h-11 items-center justify-center rounded-lg px-3 text-center text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${selected ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}>{label}</Link>
        })}
      </nav>

      <div className={`mb-6 ${area === 'REGISTRO' || area === 'AJUSTES' ? 'block' : 'hidden'}`}>
        <form onSubmit={registrarPonto} className={`${area === 'REGISTRO' ? 'block' : 'hidden'} border-y border-gray-200 bg-white px-4 py-5 sm:px-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-orange-600" />
              Registrar ponto
            </h2>
            <Link href="/ponto/batida" className="text-sm font-bold text-orange-700 hover:underline">Abrir registro por câmera</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <select value={funcionarioId} onChange={(event) => setFuncionarioId(event.target.value)} className="rounded-lg border border-gray-300 p-2 text-black" required>
              <option value="">Funcionário</option>
              {funcionariosSelect.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}
            </select>
            <select value={tipo} onChange={(event) => setTipo(event.target.value)} className="rounded-lg border border-gray-300 p-2 text-black">
              {TIPOS.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
            </select>
            <Button type="submit" isLoading={registrando}>Registrar</Button>
          </div>
        </form>

        <form id="ajustes" noValidate onSubmit={ajustarPonto} className={`${area === 'AJUSTES' ? 'block' : 'hidden'} scroll-mt-24 border-y border-gray-200 bg-white px-4 py-5 sm:px-5`}>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Ajustar registro</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              name="ajusteNsr"
              label="NSR do registro original"
              hint="É o número exibido na lista de registros."
              error={fieldErrors.ajusteNsr}
              value={ajusteNsr}
              onChange={(event) => { setAjusteNsr(event.target.value); clearFieldError('ajusteNsr') }}
              inputMode="numeric"
              required
            />
            <Input
              name="ajusteDataHora"
              label="Nova data e hora"
              error={fieldErrors.ajusteDataHora}
              value={ajusteDataHora}
              onChange={(event) => { setAjusteDataHora(event.target.value); clearFieldError('ajusteDataHora') }}
              type="datetime-local"
              required
            />
            <label className="block text-sm font-semibold text-slate-700">
              Tipo de registro
              <select value={ajusteTipo} onChange={(event) => setAjusteTipo(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-black">
                {TIPOS.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Funcionário
              <select value={ajusteFuncionarioId} onChange={(event) => setAjusteFuncionarioId(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-black">
                <option value="">Manter o mesmo funcionário</option>
                {funcionariosSelect.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Motivo do ajuste <span className="text-red-700" aria-hidden="true">*</span>
              <textarea
                name="ajusteJustificativa"
                value={ajusteJustificativa}
                onChange={(event) => { setAjusteJustificativa(event.target.value); clearFieldError('ajusteJustificativa') }}
                placeholder="Ex.: O funcionário esqueceu de registrar a saída."
                aria-invalid={Boolean(fieldErrors.ajusteJustificativa)}
                aria-describedby={fieldErrors.ajusteJustificativa ? 'ajuste-justificativa-error' : 'ajuste-justificativa-hint'}
                className={`mt-1.5 min-h-24 w-full rounded-lg border p-3 font-normal text-black outline-none focus:ring-2 ${fieldErrors.ajusteJustificativa ? 'border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'}`}
                required
              />
              <span id="ajuste-justificativa-hint" className="mt-1.5 block text-xs font-normal text-slate-600">Use pelo menos 15 caracteres.</span>
              {fieldErrors.ajusteJustificativa && <span id="ajuste-justificativa-error" role="alert" className="mt-1.5 block text-xs font-normal text-red-700">{fieldErrors.ajusteJustificativa}</span>}
            </label>
            <Button type="submit" isLoading={ajustando}>Registrar ajuste</Button>
          </div>
        </form>
      </div>

      <div className={`mb-6 ${area === 'EQUIPE' || area === 'RELATORIOS' ? 'block' : 'hidden'}`}>
        <form noValidate onSubmit={criarFuncionario} className={`${area === 'EQUIPE' ? 'block' : 'hidden'} border-y border-gray-200 bg-white px-4 py-5 sm:px-5`}>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Novo funcionário</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="funcionarioNome" label="Nome completo" placeholder="Ex.: Maria Silva" error={fieldErrors.funcionarioNome} value={funcionarioForm.nome} onChange={(event) => { setFuncionarioForm((atual) => ({ ...atual, nome: event.target.value })); clearFieldError('funcionarioNome') }} autoComplete="name" required />
            <Input name="funcionarioCpf" label="CPF" placeholder="Somente números" hint="O CPF identifica o funcionário no ponto." error={fieldErrors.funcionarioCpf} value={funcionarioForm.cpf} onChange={(event) => { setFuncionarioForm((atual) => ({ ...atual, cpf: event.target.value })); clearFieldError('funcionarioCpf') }} inputMode="numeric" autoComplete="off" required />
            <Input name="funcionarioEmail" label="E-mail (opcional)" placeholder="nome@empresa.com" error={fieldErrors.funcionarioEmail} value={funcionarioForm.email} onChange={(event) => { setFuncionarioForm((atual) => ({ ...atual, email: event.target.value })); clearFieldError('funcionarioEmail') }} type="email" autoComplete="email" />
            <div className="flex gap-2">
              <Input name="funcionarioTelefone" label="Telefone (opcional)" placeholder="(00) 00000-0000" value={funcionarioForm.telefone} onChange={(event) => setFuncionarioForm((atual) => ({ ...atual, telefone: event.target.value }))} inputMode="tel" autoComplete="tel" />
              <Button type="submit" className="mt-[26px]" isLoading={salvandoFuncionario}>Criar</Button>
            </div>
          </div>
        </form>

        <section className={`${area === 'RELATORIOS' ? 'block' : 'hidden'} border-y border-gray-200 bg-white px-4 py-5 sm:px-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Arquivos AFD/AEJ</h2>
            <Link href="/ponto/auditoria" className="text-sm font-bold text-orange-700 hover:underline">Ver histórico de alterações</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto_auto]">
            <input value={afdInicio} onChange={(event) => setAfdInicio(event.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Início do AFD" />
            <input value={afdFim} onChange={(event) => setAfdFim(event.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Fim do AFD" />
            <select value={aejFormato} onChange={(event) => setAejFormato(event.target.value as 'json' | 'txt')} className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Formato do AEJ">
              <option value="json">JSON</option>
              <option value="txt">TXT</option>
            </select>
            <Button type="button" onClick={() => void baixarAfd()} isLoading={baixandoAfd}>
              <Download className="mr-2 h-4 w-4" />
              AFD
            </Button>
            <Button type="button" variant="outline" onClick={() => void baixarAej()} isLoading={baixandoAej}>
              <Download className="mr-2 h-4 w-4" />
              AEJ
            </Button>
          </div>
        </section>
      </div>

      <section className={`${area === 'RELATORIOS' ? 'block' : 'hidden'} mb-6 rounded-lg border border-gray-200 bg-white p-4`}>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Espelho de ponto</h2>
        <form onSubmit={gerarEspelho} className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <select value={espelhoFuncionarioId} onChange={(event) => setEspelhoFuncionarioId(event.target.value)} className="rounded-lg border border-gray-300 p-2 text-black" required>
            <option value="">Funcionário</option>
            {funcionariosSelect.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}
          </select>
          <input value={espelhoInicio} onChange={(event) => setEspelhoInicio(event.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Início do espelho" />
          <input value={espelhoFim} onChange={(event) => setEspelhoFim(event.target.value)} type="datetime-local" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Fim do espelho" />
          <Button type="submit" isLoading={carregandoEspelho}>Gerar espelho</Button>
        </form>

        {espelho && (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <div className="flex flex-col gap-1 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{espelho.funcionario.nome}</p>
                <p className="text-xs text-gray-500">{espelho.funcionario.cpf}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                Total: {formatarMinutos(espelho.totalMinutos)}
              </p>
            </div>
            {espelho.dias.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Nenhum registro no período.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {espelho.dias.map((dia) => (
                  <div key={dia.data} className="px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-gray-900">
                        {new Date(`${dia.data}T00:00:00`).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm font-medium text-gray-700">{formatarMinutos(dia.minutosTrabalhados)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dia.registros.map((registro) => (
                        <span key={registro.nsr} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          #{registro.nsr} {registro.tipo} {new Date(registro.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ))}
                    </div>
                    {dia.pendencias.length > 0 && (
                      <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {dia.pendencias.join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className={`${area === 'EQUIPE' ? 'block' : 'hidden'} mb-6 rounded-lg border border-gray-200 bg-white p-4`}>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Funcionários</h2>
        {funcionarios.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum funcionário cadastrado.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {funcionarios.map((funcionario) => {
              const ativo = funcionario.status === 'ATIVO'
              return (
                <div key={funcionario.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{funcionario.nome}</p>
                    <p className="text-xs text-gray-500">{funcionario.cpf} · {funcionario.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void alternarFuncionario(funcionario)}
                    disabled={alternandoFuncionario === funcionario.id}
                    className="rounded-lg p-2 text-orange-600 hover:bg-orange-50 disabled:opacity-40"
                    title={ativo ? 'Inativar funcionário' : 'Ativar funcionário'}
                    aria-label={ativo ? 'Inativar funcionário' : 'Ativar funcionário'}
                  >
                    {ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className={`${area === 'EQUIPE' ? 'grid' : 'hidden'} mb-6 gap-6 xl:grid-cols-[1fr_1fr]`}>
        <form noValidate onSubmit={criarJornada} className="border-y border-gray-200 bg-white px-4 py-5 sm:px-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Clock className="h-5 w-5 text-orange-600" />
            Jornada
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="jornadaNome" label="Nome da jornada" placeholder="Ex.: Comercial" error={fieldErrors.jornadaNome} value={jornadaNome} onChange={(event) => { setJornadaNome(event.target.value); clearFieldError('jornadaNome') }} required />
            <Input name="jornadaDiaria" label="Carga diária" hint="Informe o total em minutos. Ex.: 480 para 8 horas." error={fieldErrors.jornadaDiaria} value={jornadaDiaria} onChange={(event) => { setJornadaDiaria(event.target.value); clearFieldError('jornadaDiaria') }} type="number" min="1" step="1" inputMode="numeric" required />
            <Input name="jornadaSemanal" label="Carga semanal" hint="Informe o total em minutos. Ex.: 2400 para 40 horas." error={fieldErrors.jornadaSemanal} value={jornadaSemanal} onChange={(event) => { setJornadaSemanal(event.target.value); clearFieldError('jornadaSemanal') }} type="number" min="1" step="1" inputMode="numeric" required />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Tolerância de atraso" hint="Em minutos." value={jornadaTolAtraso} onChange={(event) => setJornadaTolAtraso(event.target.value)} type="number" min="0" step="1" inputMode="numeric" />
              <Input label="Tolerância de hora extra" hint="Em minutos." value={jornadaTolExtra} onChange={(event) => setJornadaTolExtra(event.target.value)} type="number" min="0" step="1" inputMode="numeric" />
            </div>
            <Button type="submit" isLoading={salvandoJornada}>Criar jornada</Button>
          </div>
          {jornadas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {jornadas.map((jornada) => (
                <span key={jornada.id} className={`rounded px-2 py-1 text-xs ${jornada.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {jornada.nome} · {formatarMinutos(jornada.cargaDiariaMin)}/dia
                </span>
              ))}
            </div>
          )}
        </form>

        <form onSubmit={criarEscala} className="border-y border-gray-200 bg-white px-4 py-5 sm:px-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CalendarDays className="h-5 w-5 text-orange-600" />
            Escala
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={escalaFuncionarioId} onChange={(event) => setEscalaFuncionarioId(event.target.value)} className="rounded-lg border border-gray-300 p-2 text-black" required>
              <option value="">Funcionário</option>
              {funcionariosSelect.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}
            </select>
            <select value={escalaJornadaId} onChange={(event) => setEscalaJornadaId(event.target.value)} className="rounded-lg border border-gray-300 p-2 text-black" required>
              <option value="">Jornada</option>
              {jornadas.filter((jornada) => jornada.ativo).map((jornada) => <option key={jornada.id} value={jornada.id}>{jornada.nome}</option>)}
            </select>
            <input value={escalaInicio} onChange={(event) => setEscalaInicio(event.target.value)} type="date" className="rounded-lg border border-gray-300 p-2 text-black" required />
            <input value={escalaFim} onChange={(event) => setEscalaFim(event.target.value)} type="date" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Fim da escala" />
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.valor}
                  type="button"
                  onClick={() => alternarDiaEscala(dia.valor)}
                  className={`rounded-lg border px-3 py-1 text-sm font-semibold ${escalaDias.includes(dia.valor) ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input value={escalaH1} onChange={(event) => setEscalaH1(event.target.value)} type="time" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Primeira marcação" />
              <input value={escalaH2} onChange={(event) => setEscalaH2(event.target.value)} type="time" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Segunda marcação" />
              <input value={escalaH3} onChange={(event) => setEscalaH3(event.target.value)} type="time" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Terceira marcação" />
              <input value={escalaH4} onChange={(event) => setEscalaH4(event.target.value)} type="time" className="rounded-lg border border-gray-300 p-2 text-black" aria-label="Quarta marcação" />
            </div>
            <Button type="submit" isLoading={salvandoEscala}>Criar escala</Button>
          </div>
        </form>
      </div>

      {area === 'EQUIPE' && escalas.length > 0 && (
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Escalas cadastradas</h2>
          <div className="grid gap-2 lg:grid-cols-2">
            {escalas.map((escala) => (
              <div key={escala.id} className="rounded-lg border border-gray-200 px-3 py-2">
                <p className="font-semibold text-gray-900">{escala.funcionario.nome}</p>
                <p className="text-sm text-gray-600">
                  {escala.jornada.nome} · {new Date(escala.inicio).toLocaleDateString('pt-BR')}
                  {escala.fim ? ` até ${new Date(escala.fim).toLocaleDateString('pt-BR')}` : ' em aberto'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {escala.dias
                    .sort((a, b) => a.diaSemana - b.diaSemana)
                    .map((dia) => `${DIAS_SEMANA.find((item) => item.valor === dia.diaSemana)?.label ?? dia.diaSemana}: ${[dia.h1, dia.h2, dia.h3, dia.h4].filter(Boolean).join(' / ')}`)
                    .join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(area === 'REGISTRO' || area === 'AJUSTES') && isError && <ActionableError error={error} fallback="Não foi possível carregar os registros de ponto." onRetry={() => refetch()} className="mb-4" />}

      {(area === 'REGISTRO' || area === 'AJUSTES') && <DataTable
        ariaLabel="Registros de ponto"
        columns={columns}
        data={pagina.data}
        getRowId={(registro) => registro.id}
        meta={pagina.meta}
        loading={isLoading}
        itemLabel="registros"
        storageKey="ponto-registros"
        emptyMessage="Nenhum registro de ponto encontrado"
        onPageChange={ui.setPage}
        onPageSizeChange={ui.setPageSize}
        onSearch={ui.definirBusca}
        onSort={ui.definirOrdenacao}
      />}
    </div>
  )
}
