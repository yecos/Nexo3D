# Evaluación técnica de bases de código y motores

**Regla:** no adoptar tecnología por parecido de interfaz ni por una sola captura. Evaluar código, licencias, APIs, mantenimiento, interoperabilidad, rendimiento y posibilidades web. **No se ha adoptado aún un kernel concreto.**

## Candidatos y preguntas abiertas
| Área | Candidato | Ventaja a evaluar | Riesgo/pregunta |
| --- | --- | --- | --- |
| Modelador / núcleo | [Hew](https://github.com/hew3d/hew) | Enfoque sólido, multiplataforma y web; Rust/WASM | Licencia AGPL y excepción de plugins; acoplamiento interno, APIs e integración |
| Modelador | [IngeTrazo](https://github.com/ingelibre/ingetrazo) | Herramientas de arquitectura y experiencia similar a SketchUp | Stack/portabilidad web, licencia, estado y APIs |
| CAD 2D | [LibreCAD](https://github.com/LibreCAD/LibreCAD) | Herramientas DXF 2D establecidas | Integración con núcleo de escena, stack de UI |
| CAD 2D | [QCAD](https://github.com/qcad/qcad) | Scripting y herramienta CAD madura | Distinguir Community GPL de addons/complementos comerciales |
| Geometría | [OpenCascade.js](https://github.com/donalffons/opencascade.js) | CAD B-Rep en WASM | Tamaño, rendimiento, licencias y tolerancias |
| Viewport | [Three.js](https://github.com/mrdoob/three.js) | Visualización web, integración UI | No es motor D5 listo; precisión y escenas grandes |
| Render final | [Blender](https://github.com/blender/blender) | Cycles, materiales, automatización | Tiempos, conversions PBR, subprocess y cumplimiento GPL |
| Render avanzado | [NVIDIA Falcor](https://github.com/NVIDIAGameWorks/Falcor) | Investigación RTX/path tracing | Complejidad/stack/licencias adicionales/Windows |
| Shell desktop | [Tauri](https://github.com/tauri-apps/tauri) | UI compartida web/desktop | Diferencias WebView y permisos filesystem |
| UI y WASM | React/Rust | Reutilización, comunidad | Complexity y aprendizaje |

## Proceso de evaluación (repetible)
1. Anotar repo/commit/tag exacto, versión, licencia raíz y licencias de dependencias.
2. Compilar en ambiente limpio y documentar comandos/errores (no copiar instaladores desconocidos).
3. Crear PoC **aislada**: dibujar cubo o importar GLB, moverlo, obtener ID, exportar escena.
4. Medir Linux y Windows, y documentar factibilidad macOS/web (build o bloqueo concreto).
5. Ver cómo exponer comandos `create/edit/delete/undo`, serializar escenas y observar cambios.
6. Medir memoria, inicio, escenas grandes y deformación geométrica.
7. Registrar riesgos legales, mantenimiento, comunidad, APIs y fricción para contribuir.
8. Decidir por ADR con pruebas y alternativas. **No fusionar código** antes de licencia y prueba técnica.

## Rúbrica de selección (0–5 con evidencia)
- Fidelidad de modelado/robustez geométrica: **25 %**.
- Potencial de integración con estado compartido: **25 %**.
- Portabilidad Linux/Windows/macOS/web: **20 %**.
- Licencias y claridad de redistribución: **15 %** (incompatibilidad legal es veto, no promedio).
- Mantenimiento/comunidad/pruebas: **10 %**.
- Rendimiento y accesibilidad para desarrolladores: **5 %**.

Resultados deben incluir enlace a commit, hardware, guion de prueba y fecha. Pesos pueden revisarse por ADR.

## Riesgos especiales
- Reutilizar Hew no implica que sea sencillo transformarlo en módulo; puede convenir integrar por protocolo o reimplementar componentes.
- AGPL de NEXO no da permiso sobre assets, marcas ni APIs privativas.
- GPL/AGPL y restricciones de plugins deben revisarse **por componente** y forma de distribución, no por nombre de repositorio.
- Un proveedor "open-weight" de IA no necesariamente es open source ni de uso comercial ilimitado.
- Falcor y renderizadores complejos no son sustitutos inmediatos de un editor arquitectónico.

## Decisión de sprint de exploración
Ejecutar **dos PoCs breves**: (A) Hew scene/read/write + acciones accesibles; (B) glTF viewer independiente con snapshot canónico y dos workspaces. Comparar costo de adaptación y de mantenimiento antes de adoptar.
