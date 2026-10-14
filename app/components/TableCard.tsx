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

  let borderColor = 'border-emerald-400/50'
  let backgroundColor = 'bg-gradient-to-br from-emerald-400 to-emerald-500'
  let numberColor = 'text-white'
  let badgeClass = 'bg-white/25 text-white'
  let dotClass = 'bg-white/45'
  let footerColor = 'border-emerald-600/25 bg-emerald-600/30'
  let textColor = 'text-white'
  let statusText = 'LIVRE'

  if (isOcupada) {
    borderColor = 'border-amber-400/60'
    backgroundColor = 'bg-gradient-to-br from-amber-300 via-amber-300 to-amber-400'
    numberColor = 'text-slate-950'
    badgeClass = 'bg-white/35 text-slate-900'
    dotClass = 'bg-amber-800/50'
    footerColor = 'border-amber-600/20 bg-amber-500/20'
    textColor = 'text-slate-950'
    statusText = 'EM ANDAMENTO'
  } else if (isFechamento) {
    borderColor = 'border-red-600/70'
    backgroundColor = 'bg-gradient-to-br from-red-600 via-red-600 to-red-700'
    numberColor = 'text-white'
    badgeClass = 'bg-red-500 text-white shadow-sm'
    dotClass = 'bg-red-300/70'
    footerColor = 'border-red-800/30 bg-red-900/25'
    textColor = 'text-white'
    statusText = 'FECHANDO'
  }

  const comanda = mesa.comandas?.[0]
  const usuarioNome = comanda?.usuario?.nome || fallbackUsuarioNome || 'Desconhecido'

  return (
    <button
      type="button"
      onClick={() => onClick(mesa)}
      aria-label={`Mesa ${mesa.numero}, ${statusText.toLocaleLowerCase('pt-BR')}`}
      className={clsx(
        'group flex min-h-[118px] w-full cursor-pointer flex-col overflow-hidden rounded-xl border text-left',
        'shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-[transform,box-shadow] duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(0,0,0,0.16)]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/45',
        borderColor,
        backgroundColor
      )}
    >
      <div className="relative flex flex-1 flex-col items-start justify-center px-4 py-3">
        <span aria-hidden="true" className={clsx('absolute right-4 top-4 size-3 rounded-full shadow-inner', dotClass)} />

        <span className={clsx('text-4xl font-black leading-none tracking-[-0.055em]', numberColor)}>
          {mesa.numero.toString().padStart(2, '0')}
        </span>

        <div className={clsx('mt-2 rounded px-2.5 py-1 text-[9px] font-extrabold leading-none', badgeClass)}>
          {statusText}
        </div>
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
