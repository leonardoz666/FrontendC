export const MODULE_KEYS = [
  'BALCAO',
  'CARDAPIO_PUBLICO',
  'AUTOATENDIMENTO',
  'DELIVERY',
  'CRM',
  'FIDELIDADE',
  'MARKETING',
  'FINANCEIRO',
  'COMPRAS',
  'PRODUCAO_INTERNA',
  'ROTULOS_BALANCA',
  'GATEWAY_ONLINE',
  'RECRUTAMENTO',
  'HOTELARIA',
] as const

export type ModuleKey = typeof MODULE_KEYS[number]

const MODULE_KEY_SET = new Set<string>(MODULE_KEYS)

export function parseTenantModules(value: unknown): ModuleKey[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((module): module is ModuleKey => (
    typeof module === 'string' && MODULE_KEY_SET.has(module)
  )))]
}
