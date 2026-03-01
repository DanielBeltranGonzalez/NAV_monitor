#!/usr/bin/env bash
# Crea una copia de seguridad timestamped de nav.db

DB="prisma/prisma/nav.db"
BACKUP_DIR="prisma/backups"

if [ ! -f "$DB" ]; then
  echo "ℹ️  No existe $DB, nada que respaldar."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_DIR/nav_${TIMESTAMP}.db"
cp "$DB" "$DEST"
echo "✅ Backup creado: $DEST"
