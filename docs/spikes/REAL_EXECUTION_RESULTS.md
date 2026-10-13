# Informe de ejecución técnica: Hew / IngeCAD / Blender

**Fecha:** 2026-10-13 · **Estado:** pruebas reales en GitHub Actions, con ejecución de render nuevamente en curso tras corregir dependencias. Este archivo contiene resultados comprobados hasta el commit anterior al último ajuste; consultar la ejecución más reciente antes de actualizar cualquier veredicto.

## Condiciones
- GitHub-hosted runners de Linux y Windows; **no se ejecutó directamente en el PC del usuario** (Desktop Commander informó los equipos desconectados).
- Ningún programa ajeno fue copiado al código fuente de NEXO: se descargó en directorios temporales de CI para probarlo de forma independiente.
- Puntos de referencia: Hew `f36661fb726253e501ef26a4d5fff3cc6381d814` / IngeCAD `27cfce77340cec5c418032c13986a462b492da3a`.
- Flujo reproducible: [workflow](../../.github/workflows/upstream-probes.yml), [fixture del muro](../../tests/upstreams/hew_wall.json), [verificadores](../../tests/upstreams).
- GitHub Actions de referencia: [Windows/Linux Hew y IngeCAD](https://github.com/yecos/Nexo3D/actions/runs/38462003808).

## Resultados respaldados por logs

| Prueba | Evidencia reproducible | Resultado |
| --- | --- | --- |
| Hew Linux Rust kernel | `cargo test --locked -p kernel --lib` | **165 PASS, 0 FAIL** |
| Hew Windows Rust kernel | Mismo test y commit upstream | **165 PASS, 0 FAIL** |
| Hew CLI Linux | API JSON-RPC: dibujar 4.00 × 0.15 m, extruir 2.60 m, renombrar, guardar | **PASS** |
| Hew CLI Windows | API idéntica | **PASS** |
| Hew exportación GLB | GLB 2.0, al menos una malla/nodo, validación independiente | **PASS**: 1 mesh, 1 node, 1 092 bytes |
| Hew formato `.hew` | Documento zip nativo generado | **PASS estructural**: 1 037 bytes; falta round-trip completo de edición |
| Hew exportación `.skp` | SKP 2017 emitido, archivo no vacío | **PASS de emisión**: 8 536 bytes; **NO** se ha abierto en SketchUp ni validado round-trip |
| IngeCAD headless | PySide6/Qt offscreen, tests de dibujo, cotas y puente DWG | **86 PASS, 3 SKIPPED, 34 WARNINGS**, sin errores en ejecución corregida |
| IngeCAD DWG real | `dwg2dxf` / `dxf2dwg` no estaban instalados en runner | **BLOQUEADO**: ninguna prueba real DWG→DXF→DWG superada; no declarar compatibilidad |
| Hew GLB → Blender | Blender apt 4.0.2 importó el GLB; render Cycles inicial bloqueado por dependencias del runner | **Importación GLB PASS. Render PNG pendiente de CI corregida** |

### Errores de infraestructura encontrados y corregidos
1. IngeCAD en Ubuntu CI: faltaba `libEGL.so.1`; tras instalar runtime Qt/EGL, suite pasó con 86 pruebas. También se corrigió el uso de tuberías shell para que pytest falle de verdad si el test falla.
2. Blender apt no instaló `numpy` requerido por su importador glTF: se añadió `python3-numpy`.
3. La compilación Blender no incluía OpenImageDenoiser: en el script de prueba se deshabilitó denoising; se debe comprobar que CI genere el PNG antes de marcarlo PASS.

## Lectura arquitectónica
- **Hecho confirmado:** Hew proporciona geometría editable, API sin GUI, formato propio y exportadores que funcionan también sobre un runner Windows y Linux. En NEXO esto evita rehacer push/pull, base de sólidos y exportación SKP/GLB.
- **Hecho confirmado:** IngeCAD tiene comandos CAD reales ejercitados en CI. Su uso como CAD de NEXO depende de la arquitectura Qt/Python y del puente a un modelo compartido; el test no muestra aún una sola aplicación integrada.
- **Hipótesis viable:** usar Hew como base por portabilidad navegador/desktop, añadir un modelo CAD 2D reutilizando bibliotecas de licencia compatible y Blender externo para render final.
- **No demostrado:** CAD DWG real, API bidireccional CAD↔Hew, interface Tauri en máquina real, web app gráfica, persistencia de muros semánticos de NEXO dentro de Hew, apertura real del SKP por SketchUp, equivalencia D5, soporte macOS y pruebas con proyectos del usuario.

## Siguiente puerta de aprobación
1. Confirmar resultado render Cycles PNG en Actions del último commit y adjuntar imagen.
2. Preparar plan DWG real con un archivo de prueba autorizado (IngeCAD incluye `tests/data/angular_2l_oda.dwg`) **y conversores LibreDWG presentes**, preservando capas/cotas/entidades con informe de pérdida.
3. Ejecutar Hew UI web y Tauri en Linux/Windows, guardar/reabrir y medir.
4. Ejecutar PoC de comunicación 2D↔Hew antes de establecer ruta definitiva (ADR).
5. Auditar licencias y avisos de dependencias/activos de los forks para distribución.

**Regla del proyecto:** no confundir pruebas de piezas separadas con una sola aplicación profesional terminada. PR #1 y #2 siguen siendo demostradores, no motores definitivos.
