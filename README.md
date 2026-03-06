# NAV Monitor

Aplicación web para registrar y visualizar el valor liquidativo (NAV) de tus inversiones a lo largo del tiempo.
Construida con Next.js 16, SQLite (Prisma) y Tailwind CSS v4.

**Versión actual:** 1.8.9 · **Imagen Docker:** `tacombel/nav-monitor:latest`

---

## Funcionalidades

- Gestión de **bancos** (agrupaciones de inversiones: brokers, patrimonio, etc.)
- Gestión de **inversiones** por banco
- Registro periódico del **valor NAV** de cada inversión
- **Dashboard** con comparativas vs. valor anterior, mes anterior y año anterior, con tasa anualizada
- Vista resumen del portfolio por banco con gráfica de evolución histórica
- **Backups** manuales y automáticos (Docker), con sincronización remota via rsync/SSH
- **Multi-usuario** con roles USER y ADMIN
- Modo oscuro / claro

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
EOF

docker compose up -d
```

---

## Despliegue con docker-compose

Si no usas Portainer, puedes desplegar la aplicación directamente con Docker Compose en cualquier servidor con Docker instalado.

### Pasos

1. Crea un directorio para el proyecto y descarga el fichero `docker-compose.yml`:

   ```bash
   mkdir nav-monitor && cd nav-monitor
   curl -O https://raw.githubusercontent.com/DanielBeltranGonzalez/NAV_monitor/main/docker-compose.yml
   ```

2. Crea el fichero `.env` con las variables necesarias:

   ```bash
   cat > .env <<EOF
   JWT_SECRET=$(openssl rand -base64 48)
   HOST_PORT=3000
   EOF
   ```

3. Arranca el contenedor:

   ```bash
   docker compose up -d
   ```

4. Comprueba que está funcionando:

   ```bash
   docker compose ps
   docker compose logs -f
   ```

La aplicación estará disponible en `http://<IP-DEL-SERVIDOR>:3000`.

### Contenido del docker-compose.yml

```yaml
services:
  nav-monitor:
    image: tacombel/nav-monitor:latest
    container_name: nav-monitor
    restart: unless-stopped
    ports:
      - "${HOST_PORT:-3000}:3000"
    environment:
      - DATABASE_URL=file:/data/nav.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - nav_data:/data
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  nav_data:
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

## Copias de seguridad

### Backup manual desde el panel de administración

Los administradores pueden descargar una copia de la base de datos en cualquier momento desde **Admin → Backups**. El fichero descargado contiene todos los datos (usuarios, bancos, inversiones y valores históricos) y puede usarse para restaurar la base de datos desde la misma pantalla.

### Backup automático (Docker)

En entornos Docker, el contenedor ejecuta automáticamente una copia de seguridad cada noche a las **02:00**, pero solo si la base de datos ha cambiado desde el último backup (comparación por hash SHA-256). Los backups se guardan en `/data/backups/` dentro del volumen persistente.

El número de copias a conservar es configurable mediante la variable de entorno `BACKUP_KEEP_COPIES` (por defecto: 7 copias).

### Sincronización remota

Los backups pueden sincronizarse automáticamente con un servidor externo via **rsync/SSH**:

1. Desde **Admin → Backups**, generar una clave SSH.
2. Añadir la clave pública al servidor destino.
3. Configurar el host remoto y la ruta destino.
4. La sincronización se ejecuta automáticamente tras cada backup nocturno.

### Restaurar un backup

Desde la pantalla de administración de backups puedes restaurar cualquier copia guardada en el servidor con un solo clic. También puedes subir un fichero `.db` externo.

Para restaurar manualmente en un contenedor Docker:

```bash
docker cp nav_backup_FECHA.db nav-monitor:/data/nav.db
docker restart nav-monitor
```

> **Importante:** la restauración sobreescribe todos los datos actuales. Descarga un backup reciente antes de restaurar.

---

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `JWT_SECRET` | Secreto para firmar los tokens de sesión. **Obligatorio en producción.** | — (error si no se define) |
| `HOST_PORT` | Puerto del host donde se expone la aplicación | `3000` |
| `DATABASE_URL` | Ruta a la base de datos SQLite | `file:/data/nav.db` |
| `BACKUP_KEEP_COPIES` | Número de copias de backup automático a conservar | `7` |

---

## Migraciones de base de datos

Las migraciones se aplican **automáticamente en cada arranque** del contenedor via `prisma migrate deploy`.

### Aplicar una migración manualmente

```bash
docker exec -it nav-monitor npx prisma migrate deploy
```

### Consultar el estado de las migraciones

```bash
docker exec -it nav-monitor npx prisma migrate status
```

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env   # editar JWT_SECRET

# Aplicar migraciones y arrancar
npx prisma migrate deploy
npm run dev
```

Otros comandos útiles:

```bash
npm run db:seed    # Cargar datos de prueba
npm run db:studio  # Prisma Studio (interfaz visual de la BD)
npm test           # Ejecutar tests
npm run build      # Build de producción
```
