#!/usr/bin/env bash
# Crea una copia de seguridad timestamped de nav.db
# Solo genera backup si la base de datos cambió respecto al último backup.

DB="prisma/prisma/nav.db"
BACKUP_DIR="prisma/backups"

if [ ! -f "$DB" ]; then
  echo "ℹ️  No existe $DB, nada que respaldar."
  exit 0
fi

mkdir -p "$BACKUP_DIR"

# Checksum del DB actual
current_hash=$(sha256sum "$DB" | awk '{print $1}')

# Checksum del último backup (el más reciente por nombre)
last_backup=$(ls -1 "$BACKUP_DIR"/nav_*.db 2>/dev/null | tail -1)
if [ -n "$last_backup" ]; then
  last_hash=$(sha256sum "$last_backup" | awk '{print $1}')
  if [ "$current_hash" = "$last_hash" ]; then
    echo "ℹ️  Sin cambios desde el último backup ($last_backup), omitiendo."
    exit 0
  fi
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_DIR/nav_${TIMESTAMP}.db"
cp "$DB" "$DEST"
echo "✅ Backup creado: $DEST"
