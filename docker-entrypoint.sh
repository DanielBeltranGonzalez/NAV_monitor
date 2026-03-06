#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

# Backup automático nocturno
BACKUP_KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}
mkdir -p /data/backups

if command -v crond >/dev/null 2>&1 && [ -w /etc/crontabs ]; then
  # Script de backup con detección de cambios
  cat > /tmp/nav-backup.sh << 'SCRIPT'
#!/bin/sh
DB=/data/nav.db
BACKUP_DIR=/data/backups
[ -f "$DB" ] || exit 0
current=$(sha256sum "$DB" | awk '{print $1}')
last=$(ls -1 "$BACKUP_DIR"/nav_*.db 2>/dev/null | tail -1)
if [ -n "$last" ] && [ "$(sha256sum "$last" | awk '{print $1}')" = "$current" ]; then
  exit 0
fi
cp "$DB" "$BACKUP_DIR/nav_$(date +%Y%m%d_%H%M%S).db"
SCRIPT
  chmod +x /tmp/nav-backup.sh

  echo "0 2 * * * /tmp/nav-backup.sh && find /data/backups -name '*.db' -mtime +${BACKUP_KEEP_DAYS} -delete" > /etc/crontabs/root
  crond -b
  echo "Backup automático programado (02:00 diario, retención ${BACKUP_KEEP_DAYS} días, solo si hay cambios)"
else
  echo "Backup automático desactivado (crond no disponible o sin permisos)"
fi

echo "Iniciando NAV Monitor..."
exec npm start
