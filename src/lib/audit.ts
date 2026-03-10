import { prisma } from '@/lib/prisma'

export type AuditEvent =
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_DELETED'
  | 'ROLE_CHANGED'
  | 'BACKUP_DOWNLOADED'
  | 'BACKUP_RESTORED'
  | 'BACKUP_SYNC'
  | 'LOGS_DOWNLOADED'

export async function logEvent(
  event: AuditEvent,
  userEmail: string,
  targetEmail?: string
) {
  await prisma.auditLog.create({
    data: { event, userEmail, targetEmail: targetEmail ?? null },
  })
}

export const EVENT_LABELS: Record<AuditEvent, string> = {
  USER_REGISTERED: 'Registro',
  USER_LOGIN: 'Inicio de sesión',
  PASSWORD_CHANGED: 'Cambio de contraseña',
  PASSWORD_RESET: 'Reset de contraseña (admin)',
  ACCOUNT_DELETED: 'Cuenta eliminada',
  ROLE_CHANGED: 'Cambio de rol',
  BACKUP_DOWNLOADED: 'Descarga de backup',
  BACKUP_RESTORED: 'Restauración de backup',
  BACKUP_SYNC: 'Sincronización remota',
  LOGS_DOWNLOADED: 'Descarga de logs',
}
