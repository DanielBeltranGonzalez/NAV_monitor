#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy
# La BD la crea Prisma como root; cedemos la propiedad a nextjs
chown -R nextjs:nodejs /data 2>/dev/null || true

# Backup automático nocturno
BACKUP_KEEP_COPIES=${BACKUP_KEEP_COPIES:-7}
mkdir -p /data/backups && chown nextjs:nodejs /data/backups
mkdir -p /data/ssh && chmod 700 /data/ssh && chown nextjs:nodejs /data/ssh

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
# Sync remoto si está configurado
if [ -f /data/backup_remote.json ] && [ -f /data/ssh/nav_backup_rsa ]; then
  HOST=$(sed -n 's/.*"host":"\([^"]*\)".*/\1/p' /data/backup_remote.json)
  RPATH=$(sed -n 's/.*"path":"\([^"]*\)".*/\1/p' /data/backup_remote.json)
  PORT=$(sed -n 's/.*"port":\([0-9]*\).*/\1/p' /data/backup_remote.json)
  PORT_FLAG=$([ -n "$PORT" ] && echo "-p $PORT" || echo "")
  [ -n "$HOST" ] && rsync -az --mkpath \
    -e "ssh -i /data/ssh/nav_backup_rsa $PORT_FLAG -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/data/ssh/known_hosts -o BatchMode=yes" \
    /data/backups/ "${HOST}:${RPATH:-~/nav-backups}/" || true
fi
SCRIPT
  chmod +x /tmp/nav-backup.sh

  echo "0 2 * * * /tmp/nav-backup.sh && ls -t /data/backups/nav_*.db 2>/dev/null | tail -n +$((${BACKUP_KEEP_COPIES}+1)) | xargs rm -f" > /etc/crontabs/root
  crond -b
  echo "Backup automático programado (02:00 diario, retención ${BACKUP_KEEP_COPIES} copias, solo si hay cambios)"
else
  echo "Backup automático desactivado (crond no disponible o sin permisos)"
fi

echo "Iniciando NAV Monitor..."
exec su-exec nextjs npm start
