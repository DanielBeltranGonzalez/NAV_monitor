# NAV Monitor

Aplicación web para registrar y visualizar el valor liquidativo (NAV) de tus inversiones.
Construida con Next.js, libSQL (Prisma) y Tailwind CSS. Soporta cifrado AES-256 de la base de datos.

---

## Despliegue en Portainer desde repositorio Git

### Requisitos previos

- Portainer CE/BE instalado y accesible.
- Acceso al repositorio GitHub: `https://github.com/DanielBeltranGonzalez/NAV_monitor`

### Pasos

1. En Portainer, ir a **Stacks → Add stack**.
2. Seleccionar **Repository** como origen.
3. Rellenar los campos:
   - **Repository URL:** `https://github.com/DanielBeltranGonzalez/NAV_monitor`
   - **Branch:** `main`
   - **Compose path:** `docker-compose.yml`
4. En la sección **Environment variables**, añadir:

   | Variable | Valor |
   |---|---|
   | `JWT_SECRET` | Cadena aleatoria larga y segura (ver nota) |
   | `HOST_PORT` | Puerto del host donde se expondrá la app (ej. `3000`) |
   | `DB_ENCRYPTION_KEY` | Clave AES-256 para cifrar la BD (opcional, ver nota) |

   > **Cómo generar `JWT_SECRET`:**
   > ```bash
   > openssl rand -base64 48
   > ```

   > **Cómo generar `DB_ENCRYPTION_KEY` (opcional pero recomendado en producción):**
   > ```bash
   > openssl rand -hex 32
   > ```
   > Si no se define, la base de datos queda sin cifrar. Si se define, el archivo `.db` queda
   > protegido con AES-256: sin la clave, el fichero no es legible aunque alguien lo copie.
   > **Una vez activado el cifrado, no cambies ni pierdas esta clave** o perderás acceso a los datos.

5. Hacer clic en **Deploy the stack**.

Portainer construirá la imagen, creará el volumen `nav_data` (donde vive la base de datos) y arrancará el contenedor.

Al primer inicio, `docker-entrypoint.sh` ejecuta las migraciones automáticamente, creando el esquema de la base de datos.

> **La base de datos arranca vacía.** No hay ningún usuario precreado.
> El **primer usuario que se registre** en `/auth/register` recibirá automáticamente el rol **ADMIN**.
> Regístrate con tu cuenta definitiva antes de compartir la URL con otros usuarios.

---

## Actualización a una nueva versión

Cuando se publica una nueva versión en `main`:

1. En Portainer, ir a **Stacks** y seleccionar el stack `nav-monitor`.
2. Hacer clic en **Pull and redeploy**.
3. Marcar la opción **Re-pull image** para que Portainer descargue el código actualizado y reconstruya la imagen.
4. Confirmar con **Update the stack**.

El contenedor se reiniciará con la nueva imagen. En el arranque, `docker-entrypoint.sh` aplicará automáticamente cualquier migración de base de datos pendiente antes de iniciar la aplicación.

> **La base de datos no se pierde:** los datos residen en el volumen Docker `nav_data`, que es independiente del contenedor y persiste entre actualizaciones.

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

NAV Monitor soporta cifrado AES-256 a nivel de archivo mediante libSQL. Con el cifrado activo, el fichero `.db` no es legible sin la clave, aunque alguien tenga acceso físico al disco o al volumen Docker.

### Activar el cifrado en una BD existente (migración one-shot)

Si ya tienes datos y quieres cifrar la BD:

```bash
# Genera una clave (guárdala en un lugar seguro)
export DB_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Convierte la BD existente a formato cifrado
npx tsx scripts/db-to-encrypted.ts /data/nav.db /data/nav.enc.db

# Sustituye la BD original
mv /data/nav.db /data/nav.db.bak
mv /data/nav.enc.db /data/nav.db

# Añade DB_ENCRYPTION_KEY a las variables de entorno y reinicia el contenedor
```

---

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `JWT_SECRET` | Secreto para firmar los tokens de sesión. **Obligatorio cambiarlo.** | `dev-secret-change-in-production` |
| `HOST_PORT` | Puerto del host donde se expone la aplicación | `3000` |
| `DATABASE_URL` | Ruta a la base de datos SQLite | `file:/data/nav.db` |
| `DB_ENCRYPTION_KEY` | Clave AES-256 para cifrado de la BD (hex de 32 bytes). Si no se define, la BD queda sin cifrar. | _(sin cifrado)_ |
| `BACKUP_KEEP_DAYS` | Días de retención de backups automáticos | `7` |

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env   # editar JWT_SECRET (y opcionalmente DB_ENCRYPTION_KEY)

# Aplicar migraciones y arrancar
npm run db:migrate -- --name init
npm run dev
```

Otros comandos útiles:

```bash
npm run db:seed              # Cargar datos de prueba
npm run db:studio            # Prisma Studio (interfaz visual de la BD, solo sin cifrado)
npm run db:migrate:encrypted # Aplicar migraciones sobre una BD cifrada
npm test                     # Ejecutar tests
```
