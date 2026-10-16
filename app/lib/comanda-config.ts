export type TicketStyle = {
  titulo: string
  mostrarTitulo: boolean
  tituloGrande: boolean
  itensGrandes: boolean
  itensEmNegrito: boolean
  itensMaiusculos: boolean
  mostrarItens: boolean
  mostrarSeparadores: boolean
  mostrarData: boolean
  mostrarHora: boolean
  copias: number
}

export type OrderTicketStyle = TicketStyle & {
  mostrarNumeroComanda: boolean
  mostrarNumeroPedido: boolean
  mostrarMesa: boolean
  mostrarGarcom: boolean
  mostrarObservacoes: boolean
}

export type BillTicketStyle = TicketStyle & {
  mostrarEstabelecimento: boolean
  mostrarEndereco: boolean
  mostrarDocumento: boolean
  mostrarMesa: boolean
  mostrarPrecoUnitario: boolean
  mostrarSubtotal: boolean
  mostrarServico: boolean
  mostrarDesconto: boolean
  mostrarPagamento: boolean
  mostrarSaldo: boolean
  mostrarTotal: boolean
  mostrarRodape: boolean
}

export type ComandaConfig = {
  versao: 1
  geral: {
    nomeEstabelecimento: string
    endereco: string
    documento: string
    rodape: string
    margemEsquerda: number
    linhasAntesCorte: number
    separador: '-' | '.' | '_'
  }
  pedido: OrderTicketStyle
  parcial: BillTicketStyle
  fechamento: BillTicketStyle
}

export const DEFAULT_COMANDA_CONFIG: ComandaConfig = {
  versao: 1,
  geral: {
    nomeEstabelecimento: 'ESTABELECIMENTO', endereco: '', documento: '',
    rodape: 'Obrigado pela preferência!\nVolte sempre!', margemEsquerda: 2,
    linhasAntesCorte: 3, separador: '-'
  },
  pedido: {
    titulo: 'COMANDA', mostrarTitulo: true, tituloGrande: true, itensGrandes: true, itensEmNegrito: true,
    itensMaiusculos: true, mostrarItens: true, mostrarSeparadores: true, mostrarData: true, mostrarHora: true, copias: 1,
    mostrarNumeroComanda: true, mostrarNumeroPedido: false, mostrarMesa: true, mostrarGarcom: true, mostrarObservacoes: true
  },
  parcial: {
    titulo: 'PARCIAL DA CONTA', mostrarTitulo: true, tituloGrande: false, itensGrandes: false, itensEmNegrito: false,
    itensMaiusculos: false, mostrarItens: true, mostrarSeparadores: true, mostrarData: true, mostrarHora: true, copias: 1,
    mostrarEstabelecimento: true, mostrarEndereco: true, mostrarDocumento: true, mostrarMesa: true,
    mostrarPrecoUnitario: true, mostrarSubtotal: true, mostrarServico: true, mostrarDesconto: true,
    mostrarPagamento: false, mostrarSaldo: false, mostrarTotal: true, mostrarRodape: true
  },
  fechamento: {
    titulo: 'FECHAMENTO DA CONTA', mostrarTitulo: true, tituloGrande: true, itensGrandes: false, itensEmNegrito: false,
    itensMaiusculos: false, mostrarItens: true, mostrarSeparadores: true, mostrarData: true, mostrarHora: true, copias: 1,
    mostrarEstabelecimento: true, mostrarEndereco: true, mostrarDocumento: true, mostrarMesa: true,
    mostrarPrecoUnitario: true, mostrarSubtotal: true, mostrarServico: true, mostrarDesconto: true,
    mostrarPagamento: true, mostrarSaldo: false, mostrarTotal: true, mostrarRodape: true
  }
}
