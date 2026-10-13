# Auditoría de reutilización de software libre — NEXO 3D

**Fecha:** 2026-10-13 · **Revisión:** AUDIT-OSS-001 · **Estado:** auditoría estática preliminar, pendiente de PoC y validación legal de distribución.

> **Resultado fundamental:** el siguiente paso **NO** es dibujar un CAD nuevo desde cero. La aplicación debe apoyarse en bases maduras, reutilizar sus motores y construir solo las capas de integración que falten. El objetivo «80 % reutilización / 20 % integración» es una aspiración, **no una estimación validada**.

## 0. Resumen ejecutivo

**Candidato prioritario para NEXO 3D multiplataforma + navegador: [Hew](https://github.com/hew3d/hew), mediante fork/evaluación aislada.** Ya comparte una arquitectura web/escritorio (Rust/WASM + React/Three.js + Tauri), dispone de modelado directo tipo SketchUp, su propio documento editable, importación/exportación SKP y una API/CLI. No reescribir push/pull, booleans, inferencias ni el visor antes de probar estos componentes.

**Ruta alternativa para una solución de escritorio primero:** [IngeCAD](https://github.com/ingelibre/ingecad) + [IngeTrazo](https://github.com/ingelibre/ingetrazo) + Blender/Cycles. Ambos editores Inge son Python/PySide6, y IngeTrazo **ya contiene un plugin de render Blender**. Sus flujos CAD/DWG y BIM están más próximos a la arquitectura cotidiana del usuario; no hay evidencia de un núcleo unificado entre ambos, y convertir su UI Qt a web verdadera supondría reingeniería significativa.

**Alerta legal:** [LibreCAD](https://github.com/LibreCAD/LibreCAD) declara su aplicación completa bajo **GPLv2**; NEXO es **AGPL-3.0-only**. No fusionar ni copiar código de esa aplicación al programa combinado sin una revisión jurídica/licencias. Algunas librerías contenidas en su árbol poseen licencias diferentes y requerirían inventario separado. [QCAD 3 Community](https://github.com/qcad/qcad) declara **GPLv3 con excepciones específicas** y es mejor candidato legal para análisis CAD, aunque Qt/C++ tampoco es reutilizable directamente en la UI web de Hew.

**Render:** reutilizar **Blender/Cycles como proceso externo**; una herramienta de render final, no un clon del viewport D5. No comenzar creando un nuevo motor RTX/Falcor antes de demostrar el pipeline local de exportación de escena, material, cámara, luz y PNG.

**Decisión vigente:** NO seleccionar aún fork/stack en producción ni cambiar `main` a Hew o Inge. Autorizar una evaluación técnica con pruebas reproducibles y ADR posterior a esa evidencia.

## 1. Alcance y método

Se inspeccionaron, mediante GitHub, metadatos públicos, documentos de arquitectura, licencias, archivos de configuración, carpetas de implementación y puntos de integración. Se guardan SHA exactos en la tabla siguiente. **No se clonaron, compilaron, ejecutaron, midieron FPS ni probaron documentos DWG/SKP reales en esta auditoría.** Las funciones «declaradas» son afirmaciones de los repositorios; no pasan a «verificadas» para NEXO hasta tener fixtures, builds y resultados propios.

| Repositorio | Commit observado (2026-10-13) | Rol |
| --- | --- | --- |
| [Hew](https://github.com/hew3d/hew/tree/f36661fb726253e501ef26a4d5fff3cc6381d814) | `f36661fb7262` | Motor/UI web-escritorio para modelado |
| [OpenSKP](https://github.com/hew3d/openskp/tree/a6788afa6386cfd4bc781998dca99c591b3fb069) | `a6788afa6386` | Lector/escritor SKP limpio |
| [IngeTrazo](https://github.com/ingelibre/ingetrazo/tree/759f4c65a579fecf544963842dfe1335a348ec4f) | `759f4c65a579` | Modelador PySide6, BIM y Blender |
| [IngeCAD](https://github.com/ingelibre/ingecad/tree/27cfce77340cec5c418032c13986a462b492da3a) | `27cfce77340c` | CAD 2D/DWG con Python/Qt |
| [QCAD](https://github.com/qcad/qcad/tree/4c830eb4d80285ca64b1f2c2dc0987f729344126) | `4c830eb4d802` | CAD 2D y motor Qt/ECMAScript |
| [LibreCAD](https://github.com/LibreCAD/LibreCAD/tree/06994d7ad41a04f0746c00c1d383e6ad4dd39e55) | `06994d7ad41a` | Referencia CAD; GPLv2-only general |
| [Blender](https://github.com/blender/blender/tree/8da87e153a1563f3509847dbfff82409f07bc2a8) | `8da87e153a15` | Render final; C++/Python GPLv3 |
| [FreeCAD](https://github.com/FreeCAD/FreeCAD/tree/50daee777321b5085accd1f57b57f1a7c1781cae) | `50daee777321` | CAD paramétrico y B-Rep, futuro |
| [OpenCascade.js](https://github.com/donalffons/opencascade.js) | cabeza pública inspeccionada; sin pin de compilación | B-Rep WASM, investigación |

**Fuentes de primer orden:** `README`, `LICENSE`, `LICENSE-EXCEPTION`, `Cargo.toml`, `requirements.txt`, módulos fuente y documentación de interoperabilidad. No se tomaron decisiones por el número de estrellas.

## 2. Fichas técnicas

### A. Hew — **prioridad 1 para PoC web + escritorio**
- **Código:** Rust en `crates/kernel`, `crates/inference`, `crates/tessellate`, `crates/wasm-api`; UI React/TypeScript en `app/src`, renderer Three.js y shells Tauri/web en `shells/`.
- **Funciones declaradas:** dibujo sobre caras, línea/rectángulo/círculo/arco, push/pull, snap/inferencias, booleanas, componentes, jerarquía, materiales/texturas, mediciones, SVG de línea oculta/PDF y formatos SKP/glTF/STL/DAE.
- **Arquitectura documentada:** kernel puro Rust, compilado a WebAssembly tanto en desktop como en browser; formato nativo abierto `.hew` con sólidos, componentes y sketches.
- **Interoperabilidad:** documentación de `docs/INTEROP.md` marca SKP 2017 y 2026 importar/guardar/exportar, GLB importar/exportar y DXF/DWG **NO implementados**. STEP/IGES son futuros.
- **Control programático:** `hew-cli` y `docs/API_GUIDE.md` describen crear y editar objetos, abrir, guardar, importar, exportar, render básico y comandos vía API/MCP. La **API de plugins sandboxed aún figura como plan** en el roadmap; no suponer que un plugin NEXO complejo pueda añadirse sin un fork.
- **Licencia:** AGPL-3.0-only con **excepción de plugins** limitada a interfaces publicadas. Copiar/modificar el núcleo requiere conservar avisos y obligaciones AGPL. La excepción no autoriza copiar marcas/arte ni combinar arbitrariamente componentes.
- **Riesgo:** es un modelo de **sólidos discretos**, no un CAD 2D completo ni un sistema BIM semántico. Un fork profundo demanda mantenimiento de upgrades upstream y cuidado del esquema/undo.
- **Evidencias:** [arquitectura](https://github.com/hew3d/hew/blob/f36661fb726253e501ef26a4d5fff3cc6381d814/docs/dev/ARCHITECTURE.md), [interop](https://github.com/hew3d/hew/blob/f36661fb726253e501ef26a4d5fff3cc6381d814/docs/INTEROP.md), [API](https://github.com/hew3d/hew/blob/f36661fb726253e501ef26a4d5fff3cc6381d814/docs/API_GUIDE.md), [licencia/exception](https://github.com/hew3d/hew/blob/f36661fb726253e501ef26a4d5fff3cc6381d814/LICENSE-EXCEPTION), [Cargo workspace](https://github.com/hew3d/hew/blob/f36661fb726253e501ef26a4d5fff3cc6381d814/Cargo.toml).

### B. IngeTrazo — **ruta de escritorio y render a reutilizar/estudiar**
- **Código:** Python/PySide6, Qt/OpenGL; `core/geometry.py`, `core/scene.py`, `views/viewport.py`, `views/main_window.py`; importadores en `formats/`.
- **Funciones declaradas:** modelado libre, edición y extrusión, SKP, capas, anotaciones, BIM tagging/IFC, exportadores e integración de render Blender.
- **Prueba concreta de reutilización:** existen `plugins/render_blender.py`, `core/render_blender.py` y `resources/blender/render_scene.py`. El plugin anuncia Cycles/EEVEE, exportación GLB, cámara y luces; Blender se ejecuta separado, sin empaquetarlo.
- **Licencia:** cabeceras GPL-3.0-or-later y licencia raíz GPL. Revisar directorios `vendor/` y módulos de conversión antes de redistribuir.
- **Portabilidad:** las releases dicen Windows/Linux/macOS, pero la UI PySide6 **no se traslada al navegador** con el mismo frontend; macOS indica limitación DWG de conversión.
- **Riesgo:** motor/modelo y render se acoplan a objetos Python/Qt; rendimiento en escenas enormes y APIs de plugins están evolucionando (roadmap 0.x). No es una biblioteca WASM plug-and-play para Hew.
- **Evidencias:** [README](https://github.com/ingelibre/ingetrazo/blob/759f4c65a579fecf544963842dfe1335a348ec4f/README.md), [requirements](https://github.com/ingelibre/ingetrazo/blob/759f4c65a579fecf544963842dfe1335a348ec4f/requirements.txt), [plugin Blender](https://github.com/ingelibre/ingetrazo/blob/759f4c65a579fecf544963842dfe1335a348ec4f/plugins/render_blender.py), [roadmap](https://github.com/ingelibre/ingetrazo/blob/759f4c65a579fecf544963842dfe1335a348ec4f/ROADMAP.md).

### C. IngeCAD — **el CAD 2D preexistente más alineado con el flujo del usuario**
- **Código:** Python, PySide6/Qt; `ezdxf` como modelo documental DXF y convertidores LibreDWG externos para DWG. Licencia GPLv3.
- **Funciones declaradas:** línea de comandos y alias clásicos, comandos LINE/PLINE/OFFSET/TRIM, object snaps, bloques, capas, textos, cotas asociativas, layouts, escalas de impresión, DWG importación/exportación (salida r2000 por LibreDWG), referencias externas. Muy próximo al flujo «AutoCAD antes de modelar».
- **Ventaja de ecosistema:** comparte Python/Qt con IngeTrazo, ambos bajo licencias copyleft compatibles a evaluar; **no implica** que ya compartan documento ni que su unión sea trivial.
- **Riesgos:** proyecto principalmente Linux/Wayland, conversión DWG mediante procesos externos, Qt nativo (no web); cambios de datos deben traducirse con precisión a la geometría/modelo 3D. La fidelidad DWG **no fue verificada** con archivos de NEXO.
- **Evidencias:** [README](https://github.com/ingelibre/ingecad/blob/27cfce77340cec5c418032c13986a462b492da3a/README.md), [requirements](https://github.com/ingelibre/ingecad/blob/27cfce77340cec5c418032c13986a462b492da3a/requirements.txt), [LICENSE](https://github.com/ingelibre/ingecad/blob/27cfce77340cec5c418032c13986a462b492da3a/LICENSE).

### D. QCAD 3 Community — **candidato CAD 2D secundario**
- **Código:** C++/Qt con motor CAD y scripting ECMAScript/JavaScript; directorios `src/core`, `src/operations`, `src/snap`, `src/scripting`.
- **Licencia:** GPLv3 con excepciones explícitas de enlace en `gpl-3.0-exceptions.txt`; bibliotecas y contenidos integrados tienen avisos independientes.
- **Interoperabilidad:** Community enfocado DXF; soporte DWG mediante plugin **propietario** opcional según el repositorio.
- **Riesgo:** trasladar UI Qt a una UI web no equivale a reutilizar unas funciones JS; requeriría desacoplar motor y esquemas. Las excepciones deben analizarse según módulos exactos.
- **Evidencias:** [README](https://github.com/qcad/qcad/blob/4c830eb4d80285ca64b1f2c2dc0987f729344126/README.md), [LICENSE](https://github.com/qcad/qcad/blob/4c830eb4d80285ca64b1f2c2dc0987f729344126/LICENSE.txt), [excepciones](https://github.com/qcad/qcad/blob/4c830eb4d80285ca64b1f2c2dc0987f729344126/gpl-3.0-exceptions.txt).

### E. LibreCAD — **referencia funcional; no copiar como base combinada**
- **Código:** C++/Qt, dibujo CAD 2D.
- **Licencia oficial raíz:** `LICENSE` identifica al programa completo como **GPLv2**; varios módulos/recursos tienen otras licencias, incluida `libdxfrw` GPLv2-or-later. Para **una obra combinada única** con AGPLv3 hay incompatibilidad entre GPLv2-only y GPLv3/AGPLv3; investigar por módulo o vía intercambio entre procesos separados con revisión legal.
- **Riesgo:** un fork LibreCAD completo como módulo dentro del binario AGPL de NEXO sería un bloqueo legal/técnico probable. No confundir «open source» con «licencias libremente mezclables».
- **Evidencia:** [LICENSE](https://github.com/LibreCAD/LibreCAD/blob/06994d7ad41a04f0746c00c1d383e6ad4dd39e55/LICENSE).

### F. Blender — **motor de render final local, no viewport equivalente a D5**
- **Código:** suite 3D C++/Python GPLv3; Cycles y EEVEE son implementaciones reales de render.
- **Integración aconsejada:** herramienta externa `blender --background` ejecutada por adaptador local, bajo permisos mínimos, a la cual NEXO envía un snapshot y texturas autorizadas; recuperar PNG/EXR y logs. Mantener su licencia y atribuciones.
- **No resuelve automáticamente:** render interactivo de D5, HDRI, material exacto, GI o cámaras sincronizadas; requerimos manifest propio adicional a GLB para entorno, exposición, color management y parámetros específicos.
- **Evidencias:** [README](https://github.com/blender/blender/blob/8da87e153a1563f3509847dbfff82409f07bc2a8/README.md), [COPYING](https://github.com/blender/blender/blob/8da87e153a1563f3509847dbfff82409f07bc2a8/COPYING), [ejemplo de conector existente en IngeTrazo](https://github.com/ingelibre/ingetrazo/blob/759f4c65a579fecf544963842dfe1335a348ec4f/plugins/render_blender.py).

### G. OpenSKP y otros kernels
- **OpenSKP:** Rust GPL-3.0-only, lectura y escritura 2017/2026 (según proyecto); 2018–2025 no ensayados sistemáticamente. **Hew ya lo usa**: evitar integrar dos veces. La escritura/autenticidad de cada versión debe probarse con archivos autorizados. [Fuente](https://github.com/hew3d/openskp/blob/a6788afa6386cfd4bc781998dca99c591b3fb069/README.md).
- **FreeCAD:** CAD paramétrico LGPL-2.1 en C++/Python, enorme capacidad de sólidos pero Qt y stack considerable para interfaz web. Evaluar como proceso/herramienta cuando necesitemos STEP/B-Rep. [Fuente](https://github.com/FreeCAD/FreeCAD).
- **OpenCascade.js:** B-Rep en WebAssembly bajo términos LGPL, candidato futuro cuando falten operaciones exactas; no selección automática. El repositorio público mostró antigüedad de la última actualización de código principal, lo que exige una prueba explícita de mantenimiento/toolchain. [Fuente](https://github.com/donalffons/opencascade.js).

## 3. Licencias: matriz de decisiones

| Componente | Licencia base observada | En NEXO AGPL-3.0-only |
| --- | --- | --- |
| Hew | AGPL-3.0-only + excepción de plugins | **Candidato compatible** para fork respetando obligaciones; excepción solo en API designada |
| OpenSKP | GPL-3.0-only | Compatible en principio según reglas GPLv3↔AGPLv3; conservar copyright/NOTICE |
| IngeTrazo | GPL-3.0-or-later según README y headers | **Candidato compatible en principio**, revisar vendored/transitivas |
| IngeCAD | GPLv3 | **Candidato compatible en principio**, revisar conversores y recursos |
| QCAD | GPLv3 + excepciones | **Candidato con revisión modular**; no incluir plugin DWG propietario |
| LibreCAD | GPLv2-only para programa completo | **No integrar código del programa completo en el mismo trabajo AGPLv3** sin autorización/relicenciamiento; posible comunicación externa independiente a evaluar |
| Blender | GPLv3 | Preferir programa externo y archivos de intercambio; redistribución con avisos |
| FreeCAD | LGPL-2.1 + componentes mixtos | Evaluación por módulo/condiciones |
| OpenCascade.js | LGPL-2.1 + dependencias | Revisar atribuciones, vinculación y WASM |

**Importante:** «compatible en principio» no es una aprobación legal automática de un binario combinado. Comprobar dependencias transitivas, recursos, trademark, bundles y obligaciones de código fuente con los repos fijados. En decisiones complejas solicitar revisión legal de software libre.

## 4. Opciones arquitectónicas comparadas

| Criterio obligatorio | Ruta A: **Fork Hew + CAD e integración propia** | Ruta B: **IngeCAD + IngeTrazo + Blender** |
| --- | --- | --- |
| Experiencia modelar tipo SketchUp | **Muy favorable**: ya trae push/pull, inferencia, componentes | **Muy favorable**: IngeTrazo trae modelado |
| CAD 2D profesional inmediato | **No**: requiere módulo nuevo o adaptador a otro CAD | **Favorable**: IngeCAD ya tiene herramientas CAD y DWG |
| Render final | Blender como adaptador a desarrollar (reutilizar ideas del plugin IngeTrazo, sujeto a licencia) | **Favorable**: plugin Blender existe en IngeTrazo |
| Windows + Linux + macOS | **Favorable**: shell Tauri existente | Esfuerzo de empaquetado/QA por plataforma (IngeCAD Linux primero) |
| Ejecución futura en navegador | **Muy favorable**: UI + kernel WASM y web ya existen | **Desfavorable**: Qt/Python no equivale a web |
| Reutilización de componentes 3D | Muy alta | Muy alta |
| Sincronización CAD↔3D↔Render | **No resuelta**, diseñar contratos | **No resuelta**, aun siendo mismo lenguaje |
| Complejidad y deuda de mantenimiento | Fork Hew, actualización upstream y nuevo CAD | Dos aplicaciones/estados Qt y esfuerzo eventual de portar web |
| Alineación total con visión NEXO | **Mejor candidata, pendiente de pruebas** | **Plan B**, o prototipo de escritorio rápido |

**Recomendación condicional:** la intención expresada de ejecutar **un solo programa en Windows/Linux/macOS y posteriormente navegador** da ventaja a **Ruta A (Hew)**. La prioridad absoluta de un CAD DWG idéntico al flujo de escritorio daría ventaja a Ruta B. No pueden satisfacerse ambas condiciones gratis: adoptar CAD Python/Qt completo impone coste real de web.

## 5. Qué reutilizar / adaptar / construir

### Reutilizar antes de escribir código
- Del modelador elegido: kernel geométrico, sketching, push/pull, booleanas, componentes, inferencias, historia/undo, escenas, importadores y shell disponible.
- Del CAD elegido o biblioteca de intercambio: parser DWG/DXF con licencia permitida, entidades, snapping, cotas, capas, impresión y layouts cuando sea técnicamente viable.
- De Blender: Cycles, EEVEE y scripting para salida PNG/EXR.
- Del ecosistema SKP: OpenSKP incorporado a Hew, no desarrollar parser SKP propio.

### Adaptar mediante contratos estables
- `CadEntity` (línea, arco, polilínea, cota, capa, unidad, referencia) y sus proyecciones.
- `SolidEntity`/instancia/ID con relación editable a un perfil o muro semántico.
- `RenderManifest` (material PBR, HDRI, cámara, luz, unidades, render settings, color management).
- `FormatAdapter` con informes de pérdida y snapshots; `CommandBus` con revisión y undo.
- Una interfaz de workspaces con mismo proyecto, guardado offline y buses de eventos.

### Construir solo si no hay una base aprovechable
- Sincronización **bidireccional y comprobable** de entidades CAD semánticas a modelado.
- Un «proyecto NEXO» abierto que envuelva datos CAD, sólidos, referencias, renders y procedencia.
- Panel de render arquitectónico (aspecto D5) y adaptador Blender/alternativa de viewport.
- Herramientas de IA y catálogo opcionales después del circuito CAD→3D→Render.

## 6. Decisión sobre el prototipo NEXO ya escrito
- PR #1 (`feat/mvp-local-glb-workspaces`) y PR #2 (`feat/cad2d-linked-walls`) **siguen siendo útiles como pruebas de concepto** del estado compartido, pero no son bases profesionales para expandir con centenares de herramientas.
- **No fusionarlos automáticamente a `main` ni reescribir Hew sin evaluación.** Conservarlos como experimentos/fixtures que definen comportamiento esperado.
- Recuperar ideas y tests útiles, **no copiar implementaciones primitivas CAD** al fork si Hew ya tiene solución superior.
- Documento de decisión final pendiente: [ADR-0006](../adr/0005-reuse-first-evaluation.md).

## 7. Pruebas de integración exigidas (sin resultados todavía)

| Código | PoC | Evidencia de aceptación |
| --- | --- | --- |
| **P-A1** | Compilar Hew Linux, Windows; ejecutar web en Chrome/Firefox | Log compilación por plataforma + screenshot + comando |
| **P-A2** | Documento 4×3 m, dibujo de perfil y extrusión 2.60 m | Guardar/reabrir, unidades exactas, IDs y sin internet |
| **P-A3** | Importar SKP 2017 y 2026 autorizados | Geometría, jerarquía, materiales y warnings; export/abrir |
| **P-A4** | CAD→Hew desde DXF con líneas/capas/cotas (prototipo de adaptador, no todo CAD) | Fixture, métricas, informe de pérdidas, modificación/reproyección |
| **P-A5** | Hew→Blender local | Snapshot GLB + entorno/luces/cámara, PNG y logs reproducibles |
| **P-B1** | IngeCAD 2D→IngeTrazo 3D, intercambio DXF sin pérdida silenciosa | Fixture, precisión/unidades, reeditabilidad, time-cost |
| **P-B2** | Render nativo IngeTrazo→Blender | Salida PNG y exactitud de cámara/material/escala |
| **P-WEB** | Auditoría de dependencias y estado compartido en browser | Sin Python Qt ni APIs nativas obligatorias para modelado |
| **P-LEGAL** | Licencias directas/transitivas, NOTICE, binarios, assets de prueba | Inventario SPDX y dictamen por distribución |

**Criterio de selección:** preferir la ruta que demuestre el flujo completo CAD→3D→render **sin exportación manual entre workspaces**, datos editables, red opcional y una ruta técnica creíble para navegador. Si una PoC fracasa, registrar bloqueo antes de escribir sustitutos de cero.

## 8. Próximas acciones propuestas

1. Abrir una rama experimental aislada para Hew y **compilarlo tal cual**, conservando upstream y la licencia.
2. Probar su API para sketches, unidades, sólidos, import/export SKP y GLB.
3. Evaluar dos maneras de integrar CAD: (A) entidades internas del kernel Hew extendidas; (B) adaptador DXF/CAD externo con sincronización. Evitar copiar LibreCAD GPLv2-only.
4. Probar en paralelo la alternativa de escritorio con IngeCAD e IngeTrazo sobre un plano autorizado.
5. Documentar resultados, medidas y licencias; publicar ADR de elección. **Solo entonces** migrar NEXO desde PoCs a su base real.

### Preguntas pendientes
- ¿Se requiere editar archivos DWG nativamente, o import/export DXF con reporte de fidelidad es suficiente en una primera release?
- ¿La edición bidireccional entre plano y modelo debe ser paramétrica (muros semánticos) desde el MVP?
- ¿Se prioriza salir antes en Linux/Windows o mantener desde el primer día el mismo núcleo web?
- ¿Cómo debe expresarse el vínculo de dimensiones/cotas CAD con objetos de Hew sin degradar su kernel de sólidos?

**Auditoría honesta:** esta recomendación se fundamenta en inspección de código y documentación, **NO** en compilaciones locales, benchmarks, pruebas de interoperabilidad real ni revisión jurídica definitiva.
