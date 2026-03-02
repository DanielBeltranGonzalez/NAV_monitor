#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

# Backup automático nocturno
BACKUP_KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}
mkdir -p /data/backups

if command -v crond >/dev/null 2>&1 && [ -w /etc/crontabs ]; then
  echo "0 2 * * * cp /data/nav.db /data/backups/nav_\$(date +\%Y\%m\%d_\%H\%M\%S).db && find /data/backups -name '*.db' -mtime +${BACKUP_KEEP_DAYS} -delete" > /etc/crontabs/root
  crond -b
  echo "Backup automático programado (02:00 diario, retención ${BACKUP_KEEP_DAYS} días)"
else
  echo "Backup automático desactivado (crond no disponible o sin permisos)"
fi

echo "Iniciando NAV Monitor..."
exec npm start
