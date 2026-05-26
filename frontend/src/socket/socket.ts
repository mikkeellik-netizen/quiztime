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
      reconnectionAttempts: 5,
    })

    // Auto-reconnect: if we have a saved reconnect token, restore game session
    socket.on('connect', () => {
      const reconnectToken = localStorage.getItem('reconnect_token')
      const gameCode = localStorage.getItem('game_code')
      // Only emit if it's a reconnect (socket had already connected before)
      if (reconnectToken && gameCode && socket?.recovered === false) {
        socket!.emit('reconnect_request', { reconnectToken })
      }
    })
  }
  return socket
}

/** Force a fresh socket (e.g. when switching roles or joining a new game). */
export function resetSocket(token?: string): Socket {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  return getSocket(token)
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  localStorage.removeItem('reconnect_token')
  localStorage.removeItem('game_code')
}
