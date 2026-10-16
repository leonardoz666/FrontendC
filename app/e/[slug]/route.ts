import { NextRequest, NextResponse } from 'next/server'

// Compatibilidade com links antigos: a seleção por slug foi substituída pela
// ativação segura do aplicativo, que valida a API e o código do estabelecimento.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/instalacao', request.url))
}
