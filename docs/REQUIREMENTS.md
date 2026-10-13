# Especificación de requisitos — NEXO 3D

**Convención:** P0=indispensable para MVP; P1=primera expansión; P2=posterior. **Estado inicial: PROPUESTO** salvo principios decididos. Cada ID debe mapearse a test y evidencia antes de marcarse como implementado.

## Requisitos funcionales
| ID | Prioridad | Requisito | Aceptación verificable |
| --- | --- | --- | --- |
| FR-001 | P0 | Importar GLB | Escena de prueba con varios nodos y mallas aparece en jerarquía y visor |
| FR-002 | P0 | Modelo de escena compartido | Mismo ID estable y transformación visible en Modelado y Render |
| FR-003 | P0 | Herramientas transformar | Trasladar, rotar y escalar con undo/redo sin corrupción |
| FR-004 | P0 | Material PBR básico | Parámetros baseColor/metallic/roughness se almacenan y reaplican |
| FR-005 | P0 | Iluminación de escena | Crear luz o asignar entorno e inspeccionar cambio en viewport |
| FR-006 | P0 | Persistencia local | Guardar, cerrar, reabrir offline, conservar transformaciones/material/luz |
| FR-007 | P0 | Cambio de workspace | Pasar Modelado↔Render sin reimportación ni pérdida de selección |
| FR-008 | P0 | Diagnóstico de errores | Si falla importación/guardado, informar causa sin perder el documento en edición |
| FR-009 | P1 | CAD 2D con unidades | Dibujar línea, polilínea, arco y cota con snap configurable |
| FR-010 | P1 | Geometría arquitectónica | Muros/puertas como objetos semánticos bajo contrato documentado |
| FR-011 | P1 | Reutilizar componentes | Instancias referencian asset, conservan transformaciones y metadatos |
| FR-012 | P1 | Render de imagen local | Exportar PNG desde una escena de prueba sin depender de nube |
| FR-013 | P1 | Recuperación | Un fallo controlado permite restaurar último autosave íntegro |
| FR-014 | P1 | Exportación GLB | Verificar transformaciones y texturas en visor externo |
| FR-015 | P2 | Imagen→3D | Entrada legítima; salida GLB revisable, escala editable y procedencia registrada |
| FR-016 | P2 | Sincronización opcional | Edición offline continúa aun si servicio remoto falla; conflictos explícitos |
| FR-017 | P2 | DXF/IFC/SKP | Soporte incremental declarado por versión y test de ida/vuelta donde aplique |
| FR-018 | P2 | Web | Abrir proyecto en navegador compatible respetando restricciones de filesystem/GPU |

## Requisitos no funcionales
| ID | Requisito | Validación |
| --- | --- | --- |
| NFR-001 | **Offline-first** en escritorio | Desactivar red y completar flujo P0 |
| NFR-002 | **Multiplataforma** | Compilación y smoke tests en Linux y Windows MVP; macOS antes de declarar soporte |
| NFR-003 | **Portabilidad web** | UI desacoplada de APIs nativas; adapter de archivos/render seleccionable |
| NFR-004 | **Integridad y recuperación** | Escritura atómica, backups, test de caída durante guardado |
| NFR-005 | **Seguridad** | Validar rutas, archivos, procesos y límites de importación; no ejecutar contenido arbitrario |
| NFR-006 | **Privacidad** | IA/nube opt-in, mostrar qué archivos se envían; evitar telemetría obligatoria |
| NFR-007 | **Licencias** | Inventario de terceros, notices y AGPL accesible en fuente y distribución |
| NFR-008 | **Accesibilidad** | Navegación básica teclado, foco visible, textos contrastados |
| NFR-009 | **Rendimiento** | Benchmark repetible con hardware y tamaño de escena documentados |
| NFR-010 | **Migraciones** | Cada cambio de schema incluye lectura retrocompatible o migración comprobada |

## Escenarios base (Given / When / Then)
**AC-MVP-01 — modelo sincronizado**
- Dado un GLB con objeto `sofa-01`, cuando muevo el objeto en Modelado y cambio a Render, entonces Render representa su nueva transformación y el ID interno sigue siendo el mismo.

**AC-MVP-02 — persistencia offline**
- Dado un proyecto con material PBR y luz, cuando desconecto la red, guardo, cierro y reabro, entonces recupero la misma jerarquía, parámetros y cámara.

**AC-MVP-03 — error controlado**
- Dado un GLB corrupto, cuando intento importarlo, entonces recibo error estructurado y el proyecto abierto permanece intacto.

**AC-MVP-04 — licencia y terceros**
- Dada una distribución, cuando reviso `LICENSE` y `THIRD_PARTY_NOTICES` (cuando existan dependencias redistribuidas), entonces puedo identificar licencia y atribuciones correspondientes.

**AC-CAD-01 — precisión (P1)**
- Dado un plano en milímetros, cuando dibujo una línea de 2500 mm, entonces las propiedades conservan precisión conforme a tolerancias definidas y las vistas comparten la escala.

## Definition of Done para cualquier requisito
- Código en PR + referencia ID + test automático o procedimiento manual repetible.
- Captura/log/archivo de ejemplo para reproducir.
- Verificación de guardado y compatibilidad de archivo si cambia estado.
- Revisar licencia, privacidad, accesibilidad y documentación correspondiente.
- La aceptación la decide quien revisa el PR con evidencia, nunca únicamente una captura estética.

## Gestión de cambios
Las adiciones importantes requieren issue, impacto en modelo/sync/render, nueva aceptación y ADR si alteran arquitectura. Los requisitos no son garantías de producto hasta que estén implementados y versionados.
