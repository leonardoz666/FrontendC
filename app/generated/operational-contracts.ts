// GENERATED from BackendC/src/contracts/operational-contracts.ts. Do not edit.
export const PERMISSIONS = [
  'mesas.visualizar', 'mesas.abrir', 'mesas.reabrir', 'mesas.fechar', 'mesas.transferir', 'mesas.transferir_itens',
  'pedidos.criar', 'pedidos.editar', 'pedidos.cancelar', 'pedidos.cortesia', 'pedidos.itens.fechar',
  'pagamentos.abrir', 'pagamentos.registrar', 'pagamentos.desconto', 'pagamentos.cancelar', 'pagamentos.estornar',
  'caixa.abrir', 'caixa.movimentar', 'caixa.fechar', 'caixa.ajustar_fechado',
  'produtos.visualizar', 'produtos.criar', 'produtos.editar', 'produtos.excluir', 'produtos.preco',
  'relatorios.visualizar', 'relatorios.faturamento', 'relatorios.caixa', 'relatorios.exportar', 'relatorios.importar', 'relatorios.excluir',
  'usuarios.visualizar', 'usuarios.criar', 'usuarios.editar', 'usuarios.excluir', 'usuarios.permissoes',
  'cadastros.visualizar', 'cadastros.editar', 'cardapio.publicar', 'cardapio.importar',
  'estoque.visualizar', 'estoque.movimentar', 'estoque.ajustar', 'estoque.negativo', 'estoque.solicitar', 'estoque.revisar',
  'ponto.visualizar', 'ponto.registrar', 'ponto.ajustar', 'ponto.gerar_arquivo', 'ponto.auditar',
  'fiscal.visualizar', 'fiscal.emitir', 'fiscal.cancelar', 'fiscal.configurar',
  'clientes.visualizar', 'clientes.editar', 'clientes.exportar', 'clientes.saldo',
  'delivery.visualizar', 'delivery.operar', 'delivery.configurar', 'delivery.motoboys', 'delivery.portal',
  'financeiro.visualizar', 'financeiro.lancar', 'financeiro.baixar', 'financeiro.estornar', 'financeiro.conciliar', 'financeiro.exportar',
  'compras.visualizar', 'compras.solicitar', 'compras.aprovar', 'compras.receber', 'compras.cancelar',
  'requisicoes.visualizar', 'requisicoes.solicitar', 'requisicoes.separar', 'requisicoes.despachar', 'requisicoes.receber',
  'producao.visualizar', 'producao.criar', 'producao.apontar', 'producao.cancelar',
  'fidelidade.visualizar', 'fidelidade.configurar', 'fidelidade.ajustar',
  'marketing.visualizar', 'marketing.editar', 'marketing.disparar', 'marketing.exportar',
  'recrutamento.visualizar', 'recrutamento.editar', 'recrutamento.exportar',
] as const

export type Permission = typeof PERMISSIONS[number]

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
