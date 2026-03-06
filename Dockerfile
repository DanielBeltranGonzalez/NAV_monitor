# ── Stage 1: deps ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: builder ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build
RUN mkdir -p public

# ── Stage 3: runner ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat openssl openssh-client rsync

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario no-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs \
 && mkdir -p /data \
 && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public       ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next        ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma       ./prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
