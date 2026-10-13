# Proyecto NEXO único: CAD + documento Hew editable + Render

**Estado:** implementación en `feat/unified-nexo-hew-project` (PR dependiente del PR #8). **Formato experimental v3**, no formato definitivo de producción. Hay tests de dominio, del puente Hew y de navegador en CI; consultar su estado más reciente antes de declararlos todos aprobados.

## Resultado esperado
Un solo archivo descargado por NEXO, actualmente **`nexo3d-proyecto.nexo3d.json`**, contiene:
- Dibujos CAD métricos, capas, trazos, elevaciones de paredes y sus IDs.
- Archivo nativo `.hew` editable **dentro del JSON** como base64 (ZIP de Hew). No es una malla GLB plana.
- Correspondencia `cadShapeId` ↔ `hewObjectId` de las paredes levantadas mediante puente Hew.
- Activos GLB de Render y propiedades de iluminación/materiales de la versión experimental.
- Identidad del proyecto y versión `schemaVersion:3`.

Es **un único archivo autocontenido** que se puede copiar o guardar sin una cuenta externa. Esta fase usa base64, no compresión adicional NEXO; el tamaño puede crecer alrededor de un tercio respecto al documento Hew binario, además de los GLB. Es un formato temporal para probar ida/vuelta; en el futuro se evaluará contenedor ZIP con checksums, deduplicación y escrituras atómicas.

## Cómo probarlo

1. Preparar el editor interactivo de Hew según [HEW_INTERACTIVE](HEW_INTERACTIVE.md); usar rama `feat/unified-nexo-hew-project`.
2. Crear o abrir plano CAD. Una prueba disponible: `examples/room-4x3.nexo3d.json`.
3. En CAD: seleccionar el rectángulo y verificar muros de altura **2.60 m** y espesor **0.15 m**.
4. En **Modelado 3D** pulsar **Levantar CAD en Hew**; visualizar paredes y utilizar las herramientas de Hew (ej. Push/Pull) sobre un sólido.
5. Opcional, pulsar **Actualizar Render** para registrar un GLB de la geometría Hew actual. **No** sustituye documento nativo.
6. Pulsar **Guardar** en la barra superior NEXO: NEXO solicita a la escena WASM el archivo nativo `.hew`, lo valida, lo coloca dentro del mismo JSON con el CAD y Render, y descarga una única copia.
7. Pulsar **Nuevo** (tras guardar) para limpiar tanto NEXO como Hew. Luego **Abrir**, seleccionar el archivo descargado. NEXO carga el plano CAD y **restaura los bytes nativos en el propio Hew**; no necesita rehacer el modelado desde GLB.
8. Editar en Hew y guardar otra vez. Al reabrir deben mantenerse muros y objetos editables.

### Compatibilidad
- Esquema **v1 → v2 → v3**: los archivos antiguos que no contenían Hew se abren con el modelador en blanco; se conservan los nodos Render y los trazos CAD disponibles.
- El formato `hew` se incorpora solo cuando Hew ha podido abrirse y responder. Si Hew está desconectado y el archivo ya contenía bytes `.hew` anteriores, **se preservan**.
- Si Hew está activo pero la captura del modelo falla, el guardado del proyecto **se cancela** y se muestra el error. No se produce una copia aparentemente correcta pero sin la geometría editada.
- Límite por prototipo: archivo total **70 MB**, documento Hew comprimido interno **30 MB**, GLB individual **30 MB**. El guardado rechaza archivos que excedan el límite, sin descargarlos truncados.

### Semántica y límites de esta versión
- La fuente del plano CAD sigue siendo la sección `cad` y la geometría editable de Hew es la sección `hew`; son documentos almacenados juntos, **pero aún no una geometría semántica bidireccional**.
- El envío de CAD hacia Hew es **explícito**; regenerar un muro enviado puede reemplazar modificaciones directas a ese muro (confirmación visible). Los identificadores se guardan para localizarlo después de reabrir.
- El botón **Actualizar Render** también es explícito: el último GLB enviado se conserva en el archivo, pero puede no reflejar las últimas modificaciones de Hew si no se actualiza.
- Una ZIP `.hew` con cabecera válida pasa la validación básica del contenedor NEXO; **la validez interna del modelo se comprueba cargándola realmente en el kernel Hew**.
- No hay todavía autosave, backup atómico, DWG nativo, editor Tauri empaquetado, edición de cotas asociativas ni calidad de render D5.
- **No sobrescribir** copias de clientes sin backup: esta fase genera descargas nuevas y depende de que el usuario conserve el archivo descargado.

### Pruebas
- `src/domain.test.js`: ida/vuelta JSON v3 con Hew+CAD+GLB, límites y migraciones.
- `src/hew-workspace.test.js`: guarda/restaura buffer Hew, conserva IDs, reinicia escena vacía, retrasa carga cuando el iframe aún inicia.
- `tests/e2e/unified-project.mjs`: Chromium real abre plano, genera cuatro muros en Hew, envía GLB al Render, descarga un solo proyecto, hace Nuevo, reabre y guarda de nuevo.
- CI: [Integrated Hew interactive modeler](https://github.com/yecos/Nexo3D/actions/workflows/hew-interactive.yml), con upstream Hew fijado en commit `f36661fb726253e501ef26a4d5fff3cc6381d814`.

**Siguiente etapa:** asociación CAD↔Hew bidireccional (actualizar cotas/puertas/ventanas y restricciones sin perder ediciones manuales), persistencia segura con ZIP/backup, auditoría de integridad de assets y render Cycles en UI.
