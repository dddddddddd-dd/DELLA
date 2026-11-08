import { prisma } from '../config/index.js';

interface AuditParams {
  userId: string;
  action: string;
  details: string;
  ip?: string;
}

export const logAudit = async (params: AuditParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        details: params.details,
        ip: params.ip || null,
      },
    });
  } catch (error) {
    console.error('Ошибка записи в журнал аудита:', error);
  }
};

