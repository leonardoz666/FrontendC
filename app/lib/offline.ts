export const OFFLINE_STATUS_EVENT = 'rei:offline-status'
export const OFFLINE_SYNC_EVENT = 'rei:offline-synced'

const DB_NAME = 'rei-offline'
const DB_VERSION = 1
const RESPONSE_STORE = 'responses'
const MUTATION_STORE = 'mutations'
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

type CachedResponse = {
  key: string
  tenantSlug?: string
  payload: unknown
  updatedAt: number
}

export type OfflineMutation = {
  id: string
  tenantSlug?: string
  path: string
  method: string
  body: unknown
  headers: Record<string, string>
  metadata?: unknown
  createdAt: number
  attempts: number
  lastError?: string
  blocked?: boolean
}

export type OfflineStatus = {
  offline: boolean
  pending: number
  failed: number
  syncing: boolean
  failedMutationId?: string
  lastError?: string
}

export type OfflineQueuedResult = {
  offline: true
  queued: true
  offlineMutationId: string
}

export type OfflineOrderItemMetadata = {
  id: number
  nome: string
  quantidade: number
  preco: number
  observacao: string | null
  status: string
  horario: string
}

let backendReachable = true
let syncing = false
let syncInFlight: Promise<void> | null = null

function browserAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

const UNRESOLVED_TENANT = '__tenant-unresolved__'

export function currentTenantSlug(): string {
  if (typeof document === 'undefined') return UNRESOLVED_TENANT
  const match = document.cookie.match(/(?:^|;\s*)rei_tenant_slug=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : UNRESOLVED_TENANT
}

function belongsToCurrentTenant(record: { tenantSlug?: string }): boolean {
  return record.tenantSlug === currentTenantSlug()
}

function cacheKey(path: string): string {
  return `${currentTenantSlug()}:${path}`
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha no armazenamento offline'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Falha na transação offline'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Transação offline cancelada'))
  })
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (!browserAvailable()) return null
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(RESPONSE_STORE)) {
      database.createObjectStore(RESPONSE_STORE, { keyPath: 'key' })
    }
    if (!database.objectStoreNames.contains(MUTATION_STORE)) {
      const store = database.createObjectStore(MUTATION_STORE, { keyPath: 'id' })
      store.createIndex('createdAt', 'createdAt')
    }
  }
  return requestResult(request)
}

async function getRecord<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const database = await openDatabase()
  if (!database) return undefined
  try {
    const transaction = database.transaction(storeName, 'readonly')
    return await requestResult(transaction.objectStore(storeName).get(key)) as T | undefined
  } finally {
    database.close()
  }
}

async function getAllRecords<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase()
  if (!database) return []
  try {
    const transaction = database.transaction(storeName, 'readonly')
    return await requestResult(transaction.objectStore(storeName).getAll()) as T[]
  } finally {
    database.close()
  }
}

async function putRecord(storeName: string, value: unknown): Promise<void> {
  const database = await openDatabase()
  if (!database) return
  try {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(value)
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

async function deleteRecord(storeName: string, key: IDBValidKey): Promise<void> {
  const database = await openDatabase()
  if (!database) return
  try {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).delete(key)
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

function dispatch(name: string): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name))
}

async function notifyStatus(): Promise<void> {
  dispatch(OFFLINE_STATUS_EVENT)
}

export function isCacheableApiGet(path: string): boolean {
  const pathname = path.split('?')[0]
  return pathname === '/api/auth/me'
    || pathname === '/api/tables'
    || pathname === '/api/tables/waiters'
    || /^\/api\/tables\/\d+$/.test(pathname)
    || pathname === '/api/categories'
    || pathname === '/api/caixa/operacional'
}

export function isQueueableApiMutation(method: string, path: string): boolean {
  if (method.toUpperCase() !== 'POST') return false
  const pathname = path.split('?')[0]
  return pathname === '/api/orders'
    || /^\/api\/tables\/\d+\/(open|reopen|request-bill|print-partial)$/.test(pathname)
}

