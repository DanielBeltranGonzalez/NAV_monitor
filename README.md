# NAV Monitor

Aplicación web para registrar y visualizar el valor liquidativo (NAV) de tus inversiones.
Construida con Next.js, SQLite (Prisma) y Tailwind CSS.

---

## Despliegue en Portainer

### Requisitos previos

- Portainer CE/BE instalado y accesible.

### Pasos

1. En Portainer, ir a **Stacks → Add stack**.
2. Seleccionar **Web editor** como origen.
3. Pegar el contenido del fichero `docker-compose.yml` de este repositorio.
4. En la sección **Environment variables**, añadir:

   | Variable | Valor |
   |---|---|
   | `JWT_SECRET` | Cadena aleatoria larga y segura (ver nota) |
   | `HOST_PORT` | Puerto del host donde se expondrá la app (ej. `3000`) |

   > **Cómo generar `JWT_SECRET`:**
   > ```bash
   > openssl rand -base64 48
   > ```

5. Hacer clic en **Deploy the stack**.

Portainer descargará la imagen desde Docker Hub, creará el volumen `nav_data` (donde vive la base de datos) y arrancará el contenedor.

Al primer inicio, `docker-entrypoint.sh` ejecuta las migraciones automáticamente, creando el esquema de la base de datos.

> **La base de datos arranca vacía.** No hay ningún usuario precreado.
> El **primer usuario que se registre** en `/auth/register` recibirá automáticamente el rol **ADMIN**.
> Regístrate con tu cuenta definitiva antes de compartir la URL con otros usuarios.

### Alternativa: despliegue por línea de comandos

```bash
# Descargar el docker-compose.yml
curl -O https://raw.githubusercontent.com/DanielBeltranGonzalez/NAV_monitor/main/docker-compose.yml

# Crear .env con las variables necesarias
cat > .env <<EOF
JWT_SECRET=$(openssl rand -base64 48)
HOST_PORT=3000
# DB_ENCRYPTION_KEY=$(openssl rand -hex 32)   # descomentar para cifrar la BD
EOF

docker compose up -d
```

---

## Actualización a una nueva versión

Cuando se publica una nueva versión en Docker Hub:

1. En Portainer, ir a **Stacks** y seleccionar el stack `nav-monitor`.
2. Hacer clic en **Pull and redeploy**.
3. Confirmar con **Update the stack**.

Portainer descargará la nueva imagen desde Docker Hub y reiniciará el contenedor. En el arranque, `docker-entrypoint.sh` aplicará automáticamente cualquier migración de base de datos pendiente.

> **La base de datos no se pierde:** los datos residen en el volumen Docker `nav_data`, que es independiente del contenedor y persiste entre actualizaciones.

### Alternativa: actualización por línea de comandos

```bash
docker compose pull && docker compose up -d
```

---

## Migraciones de base de datos

Las migraciones se aplican **automáticamente en cada arranque** del contenedor.

- **Sin `DB_ENCRYPTION_KEY`:** se usa `prisma migrate deploy` (driver SQLite nativo).
- **Con `DB_ENCRYPTION_KEY`:** se usa `npm run db:migrate:encrypted` (driver libSQL cifrado).

El script de arranque detecta automáticamente cuál usar según la presencia de la variable.

### Aplicar una migración manualmente (si fuera necesario)

**Sin cifrado:**
```bash
docker exec -it nav-monitor npx prisma migrate deploy
```

**Con cifrado:**
```bash
docker exec -it nav-monitor npm run db:migrate:encrypted
```

### Consultar el estado de las migraciones (solo sin cifrado)

```bash
docker exec -it nav-monitor npx prisma migrate status
```

### Acceder a la base de datos (solo para diagnóstico)

Los datos están en el volumen `nav_data`. Para inspeccionarlos se puede ejecutar Prisma Studio temporalmente (requiere BD sin cifrar):

```bash
docker exec -it nav-monitor npx prisma studio
```

---

## Copias de seguridad

### Backup manual desde el panel de administración

Los administradores pueden descargar una copia de la base de datos en cualquier momento desde **Admin → Backups**. El fichero descargado contiene todos los datos (usuarios, bancos, inversiones y valores históricos) y puede usarse para restaurar la base de datos.

### Backup automático (Docker)

En entornos Docker, el contenedor ejecuta automáticamente una copia de seguridad cada noche a las **02:00**. Los backups se guardan en `/data/backups/` dentro del volumen persistente.

El número de días de retención es configurable mediante la variable de entorno `BACKUP_KEEP_DAYS` (por defecto: 7 días).

> **Nota:** si la BD está cifrada, los backups también lo estarán. Asegúrate de guardar `DB_ENCRYPTION_KEY` en un lugar seguro.

### Restaurar un backup

Para restaurar un backup en un contenedor Docker en ejecución:

1. Detener la aplicación (o poner el stack en pausa desde Portainer).
2. Copiar el fichero `.db` al volumen, reemplazando la base de datos actual:

   ```bash
   docker cp nav_backup_FECHA.db nav-monitor:/data/nav.db
   ```

3. Reiniciar el contenedor.

> **Importante:** la restauración sobreescribe todos los datos actuales. Descarga un backup reciente antes de restaurar.

---

## Cifrado de la base de datos

> **Estado actual:** el cifrado AES-256 a nivel de archivo requiere actualizar Prisma a v7, lo que implica cambios de arquitectura significativos. Esta funcionalidad está **pendiente** para una versión futura.
>
> Los scripts `scripts/db-to-encrypted.ts` y `scripts/db-apply-migrations.ts` están disponibles en el repositorio como utilidades independientes, pero la aplicación **no puede abrir** una BD cifrada con la versión actual de Prisma (5.x).
>
> Mientras tanto, la protección de los datos en reposo puede realizarse a nivel de sistema operativo (cifrado del volumen Docker o del disco del servidor).

---

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `JWT_SECRET` | Secreto para firmar los tokens de sesión. **Obligatorio cambiarlo.** | `dev-secret-change-in-production` |
| `HOST_PORT` | Puerto del host donde se expone la aplicación | `3000` |
| `DATABASE_URL` | Ruta a la base de datos SQLite | `file:/data/nav.db` |
| `BACKUP_KEEP_DAYS` | Días de retención de backups automáticos | `7` |

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env   # editar JWT_SECRET

# Aplicar migraciones y arrancar
npm run db:migrate -- --name init
npm run dev
```

Otros comandos útiles:

```bash
npm run db:seed    # Cargar datos de prueba
npm run db:studio  # Prisma Studio (interfaz visual de la BD)
npm test           # Ejecutar tests
```
