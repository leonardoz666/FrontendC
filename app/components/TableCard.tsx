import { clsx } from 'clsx'

export type MesaStatus = 'LIVRE' | 'OCUPADA' | 'FECHAMENTO'

export interface Mesa {
  id: number
  numero: number
  status: MesaStatus
  praca?: {
    id: number
    nome: string
  } | null
  comandas: {
    id: number
    abertaEm: string
    nomeCliente?: string | null
    usuario?: {
      nome: string
    }
  }[]
}

interface TableCardProps {
  mesa: Mesa
  onClick: (mesa: Mesa) => void
  fallbackUsuarioNome?: string
}

const formatTime = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function TableCard({ mesa, onClick, fallbackUsuarioNome }: TableCardProps) {
  const isOcupada = mesa.status === 'OCUPADA'
  const isFechamento = mesa.status === 'FECHAMENTO'

  let borderColor = 'border-emerald-300'
  let backgroundColor = 'bg-emerald-50'
  let numberColor = 'text-emerald-950'
  let badgeClass = 'bg-emerald-100 text-emerald-800'
  let dotClass = 'bg-emerald-500'
  let footerColor = 'border-emerald-200 bg-emerald-100/70'
  let textColor = 'text-emerald-950'
  let statusText = 'LIVRE'

  if (isOcupada) {
    borderColor = 'border-amber-300'
    backgroundColor = 'bg-amber-50'
    numberColor = 'text-slate-950'
    badgeClass = 'bg-amber-100 text-amber-900'
    dotClass = 'bg-amber-500'
    footerColor = 'border-amber-200 bg-amber-100/70'
    textColor = 'text-slate-950'
    statusText = 'EM ANDAMENTO'
  } else if (isFechamento) {
    borderColor = 'border-red-300'
    backgroundColor = 'bg-red-50'
    numberColor = 'text-red-950'
    badgeClass = 'bg-red-100 text-red-800'
    dotClass = 'bg-red-500'
    footerColor = 'border-red-200 bg-red-100/70'
    textColor = 'text-red-950'
    statusText = 'FECHANDO'
  }

  const comanda = mesa.comandas?.[0]
  const usuarioNome = comanda?.usuario?.nome || fallbackUsuarioNome || 'Desconhecido'
  const nomeCliente = comanda?.nomeCliente?.trim()

  return (
    <button
      type="button"
      onClick={() => onClick(mesa)}
      aria-label={`Mesa ${mesa.numero}, ${statusText.toLocaleLowerCase('pt-BR')}${nomeCliente ? `, cliente ${nomeCliente}` : ''}`}
      className={clsx(
        'group flex min-h-[118px] w-full cursor-pointer flex-col overflow-hidden rounded-xl border text-left',
        'transition-[background-color,border-color] duration-150',
        'hover:border-slate-400',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/45',
        borderColor,
        backgroundColor
      )}
    >
      <div className="relative flex flex-1 flex-col items-start justify-center px-4 py-3">
        <span aria-hidden="true" className={clsx('absolute right-4 top-4 size-3 rounded-full shadow-inner', dotClass)} />

        <span className={clsx('font-sans text-[48px] font-bold leading-none tracking-[-0.045em] tabular-nums', numberColor)}>
          {mesa.numero.toString().padStart(2, '0')}
        </span>

        <div className={clsx('mt-2 rounded px-2.5 py-1 text-[9px] font-extrabold leading-none', badgeClass)}>
          {statusText}
        </div>

        {nomeCliente && (
          <span className="mt-2 max-w-full truncate text-xs font-bold text-slate-700" title={`Cliente: ${nomeCliente}`}>
            {nomeCliente}
          </span>
        )}
      </div>

      {(isOcupada || isFechamento) && comanda && (
        <div className={clsx('flex min-h-10 w-full items-center justify-between border-t px-4 py-2', footerColor, textColor)}>
          <span className="min-w-0 truncate text-sm font-extrabold" title={usuarioNome}>
            {usuarioNome}
          </span>
          <span className="ml-2 shrink-0 text-xs font-bold tabular-nums opacity-80">
            {formatTime(comanda.abertaEm)}
          </span>
        </div>
      )}
    </button>
  )
}
