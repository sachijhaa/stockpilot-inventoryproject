import { prisma } from '../config/prisma';
import { getIo, SOCKET_EVENTS } from '../sockets/io';
import { NotificationType } from '@prisma/client';
import { sendMail } from './mailer.service';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
  emailAlso = false
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined },
  });

  try {
    getIo().to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
  } catch {
    /* socket not ready */
  }

  if (emailAlso) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await sendMail(user.email, title, `<p>${message}</p>`);
    }
  }

  return notification;
}

export async function notifyAllAdmins(type: NotificationType, title: string, message: string, metadata?: Record<string, unknown>) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
  for (const admin of admins) {
    await createNotification(admin.id, type, title, message, metadata);
  }
}
