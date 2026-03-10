#!/bin/bash
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy
# La BD la crea Prisma como root; cedemos la propiedad a nextjs
chown -R nextjs:nodejs /data 2>/dev/null || true

# Backup automático nocturno
BACKUP_KEEP_COPIES=${BACKUP_KEEP_COPIES:-7}
mkdir -p /data/backups && chown nextjs:nodejs /data/backups
mkdir -p /data/ssh && chmod 700 /data/ssh && chown nextjs:nodejs /data/ssh

# Migración de nombre de clave: nav_backup_rsa → nav_backup_ed25519
if [ -f /data/ssh/nav_backup_rsa ] && [ ! -f /data/ssh/nav_backup_ed25519 ]; then
  mv /data/ssh/nav_backup_rsa /data/ssh/nav_backup_ed25519
  [ -f /data/ssh/nav_backup_rsa.pub ] && mv /data/ssh/nav_backup_rsa.pub /data/ssh/nav_backup_ed25519.pub
  echo "Clave SSH renombrada: nav_backup_rsa → nav_backup_ed25519"
fi

# Logs del servidor
mkdir -p /data/logs && chown nextjs:nodejs /data/logs
LOG_FILE=/data/logs/nav.log
# Rotación simple: si el log supera 10 MB, renombrar a nav.log.1
if [ -f "$LOG_FILE" ]; then
  LOG_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "$LOG_SIZE" -gt 10485760 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.1"
    echo "Log rotado (superó 10 MB)"
  fi
fi

# Guardar número de copias para que el script de backup lo lea
echo "$BACKUP_KEEP_COPIES" > /data/backup_keep_copies

if command -v crond >/dev/null 2>&1 && [ -w /etc/crontabs ]; then
  # Script de backup con detección de cambios (en /data para persistir entre reinicios)
  cat > /data/nav-backup.sh << 'SCRIPT'
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
# Retención: eliminar copias antiguas
KEEP=$(cat /data/backup_keep_copies 2>/dev/null || echo 7)
ls -1t "$BACKUP_DIR"/nav_*.db 2>/dev/null | tail -n "+$((KEEP+1))" | xargs rm -f
# Sync remoto si está configurado
if [ -f /data/backup_remote.json ] && [ -f /data/ssh/nav_backup_ed25519 ]; then
  HOST=$(jq -r '.host // empty' /data/backup_remote.json)
  RPATH=$(jq -r '.path // "~/nav-backups"' /data/backup_remote.json)
  PORT=$(jq -r '.port // empty' /data/backup_remote.json)
  PORT_FLAG=$([ -n "$PORT" ] && echo "-p $PORT" || echo "")
  SSH_CMD="ssh -i /data/ssh/nav_backup_ed25519 $PORT_FLAG -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/data/ssh/known_hosts -o BatchMode=yes"
  [ -n "$HOST" ] && rsync -az --mkpath \
    -e "$SSH_CMD" \
    /data/backups/ "${HOST}:${RPATH:-~/nav-backups}/" || true
  # Sincronizar logs también
  [ -n "$HOST" ] && [ -d /data/logs ] && rsync -az --mkpath \
    -e "$SSH_CMD" \
    /data/logs/ "${HOST}:${RPATH:-~/nav-backups}/logs/" || true
fi
SCRIPT
  chmod +x /data/nav-backup.sh

  echo "0 2 * * * /data/nav-backup.sh" > /etc/crontabs/root
  crond -b
  echo "Backup automático programado (02:00 diario, retención ${BACKUP_KEEP_COPIES} copias, solo si hay cambios)"
else
  echo "Backup automático desactivado (crond no disponible o sin permisos)"
fi

echo "Iniciando NAV Monitor..."
# Process substitution: sin FIFO, sin race condition; bash requerido
exec su-exec nextjs npm start > >(tee -a "$LOG_FILE") 2>&1
