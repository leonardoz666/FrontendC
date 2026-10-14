export type TransferTable = {
  id: number
  numero: number
  status: string
}

export type TableTransferTarget =
  | { ok: true; numero: number; table: TransferTable | null }
  | { ok: false; message: string }

export function resolveTableTransferTarget(
  tables: TransferTable[],
  sourceTable: { id: number; numero: number },
  typedNumber: string
): TableTransferTarget {
  const input = typedNumber.trim()
  const numero = Number(input)
  if (!/^\d+$/.test(input) || !Number.isInteger(numero) || numero < 1 || numero > 300) {
    return { ok: false, message: 'Digite um número de mesa válido.' }
  }
  if (numero === sourceTable.numero) return { ok: false, message: 'Escolha uma mesa diferente da mesa atual.' }
  const table = tables.find(item => item.numero === numero)
  if (!table) return { ok: true, numero, table: null }
  if (table.id === sourceTable.id) return { ok: false, message: 'Escolha uma mesa diferente da mesa atual.' }
  if (table.status === 'FECHAMENTO') return { ok: false, message: `Mesa ${numero} está em fechamento.` }
  if (table.status !== 'LIVRE') return { ok: false, message: `Mesa ${numero} já está em atendimento.` }
  return { ok: true, numero, table }
}
