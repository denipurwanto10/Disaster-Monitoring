import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

let singleton: Socket | null = null;

export function getSocket(): Socket {
  if (!singleton) {
    singleton = io(API_URL, { transports: ['websocket', 'polling'], reconnection: true });
  }
  return singleton;
}

export function useSocketEvent<T>(event: string, handler: (payload: T) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const socket = getSocket();
    const fn = (payload: T) => ref.current(payload);
    socket.on(event, fn);
    return () => {
      socket.off(event, fn);
    };
  }, [event]);
}

export function useSocketConnected(): boolean {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const socket = getSocket();
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    setConnected(socket.connected);
    socket.on('connect', on);
    socket.on('disconnect', off);
    return () => {
      socket.off('connect', on);
      socket.off('disconnect', off);
    };
  }, []);
  return connected;
}

export function useNotifyPermission(): { permission: NotificationPermission | 'unsupported'; request: () => Promise<void> } {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, []);
  const request = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
    } catch {
      setPermission(Notification.permission);
    }
  }, []);
  return { permission, request };
}
