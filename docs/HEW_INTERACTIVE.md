# Espacio Modelado Hew interactivo — fase experimental

**Rama:** `feat/hew-interactive-workspace`, PR #8. **No se ha fusionado a `main`.** Este es el primer puente entre nuestro CAD web y el **editor interactivo real** de Hew. Continúa siendo una integración de dos runtimes web (iframe same-origin) con comunicación limitada, no un nuevo CAD profesional integrado completamente.

## Flujo disponible

1. Dibujar CAD 2D en NEXO (línea/polilínea/rectángulo), asignar altura y espesor con **Levantar / actualizar muro**.
2. Cambiar a **Modelado 3D**. NEXO carga una compilación local de [Hew](https://github.com/hew3d/hew), incluyendo el kernel **Rust → WebAssembly** y la UI **React + Three.js**.
3. Pulsar **Levantar CAD en Hew**. Se envían operaciones `hew.doc.transact` a la escena **viva de Hew**. El editor muestra sólidos nativos; usa Push/Pull, Move, Scale, componentes, etc. de Hew directamente.
4. Pulsar **Actualizar Render**. Hew convierte los sólidos actuales a GLB; NEXO recibe los bytes directamente en el navegador y los guarda como snapshot del espacio Render.
5. Regresar a Render. El visor NEXO contiene los materiales y luces básicos existentes. Los retoques del modelo desde Hew aparecen tras actualizar.
6. En la rama sucesora `feat/unified-nexo-hew-project`, **Guardar** captura el documento nativo Hew junto con CAD y Render en **un solo archivo**. Ver [proyecto unificado](HEW_UNIFIED_PROJECT.md). En esta rama anterior se requería guardar Hew por separado.

### Limitaciones deliberadas

- El envío **CAD → Hew** es explícito, no automático. Reenviar CAD reemplaza los muros previamente generados por el puente y puede descartar modificaciones directas de esos muros; solicita confirmación.
- La edición en Hew **no modifica el CAD NEXO**. La sincronización bidireccional de muros, cotas y encuentros sigue pendiente.
- El editor Hew se genera en `public/hew/` y no viene incorporado al repositorio. **Nada externo se carga durante el uso normal**; la primera compilación requiere descargar dependencias.
- El snapshot GLB conserva geometría para render, **no** el historial de construcción, restricciones o todas las propiedades de Hew.
- El render de NEXO sigue siendo visor PBR básico. La prueba Cycles de PR #7 funciona en CLI, no está conectada como botón al navegador todavía.
- No hay DWG/DXF, BIM, UI avanzada de CAD, instalador nativo ni equivalencia D5. Ninguno de estos está probado por este PR.
- Modelo Hew podría conservar nombre/branding upstream en pantalla durante esta fase. Respetar marca y atribución.

## Linux: preparación local

Requiere Git, Node.js 22+, Rust **1.97.1**, target `wasm32-unknown-unknown`, `wasm-pack 0.15.0`, corepack/pnpm según versión de `packageManager` en upstream.

```bash
git clone https://github.com/yecos/Nexo3D.git
cd Nexo3D
git fetch origin
git switch feat/hew-interactive-workspace

npm install
npm test
# Instalar Rust/wasm-pack según las instrucciones oficiales de Hew si faltan:
rustup toolchain install 1.97.1 --target wasm32-unknown-unknown
# Después de clonar Hew, su script instala wasm-pack exactamente 0.15.0.
git clone https://github.com/hew3d/hew.git upstream-hew
git -C upstream-hew checkout f36661fb726253e501ef26a4d5fff3cc6381d814
bash upstream-hew/scripts/install-wasm-pack.sh

corepack enable
npm run hew:setup
npm run dev
```

Abrir la dirección local de Vite, generalmente `http://127.0.0.1:5173`. El paquete `public/hew/` es generado y está **gitignored**. No ejecutar `file://`: la carga WASM y recursos requieren servidor local o empaquetado.

En Windows también puede compilarse Hew upstream con Rust/wasm-pack y Node adecuados, pero **esta integración web completa requiere CI / verificación manual específica en Windows**; el PR #7 solo verificó su CLI en Windows.

## Implementación y seguridad

- `scripts/setup-hew-web.mjs` obtiene **SHA exacto** y verifica que no se sobrescriba un checkout con cambios distintos.
- `scripts/patch-hew-web.mjs` aplica cambios reproducibles, mínimos y localizados en `App.tsx` y en la base Vite; **no copia upstream al control de versiones de NEXO**.
- El puente escucha solamente mensajes de **`window.parent` del mismo origen**; no es un servidor de API externo, no hay conexión a cuentas/nube y no acepta comandos arbitrarios.
- Mensajes permitidos para API viva: transacción Hew, query de escena y estado de historial. Los bytes GLB salen del `ViewportApi.exportGlb()` existente de Hew.
- Cada llamada valida identidad de iframe y tiene timeout, y los reinicios de iframe invalidan la selección de IDs.
- Cada envío CAD es una transacción undoable según la API de Hew, sin añadir mallas previamente trianguladas.
- No mover assets de clientes a repositorios públicos; usar fixtures propios o libres.

## Entregables CI

`.github/workflows/hew-interactive.yml` compila Hew React/WASM, ejecuta tests NEXO y adjunta el directorio **`dist/`** que contiene NEXO y el espacio Hew. No equivale a un instalador Windows/macOS ni prueba interacción de usuario en pantalla.

## Pruebas de aceptación manual necesarias

- [ ] La UI Hew aparece dentro de Modelado sin error de WASM ni recursión de iframe.
- [ ] Levantar habitación 4 × 3 m y confirmar cuatro muros; orbitar y editar con Push/Pull.
- [ ] Volver al CAD y cambiar la longitud de un segmento, reenviarlo con confirmación.
- [ ] Pulsar **Actualizar Render**; debe reemplazarse el snapshot GLB sin duplicados.
- [ ] Guardar NEXO y verificar CAD + snapshot; guardar `.hew` por separado.
- [ ] Verificar que se conserva el resto de escena Hew ajena al CAD si se regeneran los muros.
- [ ] Probar Linux/Windows en GPU real, sin red tras instalación.

**Siguiente hito:** validar el proyecto unificado v3 en Chromium y después avanzar a edición CAD↔Hew bidireccional, shell React/Tauri común y render Cycles integrado. Ver [HEW_UNIFIED_PROJECT.md](HEW_UNIFIED_PROJECT.md).
