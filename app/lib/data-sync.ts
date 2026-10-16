export const DATA_CHANGED_EVENT = 'controlae:data-changed'

export type DataChangeDetail = {
  method: string
  path: string
}

type DataChangeTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'>

export function isMutationMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
}

export function shouldPublishApiMutation(method: string, path: string): boolean {
  return isMutationMethod(method) && !path.startsWith('/api/auth/')
}

export function publishLocalDataChange(target: DataChangeTarget, detail: DataChangeDetail): void {
  target.dispatchEvent(new CustomEvent<DataChangeDetail>(DATA_CHANGED_EVENT, { detail }))
}

export function subscribeLocalDataChanges(
  target: DataChangeTarget,
  listener: (detail: DataChangeDetail) => void
): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<DataChangeDetail>).detail)
  target.addEventListener(DATA_CHANGED_EVENT, handler)
  return () => target.removeEventListener(DATA_CHANGED_EVENT, handler)
}
