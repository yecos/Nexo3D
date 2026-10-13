# Gobierno y mantenimiento de NEXO 3D

**Estado:** proyecto abierto en etapa temprana; estas reglas son política inicial, ajustable por la comunidad con ADR y PR.

## Roles (propuestos)
- **Contribuyente:** aporta issues, documentación, tests, diseño o código.
- **Revisor:** valida requisitos, evidencia, seguridad y licencia.
- **Mantenedor:** aprueba arquitectura, publica versiones y administra permisos del repo.

En esta etapa no hay comité formal, socios comerciales ni calendario de releases.

## Propuesta y decisiones
1. Ideas pequeñas: issue con necesidad y aceptación.
2. Cambios de arquitectura/licencia/archivo: issue + ADR con alternativas y riesgo.
3. Evaluación mediante PoC y matriz; decidir por evidencia y compatibilidad.
4. Discusiones abiertas y respetuosas; evitamos dependencias ocultas de proveedores.
5. Las decisiones aceptadas pueden revisarse: generar ADR nuevo, no borrar historia.

## Política de PR
- PRs acotados con test/evidencia; CI cuando exista.
- Dos revisiones sugeridas para storage, seguridad, licencias, geometría central.
- Revisores deben declarar limitaciones/no ejecución; no declarar PASS por intuición.
- Dependencias nuevas requieren inventario y evaluación.

## Versiones
Adoptar SemVer cuando aparezca primer paquete instalable. Mientras tanto, hito documental 0.x no significa versión del software. Changelog y notas de release deben distinguir probado/experimental/plataformas verificadas.

## Comunidad y conductas
Reglas de [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md), vulnerabilidades en [SECURITY](../SECURITY.md). Las personas pueden usar y bifurcar el programa según AGPL, sin pedir permiso adicional; el repositorio puede exigir control de calidad a aportes entrantes.

## Sostenibilidad
No atar funciones locales esenciales a cuentas, pagos o servicios en nube. Patrocinios o servicios comerciales compatibles con AGPL pueden existir en el futuro, pero no cambian las libertades de la licencia. Evitar promesas de soporte 24/7.
