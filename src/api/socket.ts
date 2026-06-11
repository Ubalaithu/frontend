import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Get the server URL - in dev use same origin, in prod use VITE_API_URL
const getServerUrl = () => {
  const isDev = import.meta.env.DEV;
  if (isDev) return window.location.origin; // Use same origin (Vite proxy handles it)
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

export function connectSocket(token: string): Socket {
  if (socket?.connected) socket.disconnect();
  
  const url = getServerUrl();
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  
  socket.on('connect', () => {
    console.log('[Socket] Connected to server');
  });
  
  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connect error:', err.message);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });
  
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}