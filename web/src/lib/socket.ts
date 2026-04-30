import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(): Socket {
  if (socket?.connected) return socket
  socket?.disconnect()
  socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function joinBaby(babyId: string) {
  socket?.emit('join:baby', babyId)
}

export function leaveBaby(babyId: string) {
  socket?.emit('leave:baby', babyId)
}

export function getSocket(): Socket | null {
  return socket
}
