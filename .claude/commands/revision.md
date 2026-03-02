---
name: "Revision"
description: "Realiza revisión completa de código: bugs, seguridad, performance, estilo y mejores prácticas. Úsalo para PRs o funciones nuevas."
---

# Code Reviewer Exhaustivo

## Cuándo usarlo
- Revisión de PRs antes de merge.
- Análisis de funciones nuevas o refactorizadas.
- Auditoría de seguridad en código crítico.

## Proceso paso a paso
1. **Análisis estático**: Identifica bugs obvios, null/undefined, edge cases.
2. **Seguridad**: Busca inyecciones SQL, XSS, secrets hardcoded, dependencias vulnerables.
3. **Performance**: Detecta O(n²), leaks, queries ineficientes.
4. **Estilo y calidad**: PEP8 (Python), ESLint (JS), type hints, docstrings.
5. **Arquitectura**: SOLID, separación de concerns, testabilidad.
6. **Salida**: Tabla con severity (CRITICAL/HIGH/MEDIUM/LOW), fix sugerido.
7. **Version**: Comprueba que se ha seguido el versionado de la app y que está reflejado correctamente en esta.

## Checklist obligatoria
- [ ] Bugs potenciales
- [ ] Vulnerabilidades OWASP Top 10
- [ ] Optimizaciones performance (>20% impacto)
- [ ] Cumple estándares proyecto (Next.js, Docker si aplica)

## Formato de salida
| Línea | Issue | Severity | Fix sugerido |
|-------|-------|----------|-------------|
| 23    | SQL injection | CRITICAL | Usa parámetros preparados |

Ejemplo input/output en examples.md.
