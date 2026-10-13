# ADR-0007 — Introducir Hew como base experimental de geometría

**Fecha:** 2026-10-13  
**Estado:** aceptado para *spike*; no aprobación de migración definitiva.

## Contexto
La primera versión NEXO CAD dibuja en SVG, y el prototipo 3D dibuja cajas con Three.js. El usuario exige que NEXO **reutilice motores y herramientas libres**, no que replique toda la geometría CAD/modelado/render de aplicaciones existentes. La auditoría independiente (PR #4) y las pruebas Hew en Windows/Linux y Blender (PR #5) muestran que Hew expone una API CLI adecuada.

## Decisión
- Mantener NEXO CAD 2D como interfaz experimental y fuente de entidades.
- Añadir un adaptador que genere **comandos nativos Hew**. Hew, como proceso externo fijado por SHA, calcula sólidos y produce documento `.hew`.
- Dejar a Blender como proceso separado de render. Intercambio temporal mediante GLB.
- Mantener las pruebas y documentos existentes; no copiar Hew al repo ni sustituir `main` de forma prematura.
- Solo aprobar un fork/integración WASM/Tauri tras pruebas UI y esquema semántico bidireccional.

## Consecuencias
**A favor:** reduce el código geométrico propio; aprovecha exportación GLB/SKP e infraestructura de Hew; arquitectura verificable y atribuible.  
**Limitaciones:** la CLI es actualmente un puente **por lotes**; no hay enlace de ida y vuelta ni experiencia integrada tipo SketchUp/D5. El guardado `.nexo3d.json` y `.hew` pueden divergir tras ediciones en Hew.  
**Riesgos:** contrato JSON-RPC upstream, límites para escenas grandes, normales/rotación de ejes, precisión CAD, licencias copyleft en binarios, acople de herramientas semánticas.

## Aceptación del spike
- Tests Node de transformaciones, validación CAD y archivo persistido.
- Hew CLI real construyendo habitación CAD derivada; se inspeccionan IDs, fuentes y modelos generados.
- Blender convierte escena GLB a PNG en CI Linux; Hew CLI se prueba en Linux/Windows.
- No afirmar compatibilidad macOS, web, DWG ni resultados fotorrealistas comerciales.
- [Manual y pruebas](../HEW_FOUNDATION.md).

## Alternativas
- Escribir todas las operaciones CAD/modelado desde cero (descartada).
- Pegar tres aplicaciones independientes y exportar manualmente (descartada).
- Adaptar IngeCAD + IngeTrazo en Qt/Python (continúa como alternativa para un CAD de escritorio; dificultad web por evaluar).
