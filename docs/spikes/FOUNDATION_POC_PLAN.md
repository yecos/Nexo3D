# Plan de pruebas de bases open source (sin construir otro CAD)

**Estado:** plan reproducible para la siguiente sesión. No hay resultados ejecutados ni aprobaciones de stack.

## P-A: Hew (prioridad)
**Repositorio:** https://github.com/hew3d/hew · **punto de referencia** `f36661fb726253e501ef26a4d5fff3cc6381d814`.

### A1 — Compilación de upstream sin modificar
Desde checkout aislado, instalar versiones del README: Rust (archivo rust-toolchain), wasm-pack, pnpm/Node y prerrequisitos de Tauri. Ejecutar `scripts/verify.sh`, `pnpm --dir app dev`, y `pnpm --dir shells/tauri dev` en Linux; repetir smoke en Windows; probar `app.hew3d.com` o build web en navegador. Guardar logs y versiones exactas. **No ejecutar scripts remotos como root ni mezclar repositorio experimental con main.**

### A2 — Documento editable y API
- Crear perfil 4×3 m con coordenadas/medidas exactas.
- Extruir un muro/volumen 2.60 m mediante herramienta/API `hew-cli`.
- Cambiar perfil/altura y comprobar que no se pierde identidad.
- Guardar `.hew`, cerrar y reabrir offline.
- API: inspeccionar el alcance real de comandos para planeamiento CAD, sin asumir plugin API implementada.

### A3 — Formatos
- SKP 2017 y SKP 2026, con archivos propios autorizados. Ver objetos/componentes/texturas y cambio de unidades.
- Exportar SKP y GLB y abrirlos en otro visor. Registrar limitaciones por versión.
- No inferir compatibilidad SKP 2018–2025 de un único ejemplo.

### A4 — CAD 2D
Probar primero `Sketch` + SVG vector/print de Hew. Decidir qué falta para capas, cotas, polilíneas, bloques y línea de comandos. Alternativamente, **PoC de adaptador DXF** con librería de licencia clara (ej. ezdxf MIT como herramienta externa). Elegir ruta sin rehacer cientos de comandos.

### A5 — Render
Exportar escena con posiciones/jerarquías/materiales, añadir sidecar para HDRI/luz/cámara y renderizar mediante Blender local. Comprobar geometría, escala, visualización antes/después y render PNG. No afirmar real-time D5.

## P-B: IngeCAD + IngeTrazo (Plan B)
Repos [IngeCAD](https://github.com/ingelibre/ingecad) / [IngeTrazo](https://github.com/ingelibre/ingetrazo).
- Instalar/upstream sin modificaciones y abrir el mismo DXF/DWG autorizado con cotas/capas.
- Obtener modelo 3D editando geometría con herramienta existente (no solo importación de malla); guardar/reabrir.
- Ejecutar **plugin Blender existente** desde IngeTrazo, observar salida y calidad.
- Examinar cómo sincronizar sin depender de dos proyectos distintos y cuánto habría que reescribir para web.

## Captura de evidencia obligatoria por caso
| Campo | Valor a registrar |
| --- | --- |
| Repo/commit | SHA exacto y diff propio |
| Platform | OS, versión, hardware, GPU/driver, conectividad |
| Installation | toolchains y comandos exactos |
| Inputs | Fixture abierto/propio, unidades, tamaño, licencia |
| Outputs | Documento editable, export, PNG/log, checksums |
| Prueba | PASS/FAIL/BLOCKED con pasos y error literal |
| Medidas | inicio, importación, memoria, VRAM, tiempo render |
| Riesgos | licencia, UX, APIs, interoperabilidad, mantenimiento |

## Puertas de decisión (sin porcentajes arbitrarios)
1. Una sola app y proyecto: ¿el modelo se puede cambiar entre interfaces conservando objeto/medidas?
2. CAD usable: ¿cotas/capas/snap y DWG/DXF son viables sin infringir licencia ni rewrite mayor?
3. Render local: ¿se reproduce cámara/material/luz y guarda PNG sin servicio remoto?
4. Multiplataforma: ¿funciona Linux y Windows, y hay ruta realista macOS/web?
5. AGPL/terceros: ¿licencias compatibles, atribuciones preservadas y recursos legales?

Si la ruta elegida no satisface las puertas, crear ADR de bloqueo y reevaluar. **No migrar el repositorio principal por entusiasmo.**
