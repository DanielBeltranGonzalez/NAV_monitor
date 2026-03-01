#!/usr/bin/env bash
# Restaura el backup más reciente (o uno concreto).
# Uso: npm run db:restore              → restaura el más reciente
#      npm run db:restore -- nav_20260228_120000.db

BACKUP_DIR="prisma/backups"
DB="prisma/prisma/nav.db"

if [ -n "$1" ]; then
  BACKUP="$BACKUP_DIR/$1"
else
  BACKUP=$(ls -t "$BACKUP_DIR"/*.db 2>/dev/null | head -1)
fi

if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then
  echo "❌ No se encontró ningún backup en $BACKUP_DIR"
  exit 1
fi

cp "$BACKUP" "$DB"
echo "✅ Restaurado desde: $BACKUP"
