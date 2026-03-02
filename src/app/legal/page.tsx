export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Aviso Legal y Política de Privacidad</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-700">1. Información general</h2>
        <p className="text-sm text-slate-600">
          NAV Monitor es una aplicación de uso personal para el seguimiento del valor liquidativo (NAV)
          de inversiones. No constituye asesoramiento financiero, fiscal ni de inversión. El titular
          no se hace responsable de las decisiones de inversión tomadas en base a los datos registrados
          en la aplicación.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-700">2. Datos personales</h2>
        <p className="text-sm text-slate-600">
          La aplicación almacena únicamente los datos que el usuario introduce de forma voluntaria:
          dirección de correo electrónico (usada como identificador de cuenta) y los datos financieros
          registrados por el propio usuario.
        </p>
        <p className="text-sm text-slate-600">
          No se comparte ningún dato con terceros. No se utilizan servicios de análisis externos
          ni cookies de seguimiento.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-700">3. Seguridad</h2>
        <p className="text-sm text-slate-600">
          Las contraseñas se almacenan cifradas mediante bcrypt (factor de coste 12). Las sesiones
          se gestionan mediante tokens JWT con expiración de 24 horas, almacenados en una cookie
          httpOnly con atributo SameSite=Strict.
        </p>
        <p className="text-sm text-slate-600">
          La cuenta queda bloqueada temporalmente (15 minutos) tras 5 intentos de inicio de sesión
          fallidos consecutivos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-700">4. Derechos del usuario</h2>
        <p className="text-sm text-slate-600">
          El usuario puede exportar todos sus datos financieros en formato CSV desde la sección
          de inversiones. También puede eliminar su cuenta y todos los datos asociados en cualquier
          momento desde la configuración de su perfil. Tras la eliminación, los datos no son
          recuperables.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-700">5. Exención de responsabilidad</h2>
        <p className="text-sm text-slate-600">
          Los datos mostrados en la aplicación son introducidos manualmente por el usuario y pueden
          contener errores. El titular de la aplicación no garantiza la exactitud, integridad ni
          actualización de la información. El uso de la aplicación es bajo la exclusiva responsabilidad
          del usuario.
        </p>
      </section>

      <p className="text-xs text-slate-400 pt-4 border-t border-slate-200">
        Última actualización: marzo 2026
      </p>
    </div>
  )
}
