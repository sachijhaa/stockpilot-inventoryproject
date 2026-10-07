import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIo(io: Server) {
  ioInstance = io;
}

export function getIo(): Server {
  if (!ioInstance) throw new Error('Socket.io has not been initialized yet');
  return ioInstance;
}

// Convenience emitters used across controllers/services
export const SOCKET_EVENTS = {
  INVENTORY_UPDATED: 'inventory:updated',
  LOW_STOCK_ALERT: 'inventory:low-stock',
  ORDER_STATUS_CHANGED: 'order:status-changed',
  TRANSFER_UPDATED: 'transfer:updated',
  NOTIFICATION_NEW: 'notification:new',
  DASHBOARD_REFRESH: 'dashboard:refresh',
  USER_ONLINE: 'presence:online',
  USER_OFFLINE: 'presence:offline',
  AI_CHAT_TYPING: 'ai-chat:typing',
  AI_CHAT_MESSAGE: 'ai-chat:message',
} as const;
