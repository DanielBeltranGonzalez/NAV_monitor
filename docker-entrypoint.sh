#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "Iniciando NAV Monitor..."
exec npm start
