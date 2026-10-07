import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token';
import { setIo, SOCKET_EVENTS } from './io';
import { logger } from '../config/logger';
import { env } from '../config/env';

const onlineUsers = new Map<string, Set<string>>(); // userId -> set of socket ids

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.cookie ?? '').split('accessToken=')[1]?.split(';')[0];
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    socket.join(`user:${userId}`);

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId)!.add(socket.id);

    io.emit(SOCKET_EVENTS.USER_ONLINE, { userId, onlineCount: onlineUsers.size });
    logger.info(`Socket connected: user=${userId} socket=${socket.id}`);

    socket.on('ai-chat:typing', (data) => {
      socket.broadcast.emit(SOCKET_EVENTS.AI_CHAT_TYPING, data);
    });

    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      sockets?.delete(socket.id);
      if (sockets && sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit(SOCKET_EVENTS.USER_OFFLINE, { userId, onlineCount: onlineUsers.size });
      }
      logger.info(`Socket disconnected: user=${userId} socket=${socket.id}`);
    });
  });

  setIo(io);
  return io;
}
