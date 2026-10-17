import { io, type Socket } from 'socket.io-client'
import { apiFetch } from './api'
import { resolveSocketUrl } from './socket-url'

export async function connectTableSocket(): Promise<Socket | null> {
  const socketUrl = await resolveSocketUrl()
  if (!socketUrl) return null
  return io(socketUrl, {
    auth: async (callback) => {
      try {
        const { token } = await apiFetch<{ token: string }>('/auth/socket-token')
        callback({ token })
      } catch {
        callback({ token: '' })
      }
    },
  })
}
