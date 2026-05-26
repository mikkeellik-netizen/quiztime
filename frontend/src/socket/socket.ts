import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

let socket: Socket | null = null

export function getSocket(token?: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

/** Force a fresh socket (e.g. when switching roles). */
export function resetSocket(token?: string): Socket {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  return getSocket(token)
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
