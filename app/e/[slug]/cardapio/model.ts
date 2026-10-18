export type Size = { id: number; nome: string; valor: number }
export type Complement = { id: number; nome: string; valor: number }
export type Product = {
  id: number; nome: string; descricao?: string | null; foto?: string | null; preco: number; valorPromo?: number | null; destaque: boolean; tipo?: string
  tipoTamanho?: { tamanhos: Size[] } | null
  gruposComplemento?: Array<{ grupo: { id: number; nome: string; obrigatorio: boolean; minEscolhas: number; maxEscolhas: number | null; complementos: Complement[] } }>
}
export type Category = { id: number; nome: string; produtos: Product[] }
export type Catalog = { estabelecimento: { nome: string; slogan?: string | null; logoUrl?: string | null; corPrimaria?: string; corDestaque?: string }; contexto: { canal: string; mesa: number | null }; termos: { versao: string; resumo: string }; categorias: Category[] }
export type CartItem = { key: string; product: Product; quantidade: number; tamanhoId?: number; tamanhoNome?: string; complementIds: number[]; complementNames: string[]; observacao: string; unitPrice: number }
export type PublicSession = { expiraEm: string; mesa: { numero: number }; comanda: { id: number; status: string; total: number; pedidos: Array<{ id: number; status: string; criadoEm: string; itens: Array<{ id: number; quantidade: number; status: string; precoUnitario: number; produto: { nome: string } }> }> } }
export type DeliveryQuote = { taxaEntrega: number; pedidoMinimo: number; estimativaMin: number; zona: { id: number; nome: string }; agendadoPara: string }
export type DeliveryTracking = { id: number; status: string; subtotal: number; taxaEntrega: number; total: number; agendadoPara: string | null; estimativaMin: number | null; nomeDestinatario: string; logradouro: string; numero: string | null; bairro: string; historico: Array<{ status: string; motivo: string | null; criadoEm: string }>; comanda: { pedidos: Array<{ id: number; itens: Array<{ id: number; quantidade: number; status: string; precoUnitario: number; produto: { nome: string } }> }> } }

export const money = (value: number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const deliveryStatusLabels: Record<string, string> = {
  AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação', CONFIRMADO: 'Confirmado', EM_PRODUCAO: 'Em produção', PRONTO: 'Pronto para sair', EM_ENTREGA: 'Saiu para entrega', ENTREGUE: 'Entregue', RECUSADO: 'Recusado', CANCELADO: 'Cancelado', FALHA_PAGAMENTO: 'Pagamento pendente',
}
