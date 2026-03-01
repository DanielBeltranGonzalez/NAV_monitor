# NAV Monitor

Aplicación web para registrar y visualizar el valor liquidativo (NAV) de tus inversiones.
Construida con Next.js, SQLite (Prisma) y Tailwind CSS.

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

   > **Cómo generar `JWT_SECRET`:**
   > ```bash
   > openssl rand -base64 48
   > ```

5. Hacer clic en **Deploy the stack**.

Portainer construirá la imagen, creará el volumen `nav_data` (donde vive la base de datos) y arrancará el contenedor.

Al primer inicio, `docker-entrypoint.sh` ejecuta `prisma migrate deploy` automáticamente, creando el esquema de la base de datos.

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

Las migraciones se gestionan con **Prisma Migrate** y se aplican **automáticamente en cada arranque** del contenedor mediante el comando:

```sh
npx prisma migrate deploy
```

Este comando aplica solo las migraciones pendientes que aún no se hayan ejecutado en la base de datos, por lo que es seguro ejecutarlo en cada inicio.

### ¿Cuándo hay migraciones pendientes?

Cada vez que una nueva versión modifica el esquema de la base de datos, incluye el fichero de migración correspondiente en `prisma/migrations/`. Al actualizar el stack (ver sección anterior), las migraciones se aplican solas al reiniciar el contenedor.

### Aplicar una migración manualmente (si fuera necesario)

Si por algún motivo fuera necesario aplicar la migración a mano:

```bash
docker exec -it nav-monitor npx prisma migrate deploy
```

### Consultar el estado de las migraciones

```bash
docker exec -it nav-monitor npx prisma migrate status
```

### Acceder a la base de datos (solo para diagnóstico)

Los datos están en el volumen `nav_data`. Para inspeccionarlos se puede ejecutar Prisma Studio temporalmente:

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
