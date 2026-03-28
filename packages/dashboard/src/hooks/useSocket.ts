import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';

// Singleton — never create io() per component
let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(import.meta.env.VITE_API_URL ?? '', {
      auth: { token: localStorage.getItem('jwt') },
      transports: ['websocket'],
    });
  }
  return sharedSocket;
}

export function useSocket(event: string, handler: (data: unknown) => void) {
  useEffect(() => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [event, handler]);
}
