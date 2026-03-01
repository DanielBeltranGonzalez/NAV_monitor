# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# openssl requerido por Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Instalar dependencias primero (mejor caché)
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar código fuente
COPY . .

# Generar cliente Prisma y compilar Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build
RUN mkdir -p public

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copiar artefactos de build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copiar schema y migraciones de Prisma
COPY --from=builder /app/prisma ./prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
# APP_PORT sólo afecta al mapeo del host (docker-compose); el contenedor siempre escucha en 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
