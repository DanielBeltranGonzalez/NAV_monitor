import { cookies } from "next/headers"
import { verifyToken, COOKIE_NAME } from "@/lib/auth"
import { Building2, List, PlusCircle, BarChart3, UserCircle, DatabaseBackup, Users, ClipboardList } from "lucide-react"

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5 text-emerald-500 shrink-0" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed text-justify">
        {children}
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
      <span>{children}</span>
    </div>
  )
}

export default async function HelpPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null
  const isAdmin = payload?.role === 'ADMIN'
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ayuda</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          NAV Monitor te permite hacer seguimiento del valor liquidativo (NAV) de tus inversiones a lo largo del tiempo.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-sm text-emerald-800 dark:text-emerald-300">
        <p className="font-semibold mb-1">Flujo básico de uso</p>
        <div className="space-y-1.5">
          <Step n={1}>Crea los <strong>bancos</strong> o brokers donde tienes tus inversiones.</Step>
          <Step n={2}>Añade tus <strong>inversiones</strong> y asígnalas a un banco.</Step>
          <Step n={3}><strong>Registra el NAV</strong> de cada inversión periódicamente.</Step>
          <Step n={4}>Consulta el <strong>dashboard</strong> para ver la evolución de tu portfolio.</Step>
        </div>
      </div>

      <Section icon={Building2} title="Bancos">
        <p>Los bancos representan las entidades financieras o brokers donde tienes tus inversiones (por ejemplo, Selfbank, eToro, Degiro).</p>
        <p>Desde la sección <strong>Bancos</strong> puedes crear, editar y eliminar bancos. Un banco no puede eliminarse si tiene inversiones asociadas.</p>
        <p className="text-slate-500 dark:text-slate-500 italic">Nota: un "banco" no tiene por qué ser una institución financiera — es simplemente una agrupación de inversiones. Por ejemplo, puedes crear un banco llamado <strong className="not-italic text-slate-600 dark:text-slate-400">Patrimonio</strong> para registrar el valor de tu coche, tu vivienda u otros bienes, y hacer seguimiento de su evolución igual que con cualquier otro activo.</p>
      </Section>

      <Section icon={List} title="Inversiones">
        <p>Cada inversión representa un fondo, ETF, acción u otro activo que quieres monitorizar. Siempre pertenece a un banco.</p>
        <p>Al crear una inversión puedes añadir un <strong>comentario</strong> opcional que aparecerá como tooltip en el dashboard.</p>
        <p>La lista de inversiones muestra el último valor registrado y la fecha correspondiente.</p>
      </Section>

      <Section icon={PlusCircle} title="Registrar valor">
        <p>Aquí introduces el <strong>NAV actual</strong> de cada inversión. El formulario muestra el último valor registrado como referencia.</p>
        <p>Puedes actualizar varias inversiones a la vez. Si una inversión ya tiene un valor para esa fecha, se actualiza en lugar de crear uno nuevo.</p>
        <p>La fecha por defecto es hoy, pero puedes cambiarla para registrar valores históricos.</p>
        <p className="text-amber-600 dark:text-amber-400 font-medium">Una vez introducidos los valores, no olvides pulsar el botón <strong>Guardar</strong> al final de la página para que los cambios queden registrados.</p>
      </Section>

      <Section icon={BarChart3} title="Dashboard">
        <p>Vista principal del portfolio. Muestra para cada inversión:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong>NAV actual</strong> y su fecha de registro</li>
          <li><strong>vs Anterior</strong>: cambio respecto al valor previo registrado</li>
          <li><strong>vs Mes ant.</strong>: cambio respecto al último valor del mes anterior</li>
          <li><strong>vs Año ant.</strong>: cambio respecto al último valor del año anterior</li>
        </ul>
        <p>Las variaciones muestran importe en euros, porcentaje y tasa anualizada equivalente.</p>
        <p>Usa el <strong>selector de fecha</strong> para ver el estado del portfolio en cualquier fecha pasada.</p>
        <p>El botón <strong>Vista resumen</strong> oculta las filas individuales y muestra solo los subtotales por banco y el total del portfolio, junto con la gráfica de evolución.</p>
        <p className="text-amber-600 dark:text-amber-400">Si alguna inversión tiene su valor más reciente en una fecha diferente al resto, aparecerá un aviso en la parte superior.</p>
      </Section>

      <Section icon={UserCircle} title="Mi perfil">
        <p>Desde tu perfil puedes cambiar tu <strong>dirección de email</strong> y tu <strong>contraseña</strong>.</p>
        <p>La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.</p>
      </Section>

      {isAdmin && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Funciones de administración</p>
          <div className="space-y-4">
            <Section icon={Users} title="Usuarios (admin)">
              <p>Gestión de cuentas de usuario. Puedes crear usuarios, cambiar su rol (USER / ADMIN), resetear contraseñas y eliminar cuentas.</p>
              <p>Un administrador no puede eliminarse ni degradarse a sí mismo.</p>
            </Section>

            <Section icon={ClipboardList} title="Eventos (admin)">
              <p>Registro de actividad de la aplicación: inicios de sesión, cambios de contraseña, modificaciones de datos, etc.</p>
              <p>El número de eventos no leídos se muestra como badge en el menú lateral.</p>
            </Section>

            <Section icon={DatabaseBackup} title="Backups (admin)">
              <p><strong>Backup manual</strong>: descarga una copia de la base de datos en cualquier momento.</p>
              <p><strong>Restaurar</strong>: sube un fichero <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">.db</code> para reemplazar la base de datos actual. Esta acción es irreversible.</p>
              <p><strong>Backup automático</strong>: en Docker se realiza automáticamente cada noche a las 02:00 y se conservan los últimos días configurados en <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">BACKUP_KEEP_DAYS</code>.</p>
              <p><strong>Sincronización remota</strong>: los backups pueden sincronizarse automáticamente con un servidor externo via rsync/SSH. Requiere generar una clave SSH desde la propia app y añadirla al servidor destino.</p>
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}
