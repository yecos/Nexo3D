# ADR-0005: Estrategia reuse-first y modernización selectiva

**Estado:** PROPUESTO, pendiente de PoC/decisión de mantenimiento  
**Fecha:** 2026-10-13  
**Relación:** [auditoría open source](../AUDIT_OPEN_SOURCE.md), [PoC](../REUSE_POC.md), ADR-0001/2/3/4.

## Contexto
NEXO 3D quiere unir CAD tipo AutoCAD → Modelado tipo SketchUp → Render tipo D5, con una sola app pública AGPL, offline y multiplataforma, preparada para browser. Las ramas de prototipo actuales reimplementan sólo líneas y muros básicos: escalar ese prototipo a CAD profesional desde cero es alto riesgo.

## Decisión provisional
**Investigar una base derivada de Hew** como núcleo Rust/WASM y UI React/TS/Tauri, antes de programar nuevas herramientas geométricas en JavaScript. Conservar y extender el sistema existente de Sketch/Draft e inferencias para workspace CAD. Adoptar una interfaz de adapters de formatos y de render final. Usar Blender como ejecutable externo y evaluar libdxfrw por separado para DXF/DWG. Usar documentación/código de IngeTrazo y QCAD de forma selectiva, respetando sus licencias; nunca hacer traducciones masivas sin pruebas de costo.

No se ha tomado decisión irreversible de fusionar el código de Hew ni de adoptar `.hew` como formato final de NEXO. Este ADR debe pasar a **ACEPTADO** sólo cuando la PoC pruebe operaciones, licencia, rendimiento básico, escritorio y web.

## Por qué
- Reduce reimplementación de kernel, booleans, snaps, undo, importadores y multiplataforma.
- Favorece compatibilidad de lenguaje con navegador sin traducir todo.
- Permite mantener Blender/Cycles sin reproducir el motor propietario de D5.
- Reduce el número de puentes Qt ↔ DOM y la duplicación de fuentes de verdad.

## Costos y riesgos
- Dependencia de fork y actualizaciones upstream Hew.
- Añadir CAD profesional puede requerir evolución seria del modelo de croquis, dimensiones, layers y semántica de muros.
- GPLv3 ↔ AGPLv3 permite combinaciones bajo condiciones; LibreCAD GPLv2-only no puede incorporarse sin licencia adecuada.
- Web y escritorio pueden usar motores de render diferentes; fidelidad no idéntica automáticamente.
- La experiencia de UI heredada Hew requiere adaptaciones, y hay riesgo de divergencia del proyecto original.

## Alternativas
1. Mantener NEXO Vite/SVG/Three.js como producto final: simple al principio, pero reescribir kernel potente sería caro.
2. Portar IngeTrazo completo a Rust/WASM: carga de traducción PySide6/Qt muy alta.
3. Empotrar QCAD/LibreCAD y Blender como tres aplicaciones en ventanas: no hay fuente de verdad única ni web real.
4. Crear motor gráfico propio Falcor: investigación futura, no primera versión.

## Criterio de ratificación
Documentar PoC con test de dibujo de perfil 2D → extrusión de sólido → guardado/reapertura y transición a Render, más build desktop/web y revisión de licencias y rutas de integración. Registrar fixtures, métricas y bloqueos. Si falla la PoC, volver al ADR sin forzar la selección.
