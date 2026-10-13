# ADR-0005: política de reutilización y selección de base pendiente

**Fecha:** 2026-10-13  
**Estado:** Reutilización primero **ACEPTADA**; elección final de motor **PENDIENTE de PoC**.

## Contexto
NEXO debe unificar **CAD 2D tipo AutoCAD → modelado 3D tipo SketchUp → render tipo D5**, funcionar sin internet, distribuirse bajo AGPL-3.0-only en Windows/Linux/macOS y mantener futuro navegador. Los prototipos PR #1 y #2 implementaron herramientas iniciales propias para demostrar sincronización, pero no se pretende reescribir CAD, kernels geométricos o motores de render preexistentes.

## Decisión aceptada
1. **Reutilización preferente:** evaluar y reaprovechar bibliotecas y aplicaciones libres existentes antes de escribir implementaciones completas.
2. **Dos rutas comparadas:** Hew (prioridad web/escritorio) e IngeCAD+IngeTrazo (alternativa escritorio/flujo técnico). Blender como render final mediante adaptador externo.
3. **Compatibilidad de licencia como restricción dura:** no fusionar LibreCAD GPLv2-only directamente con el trabajo AGPLv3 sin autorización/relicenciamiento.
4. **PR #1 y PR #2 conservan su valor como spikes**, pero no se integran al producto final solo por haber compilado. Ningún fork sustituirá NEXO main sin pruebas, plan migratorio y nuevo ADR.
5. **No se aprueba aún** Hew, Inge, QCAD, FreeCAD ni un motor gráfico como stack definitivo.

## Motivos
- Minimiza recreación innecesaria y deuda técnica.
- El mismo código UI/geometría desktop-web importa tanto como las herramientas.
- El CAD propietario tipo DWG, los formatos SKP y la paridad D5 exigen pruebas, no promesas.
- Licencias copyleft y activos son restricciones de arquitectura, no cuestiones al final.

## Consecuencias
Antes de modificar más el editor de prueba: completar P-A1..P-A5 y P-B1..P-B2 cuando corresponda, documentar resultados, cuantificar fricción de integración y luego publicar ADR-0007 con decisión final y estrategia de migración. La integración debe preservar una fuente canónica de verdad y archivos locales. Ver [auditoría](../audits/2026-10-13-oss-reuse-audit.md).

## Alternativas descartadas por ahora
- Construir AutoCAD/SketchUp/D5 completos en JS o Rust desde cero.
- Unir tres aplicaciones independientes por exportaciones manuales.
- Integrar fuentes GPLv2-only de LibreCAD como si fueran automáticamente compatibles con AGPLv3.
- Decidir exclusivamente por similitud estética de UI o número de funciones del README.
