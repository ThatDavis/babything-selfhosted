import { io } from 'socket.io-client';
let socket = null;
export function connectSocket() {
    if (socket?.connected)
        return socket;
    socket?.disconnect();
    socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true });
    return socket;
}
export function disconnectSocket() {
    socket?.disconnect();
    socket = null;
}
export function joinBaby(babyId) {
    socket?.emit('join:baby', babyId);
}
export function leaveBaby(babyId) {
    socket?.emit('leave:baby', babyId);
}
export function getSocket() {
    return socket;
}