export function isTransientOfflineFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (!error || typeof error !== 'object') return false
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' && TRANSIENT_STATUSES.has(status)
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `rei-${crypto.randomUUID()}`
  }
  return `rei-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export function isOfflineQueuedResult(value: unknown): value is OfflineQueuedResult {
  return Boolean(
    value && typeof value === 'object'
    && (value as Partial<OfflineQueuedResult>).offline === true
    && (value as Partial<OfflineQueuedResult>).queued === true
  )
}

export function markBackendReachable(reachable: boolean): void {
  if (backendReachable === reachable) return
  backendReachable = reachable
  void notifyStatus()
}

export async function cacheApiPayload(path: string, payload: unknown): Promise<void> {
  if (!isCacheableApiGet(path)) return
  try {
    await putRecord(RESPONSE_STORE, {
      key: cacheKey(path),
      tenantSlug: currentTenantSlug(),
      payload,
      updatedAt: Date.now()
    } satisfies CachedResponse)
  } catch (error) {
    console.warn('[OFFLINE CACHE] Não foi possível armazenar a resposta localmente.', error)
  }
}

export async function readCachedApiPayload(path: string): Promise<unknown | undefined> {
  if (!isCacheableApiGet(path)) return undefined
  try {
    const exact = await getRecord<CachedResponse>(RESPONSE_STORE, cacheKey(path))
    if (exact) return exact.payload

    const tableMatch = path.split('?')[0].match(/^\/api\/tables\/(\d+)$/)
    if (tableMatch) {
      const tableId = Number(tableMatch[1])
      const cached = (await getAllRecords<CachedResponse>(RESPONSE_STORE)).filter(belongsToCurrentTenant)
      const tableList = cached.find(record => record.key.endsWith('/api/tables'))?.payload
      if (Array.isArray(tableList)) {
        const table = tableList.find(item => item && typeof item === 'object' && Number((item as { id?: unknown }).id) === tableId)
        if (table) return { ...table, comandas: [] }
      }
    }
  } catch (error) {
    console.warn('[OFFLINE CACHE] Não foi possível ler os dados locais.', error)
  }
  return undefined
}

export async function queueApiMutation(input: {
  path: string
  method: string
  body: unknown
  headers: Headers
  metadata?: unknown
}): Promise<OfflineQueuedResult> {
  if (!browserAvailable()) {
    throw new Error('O armazenamento offline não está disponível neste navegador.')
  }
  const id = input.headers.get('Idempotency-Key') ?? createIdempotencyKey()
  const headers: Record<string, string> = {}
  for (const name of ['Content-Type', 'Accept', 'Idempotency-Key']) {
    const value = input.headers.get(name)
    if (value) headers[name] = value
  }
  const mutation: OfflineMutation = {
    id,
    tenantSlug: currentTenantSlug(),
    path: input.path,
    method: input.method.toUpperCase(),
    body: input.body,
    headers,
    metadata: input.metadata,
    createdAt: Date.now(),
    attempts: 0
  }
  await putRecord(MUTATION_STORE, mutation)
  backendReachable = false
  await notifyStatus()
  return { offline: true, queued: true, offlineMutationId: id }
}

export async function listOfflineMutations(): Promise<OfflineMutation[]> {
  const mutations = await getAllRecords<OfflineMutation>(MUTATION_STORE)
  return mutations.filter(belongsToCurrentTenant).sort((a, b) => a.createdAt - b.createdAt)
}

export async function listOfflineOrderItems(mesaId: number): Promise<OfflineOrderItemMetadata[]> {
  const mutations = await listOfflineMutations()
  return mutations.flatMap(mutation => {
    if (mutation.path !== '/api/orders' || !mutation.metadata || typeof mutation.metadata !== 'object') return []
    const metadata = mutation.metadata as { mesaId?: unknown; itens?: unknown }
    if (Number(metadata.mesaId) !== mesaId || !Array.isArray(metadata.itens)) return []
    return metadata.itens.filter((item): item is OfflineOrderItemMetadata => {
      if (!item || typeof item !== 'object') return false
      const value = item as Partial<OfflineOrderItemMetadata>
      return Number.isInteger(value.id)
        && typeof value.nome === 'string'
        && typeof value.quantidade === 'number'
        && typeof value.preco === 'number'
    })
  })
}

export async function getOfflineStatus(): Promise<OfflineStatus> {
  const mutations = await listOfflineMutations()
  const firstFailure = mutations.find(mutation => mutation.blocked)
  const navigatorOnline = typeof navigator === 'undefined' ? true : navigator.onLine
  return {
    offline: !navigatorOnline || !backendReachable,
    pending: mutations.length,
    failed: mutations.filter(mutation => mutation.blocked).length,
    syncing,
    failedMutationId: firstFailure?.id,
    lastError: firstFailure?.lastError,
  }
}

export async function discardOfflineMutation(id: string): Promise<void> {
  await deleteRecord(MUTATION_STORE, id)
  dispatch(OFFLINE_SYNC_EVENT)
  await notifyStatus()
}

export async function clearOfflineData(): Promise<void> {
  const [responses, mutations] = await Promise.all([
    getAllRecords<CachedResponse>(RESPONSE_STORE),
    getAllRecords<OfflineMutation>(MUTATION_STORE)
  ])
  await Promise.all([
    ...responses.filter(belongsToCurrentTenant).map(record => deleteRecord(RESPONSE_STORE, record.key)),
    ...mutations.filter(belongsToCurrentTenant).map(record => deleteRecord(MUTATION_STORE, record.id))
  ])
  backendReachable = true
  await notifyStatus()
}

async function invalidateOperationalCache(path: string): Promise<void> {
  const tableId = path.match(/^\/api\/tables\/(\d+)/)?.[1]
  const records = (await getAllRecords<CachedResponse>(RESPONSE_STORE)).filter(belongsToCurrentTenant)
  const keys = records
    .filter(record => {
      const storedPath = record.key.slice(record.key.indexOf(':') + 1)
      const pathname = storedPath.split('?')[0]
      return pathname === '/api/tables'
        || pathname === '/api/caixa/operacional'
        || (tableId !== undefined && pathname === `/api/tables/${tableId}`)
    })
    .map(record => record.key)
  await Promise.all(keys.map(key => deleteRecord(RESPONSE_STORE, key)))
}

async function updateMutationFailure(mutation: OfflineMutation, message: string, blocked: boolean): Promise<void> {
  await putRecord(MUTATION_STORE, {
    ...mutation,
    attempts: mutation.attempts + 1,
    lastError: message,
    blocked
  } satisfies OfflineMutation)
}

export async function syncOfflineQueue(options: { retryBlocked?: boolean } = {}): Promise<void> {
  if (!browserAvailable()) return
  if (syncInFlight) return syncInFlight

  syncInFlight = (async () => {
    syncing = true
    await notifyStatus()
    try {
      const mutations = await listOfflineMutations()
      for (const mutation of mutations) {
        if (mutation.blocked && !options.retryBlocked) continue
        try {
          const response = await fetch(mutation.path, {
            method: mutation.method,
            headers: { ...mutation.headers, 'x-tenant-slug': mutation.tenantSlug || 'rei-do-pirao' },
            credentials: 'include',
            body: mutation.body === undefined || mutation.body === null
              ? null
              : JSON.stringify(mutation.body)
          })
          if (response.ok) {
            await deleteRecord(MUTATION_STORE, mutation.id)
            await invalidateOperationalCache(mutation.path)
            backendReachable = true
            dispatch(OFFLINE_SYNC_EVENT)
            continue
          }

          const message = (await response.text()).slice(0, 300) || `Erro ${response.status}`
          if (TRANSIENT_STATUSES.has(response.status)) {
            await updateMutationFailure(mutation, message, false)
            backendReachable = false
            break
          }
          await updateMutationFailure(mutation, message, true)
          if (response.status === 401 || response.status === 403) break
        } catch (error) {
          await updateMutationFailure(
            mutation,
            error instanceof Error ? error.message : 'Sem conexão com o servidor',
            false
          )
          backendReachable = false
          break
        }
      }
    } finally {
      syncing = false
      syncInFlight = null
      await notifyStatus()
    }
  })()

  return syncInFlight
}

export function subscribeOfflineStatus(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(OFFLINE_STATUS_EVENT, listener)
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener(OFFLINE_STATUS_EVENT, listener)
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

