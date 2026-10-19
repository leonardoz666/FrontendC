export const MODULE_KEYS = [
  'RELATORIOS',
  'MESAS',
  'BALCAO',
  'CARDAPIO',
  'CARDAPIO_PUBLICO',
  'AUTOATENDIMENTO',
  'CADASTROS',
  'CRM',
  'DELIVERY',
  'FIDELIDADE',
  'MARKETING',
  'FINANCEIRO',
  'CAIXA',
  'FISCAL',
  'CFE_SAT',
  'ESTOQUE',
  'COMPRAS',
  'PRODUCAO_INTERNA',
  'IMPRESSAO',
  'ROTULOS_BALANCA',
  'CONTROLE_DOSES',
  'PONTO',
  'ADMINISTRACAO',
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
