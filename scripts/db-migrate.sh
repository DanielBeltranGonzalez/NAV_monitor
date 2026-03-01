#!/usr/bin/env bash
# Backup + migrate en un solo comando.
# Uso: npm run db:migrate -- --name descripcion_del_cambio

set -e

echo "🔒 Guardando copia de seguridad..."
bash scripts/db-backup.sh

echo "🚀 Aplicando migración..."
npx prisma migrate dev "$@"
