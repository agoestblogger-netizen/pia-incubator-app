import { db } from './index';
import { auditLogs } from './schema';

export async function logAudit({
  userId,
  userName,
  action,
  entity,
  entityId,
  details,
}: {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: userId || null,
      userName: userName || 'System / Anonymous',
      action,
      entity,
      entityId: entityId || null,
      details: details || null,
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]: Gagal mencatat audit log:', err);
  }
}
