import { prisma } from '../config/prisma';

export async function logActivity(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.activityLog.create({
    data: { userId, action, entity, entityId, metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined },
  });
}

export async function logAudit(
  userId: string | undefined,
  entity: string,
  entityId: string,
  action: string,
  before?: unknown,
  after?: unknown,
  ipAddress?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      entity,
      entityId,
      action,
      before: before ? JSON.parse(JSON.stringify(before)) : undefined,
      after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      ipAddress,
    },
  });
}
