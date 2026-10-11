function comoNumeroQuantidade(valor: unknown): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '') {
    const convertido = Number(valor.replace(',', '.'))
    return Number.isFinite(convertido) ? convertido : 0
  }
  return 0
}

export function formatarNumeroQuantidade(valor: unknown, maximoCasas = 3): string {
  return comoNumeroQuantidade(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maximoCasas,
  })
}

export function formatarUnidade(unidade?: string | null): string {
  return String(unidade ?? '').trim().toLocaleLowerCase('pt-BR')
}

export function formatarQuantidade(
  valor: unknown,
  unidade?: string | null,
  maximoCasas = 3,
): string {
  return `${formatarNumeroQuantidade(valor, maximoCasas)} ${formatarUnidade(unidade)}`.trim()
}

export function quantidadeParaInput(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return ''
  return String(comoNumeroQuantidade(valor))
}
