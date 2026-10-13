# ADR-0008: Proyecto experimental con CAD + Hew nativo + Render

**Fecha:** 2026-10-13  
**Estado:** Aceptado para *spike*; aún pendiente la certificación del flujo E2E completo.

## Contexto
El primer prototipo NEXO ya incorpora CAD 2D, visor Render, y un editor interactivo upstream Hew integrado como aplicación web local. Hasta ahora NEXO descargaba el CAD y un GLB para Render, **sin persistir la escena editable `.hew`**. Esto obligaba a guardar dos archivos, contradiciendo el requisito de un solo proyecto.

## Decisión
- Evolucionar la serialización temporal a **`schemaVersion:3`** compatible con migradores v1/v2.
- Agregar propiedad opcional `hew` con `format:'hew'`, `encoding:'base64'`, `version:1`, `data` y `generatedIds`.
- Obtener `Scene.save()` de Hew WASM en el navegador con transferencia binaria `postMessage` limitada al iframe/origen propio; cargar vía `applyLoadedBytesRef`, que respeta los mecanismos del editor upstream.
- Capturar Hew antes de descargar NEXO; fallar de forma visible ante errores de captura, para impedir pérdida silenciosa de cambios 3D.
- Al abrir, restaurar la escena Hew antes de cambiar el documento NEXO visible cuando el editor ya esté activo; si no está abierto, diferir restauración a su arranque.
- Mantener GLB como snapshot derivado solo para Render, separado del documento Hew editable.

## Consecuencias
Ventajas: un archivo completo y transportable, sin subir planos a la nube, reutilización de motor Hew, trazabilidad de los sólidos CAD, posibilidad de reabrir geometría editable.  
Costes: overhead base64, formato JSON no atómico, validación profunda delegada a Hew, sincronización de objetos CAD limitada, límite 70 MB y sin recuperación automática.

## Alternativas
- Guardar solo GLB: **descartada**, pierde modelo editable.
- Dos documentos separados .nexo3d.json y .hew: **descartada** para flujo básico de usuario.
- Empaquetar ZIP propio con checksum y backups: **diferido**, requiere pruebas extra y migración clara; candidato para formato final.
- Intentar convertir objetos Hew en entidades CAD 2D de manera implícita: **diferido** hasta tener reglas semánticas y prueba de reversibilidad.

## Validación requerida
Test unitario, compilación del editor React/WASM, prueba Chromium de crear→guardar→nuevo→abrir→guardar y revisión en Windows/Linux real. No promover a `main` ni reemplazar formato público hasta aprobar estas pruebas.
