/**
 * db-to-encrypted.ts
 *
 * Copia todos los datos de una BD SQLite sin cifrar a una nueva BD cifrada con AES-256.
 *
 * Uso:
 *   DB_ENCRYPTION_KEY=<hex-32-bytes> npx tsx scripts/db-to-encrypted.ts <source.db> <dest.db>
 *
 * Ejemplo:
 *   DB_ENCRYPTION_KEY=$(openssl rand -hex 32) npx tsx scripts/db-to-encrypted.ts \
 *     prisma/dev.db prisma/dev.encrypted.db
 *
 * Después de ejecutar, renombra los archivos manualmente:
 *   mv prisma/dev.db prisma/dev.db.bak
 *   mv prisma/dev.encrypted.db prisma/dev.db
 */

import { createClient } from '@libsql/client'
import path from 'path'
import fs from 'fs'

async function main() {
  const [, , sourceArg, destArg] = process.argv

  if (!sourceArg || !destArg) {
    console.error('Uso: DB_ENCRYPTION_KEY=xxx npx tsx scripts/db-to-encrypted.ts <source.db> <dest.db>')
    process.exit(1)
  }

  const encryptionKey = process.env.DB_ENCRYPTION_KEY
  if (!encryptionKey) {
    console.error('Error: DB_ENCRYPTION_KEY no está definida')
    process.exit(1)
  }

  const sourcePath = path.isAbsolute(sourceArg) ? sourceArg : path.resolve(process.cwd(), sourceArg)
  const destPath = path.isAbsolute(destArg) ? destArg : path.resolve(process.cwd(), destArg)

  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: no existe el archivo fuente: ${sourcePath}`)
    process.exit(1)
  }

  if (fs.existsSync(destPath)) {
    console.error(`Error: el archivo destino ya existe: ${destPath}`)
    console.error('Elimínalo primero si quieres sobrescribirlo.')
    process.exit(1)
  }

  console.log(`Fuente:  ${sourcePath}`)
  console.log(`Destino: ${destPath}`)
  console.log('Abriendo BD de origen (sin cifrar)...')

  const src = createClient({ url: `file:${sourcePath}` })
  const dst = createClient({ url: `file:${destPath}`, encryptionKey })

  // Obtener DDL de tablas e índices (excluye tablas internas sqlite_*)
  const masterRows = await src.execute(
    "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rootpage"
  )

  const tables: string[] = []

  console.log('Creando estructura en BD destino...')
  for (const row of masterRows.rows) {
    const { type, name, sql } = row as { type: string; name: string; sql: string }
    await dst.execute(sql)
    if (type === 'table') {
      tables.push(name)
    }
  }

  console.log(`Copiando datos de ${tables.length} tabla(s)...`)
  for (const table of tables) {
    const rows = await src.execute(`SELECT * FROM "${table}"`)
    if (rows.rows.length === 0) {
      console.log(`  ${table}: 0 filas`)
      continue
    }

    const columns = rows.columns
    const placeholders = columns.map(() => '?').join(', ')
    const colNames = columns.map(c => `"${c}"`).join(', ')
    const insertSql = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`

    for (const row of rows.rows) {
      const values = columns.map(col => row[col] ?? null)
      await dst.execute({ sql: insertSql, args: values as never[] })
    }

    console.log(`  ${table}: ${rows.rows.length} filas copiadas`)
  }

  src.close()
  dst.close()

  console.log('\n✅ Conversión completada.')
  console.log('\nPasos siguientes:')
  console.log(`  1. Verifica que la app funciona con la BD cifrada:`)
  console.log(`       mv ${sourcePath} ${sourcePath}.bak`)
  console.log(`       mv ${destPath} ${sourcePath}`)
  console.log(`       # Añade DB_ENCRYPTION_KEY a .env`)
  console.log(`  2. Si todo va bien, elimina el backup: rm ${sourcePath}.bak`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
