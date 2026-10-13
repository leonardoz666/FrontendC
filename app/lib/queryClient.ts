import { QueryClient } from '@tanstack/react-query'

/** Defaults do PRD 3.3: dados de lista ficam "frescos" por 30s e falha tenta 1 retry. */
export const QUERY_STALE_TIME_MS = 30_000
export const QUERY_RETRY = 1

/**
 * Fábrica do `QueryClient` compartilhado.
 *
 * Fica em `app/lib` (e não inline no provider) para que o mesmo conjunto de
 * defaults seja reutilizável — por exemplo em testes, em prefetch fora de
 * componente React, ou caso o provider precise ser recriado.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        retry: QUERY_RETRY,
        // Ao voltar para uma tela que ficou aberta, confirme dados que possam ter
        // sido alterados em outra aba ou computador durante a ausência.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}
