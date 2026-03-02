/**
 * db-apply-migrations.ts
 *
 * Aplica las migraciones Prisma pendientes sobre una BD cifrada con libSQL.
 * Reemplaza `prisma migrate deploy` cuando DB_ENCRYPTION_KEY está activa.
 *
 * Uso:
 *   npm run db:migrate:encrypted
 *   (requiere DATABASE_URL y DB_ENCRYPTION_KEY en .env o en el entorno)
 */

import { createClient } from '@libsql/client'
import path from 'path'
import fs from 'fs'

const MIGRATIONS_TABLE = '_prisma_migrations'

interface MigrationRecord {
  migration_name: string
  finished_at: string | null
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  const encryptionKey = process.env.DB_ENCRYPTION_KEY || undefined

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL no está definida')
    process.exit(1)
  }

  // Normalizar URL: si es relativa, resolverla desde prisma/
  let url = databaseUrl
  const match = databaseUrl.match(/^file:(.+)$/)
  if (match) {
    const filePath = match[1]
    if (!path.isAbsolute(filePath)) {
      url = `file:${path.resolve(process.cwd(), 'prisma', filePath)}`
    }
  }

  if (encryptionKey) {
    console.log('Modo: BD cifrada (DB_ENCRYPTION_KEY activa)')
  } else {
    console.log('Modo: BD sin cifrar (DB_ENCRYPTION_KEY no definida)')
  }

  const client = createClient({ url, encryptionKey })

  // Asegurar que la tabla de migraciones existe
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      id                    TEXT PRIMARY KEY NOT NULL,
      checksum              TEXT NOT NULL DEFAULT '',
      finished_at           DATETIME,
      migration_name        TEXT NOT NULL,
      logs                  TEXT,
      rolled_back_at        DATETIME,
      started_at            DATETIME NOT NULL DEFAULT current_timestamp,
      applied_steps_count   INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `)

  // Leer migraciones ya aplicadas
  const appliedResult = await client.execute(
    `SELECT migration_name, finished_at FROM "${MIGRATIONS_TABLE}" WHERE finished_at IS NOT NULL`
  )
  const applied = new Set(
    (appliedResult.rows as unknown as MigrationRecord[]).map(r => r.migration_name)
  )

  // Leer migraciones disponibles en el filesystem
  const migrationsDir = path.resolve(process.cwd(), 'prisma', 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    console.log('No existe el directorio prisma/migrations — nada que aplicar.')
    client.close()
    return
  }

  const migrationDirs = fs
    .readdirSync(migrationsDir)
    .filter(name => fs.statSync(path.join(migrationsDir, name)).isDirectory())
    .sort()

  const pending = migrationDirs.filter(name => !applied.has(name))

  if (pending.length === 0) {
    console.log('✅ No hay migraciones pendientes.')
    client.close()
    return
  }

  console.log(`Migraciones pendientes: ${pending.length}`)

  for (const migrationName of pending) {
    const sqlPath = path.join(migrationsDir, migrationName, 'migration.sql')
    if (!fs.existsSync(sqlPath)) {
      console.warn(`  ⚠️  Sin migration.sql en ${migrationName} — saltando`)
      continue
    }

    const sql = fs.readFileSync(sqlPath, 'utf8')
    const id = crypto.randomUUID()
    const startedAt = new Date().toISOString()

    console.log(`  Aplicando: ${migrationName}`)

    try {
      // Ejecutar cada sentencia SQL por separado
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      for (const stmt of statements) {
        await client.execute(stmt)
      }

      await client.execute({
        sql: `INSERT INTO "${MIGRATIONS_TABLE}" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
              VALUES (?, '', ?, ?, ?, ?)`,
        args: [id, new Date().toISOString(), migrationName, startedAt, statements.length],
      })

      console.log(`  ✅ ${migrationName}`)
    } catch (err) {
      console.error(`  ❌ Error aplicando ${migrationName}:`, err)
      client.close()
      process.exit(1)
    }
  }

  client.close()
  console.log('\n✅ Todas las migraciones aplicadas correctamente.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
