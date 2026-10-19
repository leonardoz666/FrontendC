const ACTION_PATTERN = /\b(tente|verifique|confira|informe|preencha|selecione|acesse|procure|recarregue|entre|aguarde|libere|corrija|fale)\b/i
const TECHNICAL_PATTERN = /(?:prisma|p\d{4}|typeerror|syntaxerror|fetch failed|failed to fetch|networkerror|stack trace|\bat\s+\w+\s*\()/i

function sentence(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function recoveryFor(message: string): string {
  const normalized = message.toLocaleLowerCase('pt-BR')

  if (/sessão|login|não autorizado|unauthorized|401/.test(normalized)) {
    return 'Entre novamente para continuar.'
  }
  if (/permiss|proibid|forbidden|403/.test(normalized)) {
    return 'Peça acesso a um gerente.'
  }
  if (/conex|internet|rede|offline|carregar|consultar|buscar|abrir|baixar|exportar/.test(normalized)) {
    return 'Verifique sua conexão e tente novamente.'
  }
  if (/obrigat|inválid|invalido|preench|formato|valor|campo|dados/.test(normalized)) {
    return 'Confira os campos informados e tente novamente.'
  }
  return 'Tente novamente. Se o problema continuar, fale com um gerente.'
}

/**
 * Garante que erros exibidos ao usuário expliquem o problema e a recuperação,
 * sem deixar detalhes internos do servidor escaparem para a interface.
 */
export function actionableErrorMessage(message: string): string {
  const safeMessage = !message.trim() || TECHNICAL_PATTERN.test(message)
    ? 'Não foi possível concluir a operação.'
    : sentence(message)

  if (ACTION_PATTERN.test(safeMessage)) return safeMessage
  return `${safeMessage} ${recoveryFor(safeMessage)}`
}
