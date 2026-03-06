# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev -- -H 0.0.0.0   # Start development server bound to all interfaces (remote accessible)
npm run build    # Production build
npm run lint     # Run ESLint
npm run db:backup            # Backup manual de la BD (ejecutar antes de migrar)
```

Tests use **Jest** + **@testing-library/react**. Files in `src/__tests__/` or matching `*.test.{ts,tsx}`.

> Antes de migrar, ejecutar siempre `npm run db:backup`.

## Architecture

**NAV Monitor** — aplicación de seguimiento de patrimonio neto (NAV). Next.js 16 App Router con TypeScript y Tailwind CSS v4. Auth: JWT HS256 con `jose`, cookies httpOnly. BD: SQLite vía Prisma ORM.

### Dominio

El modelo de datos tiene tres entidades principales ligadas al usuario:

- **Bank** — entidad bancaria o bróker (`/api/banks`, `/banks`)
- **Investment** — inversión dentro de un banco (`/api/investments`, `/investments`)
- **Value** — registro de valor puntual de una inversión en una fecha (`/api/values`, `/investments/[id]/values`)

Relación: `User → Bank → Investment → Value` (cada nivel en cascada).

### Páginas

| Ruta | Descripción |
|---|---|
| `/dashboard` | Resumen de patrimonio total + gráfico histórico |
| `/banks` | Lista de bancos/brókers |
| `/banks/new` | Crear banco |
| `/investments` | Lista de inversiones |
| `/investments/new` | Crear inversión |
| `/investments/[id]/values` | Historial de valores de una inversión |
| `/values/new` | Registrar nuevo valor |
| `/profile` | Cambiar contraseña, descargar/importar CSV, eliminar cuenta |
| `/admin/users` | CRUD de usuarios (solo ADMIN) |
| `/admin/events` | Log de auditoría (solo ADMIN) |
| `/admin/backup` | Gestión de backups: manual, restaurar, SSH/rsync remoto |
| `/auth/login` | Login |
| `/auth/register` | Registro (el primer usuario registrado es ADMIN) |

### API Routes

- `POST /api/auth/login` — login, emite JWT en cookie httpOnly
- `POST /api/auth/register` — registro; primer usuario → rol ADMIN
- `POST /api/auth/logout` — borra cookie
- `GET /api/auth/me` — usuario en sesión
- `GET/POST /api/banks` — listar/crear bancos
- `PATCH/DELETE /api/banks/[id]` — editar/eliminar banco
- `GET/POST /api/investments` — listar/crear inversiones (filtradas por usuario)
- `PATCH/DELETE /api/investments/[id]` — editar/eliminar inversión
- `GET/POST /api/values` — listar/registrar valores
- `PATCH/DELETE /api/values/[id]` — editar/eliminar valor
- `GET /api/values/dashboard` — datos agregados para el dashboard
- `GET /api/values/chart` — serie histórica para gráfico
- `GET /api/export/csv` — exportar valores a CSV
- `GET/POST /api/admin/backup` — descargar/restaurar BD completa
- `GET /api/admin/backup/list` — listar backups del servidor
- `GET/POST /api/admin/backup/files/[filename]` — descargar/restaurar backup por nombre
- `GET/POST /api/admin/backup/ssh-key` — leer/generar clave SSH ed25519
- `GET/POST/DELETE /api/admin/backup/remote` — config rsync remoto
- `POST /api/admin/backup/sync` — lanzar rsync manual
- `GET/POST /api/admin/users` — listar/crear usuarios
- `PATCH/DELETE /api/admin/users/[id]` — editar/eliminar usuario
- `POST /api/admin/users/[id]/reset-password` — resetear contraseña
- `GET /api/admin/events` — log de auditoría paginado
- `GET /api/admin/events/count` — contador de eventos no leídos

### Infraestructura

- `src/proxy.ts` — middleware (Next.js 16.x: export `proxy`, no `middleware`). Rate limiting (120 req/min global, 10/15min para login), CSRF, headers de seguridad, sliding window de sesión, guard de rutas admin.
- `src/lib/auth.ts` — JWT, bcrypt, `validatePasswordComplexity`, `getSessionUser`, `COOKIE_NAME`
- `src/lib/audit.ts` — log de eventos de auditoría
- `src/lib/prisma.ts` — singleton Prisma client
- `docker-entrypoint.sh` — corre como root: aplica migraciones, configura cron de backup nocturno (02:00, solo si hay cambios por sha256), rsync remoto si hay config+clave SSH, luego `exec su-exec nextjs npm start`

### Docker Hub

Imagen publicada en `tacombel/nav-monitor`. Build multi-arch (amd64 + arm64).
