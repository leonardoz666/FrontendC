export type PrinterConnection = 'TCP' | 'USB'

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

export function erroDestinoImpressora(conexao: PrinterConnection, destino: string): string | null {
  const valor = destino.trim()
  if (valor === '') return null
  if (conexao === 'TCP' && !IPV4.test(valor)) {
    return 'Para conexão TCP, informe um IP válido, por exemplo 192.168.0.26'
  }
  return null
}
