# PoC de reutilización — Hew como base de NEXO 3D

**Estado:** PLAN, pruebas no ejecutadas. No copiar/fusionar código upstream en NEXO hasta obtener evidencias, licencias y acuerdo de arquitectura. Fuente: [Hew](https://github.com/hew3d/hew) @ `f36661fb726253e501ef26a4d5fff3cc6381d814`.

## Propósito
Comprobar si trabajar desde Hew es **más rápido y más mantenible** que seguir construyendo desde el prototipo independiente de NEXO. No evaluar la cantidad de botones, sino operaciones geométricas, estado único, archivo, API y posibilidad de render.

## Experimentos y aceptación
| ID | Prueba concreta | Pasa si |
| --- | --- | --- |
| R-01 | Construir Hew upstream con README/toolchain fijado | Shell web y escritorio Linux inician (Windows/macOS cuando disponibles) |
| R-02 | Draft/Sketch en plano XY 4×3 m y snapshots | Conserva geometría/unidades exactas y IDs estables |
| R-03 | Push/pull/solid extrusión 2.6 m desde perfil | Produce sólido de topología válida y dimensiones medibles |
| R-04 | Modificar plano y reconstruir sólido | Se conserva la relación explícita y no hay doble modelo maestro |
| R-05 | Save/Open formato Hew existente | Round-trip de geometría, materiales, componentes, cámara sin pérdida |
| R-06 | Importar/exportar SKP y GLB con fixtures licenciados | Informe de pérdida/versiones y escala correcta, no claims de compatibilidad universal |
| R-07 | API Rust→WASM desde una pestaña CAD NEXO | Comandos producen mismo documento observado por Modelado/Render |
| R-08 | Ejecutar Blender con snapshot de escena | PNG reproducible offline con materiales/cámara/luz comprobables |
| R-09 | Evaluar libdxfrw con DXF de habitación + capas | DWG/DXF decode documentado y mapeo a entidades reconocibles |
| R-10 | Verificar licencias/attribution, UI branding independiente | Dependencias y activos legales; notices completos |

**Experimento crítico:** 2D planta con trazo muro de 0.15 m → altura 2.60 m → una puerta → giro cámara → render PNG → guardar/reabrir; la puerta puede registrarse como **pendiente** si modelado semántico está aún fuera de alcance. No fingir BIM ni cortes asociativos antes de implementarlos.

## Evidencia por experimento
- Repo upstream + SHA + diff de cambios locales.
- Sistema, arquitectura CPU/GPU, versión navegador y toolchains.
- Comandos reproducibles, logs, fecha, fixture y licencia.
- Resultado medible (PASS/FAIL/PARTIAL), captura/video y limitaciones.
- Coste de mantenimiento (número de módulos tocados, dependencia de APIs internas y pasos extra de build).

## Secuencia
1. Clonar Hew **en espacio separado**, leer LICENSE/EXCEPTION; compilar upstream sin modificar para establecer baseline.
2. Probar app web y escritorio; script mínimo con API documentada (leer [API_GUIDE](https://github.com/hew3d/hew/blob/main/docs/API_GUIDE.md)).
3. Construir una nueva pestaña experimental CAD que invoque **Hew draft/sketch** en vez de recrear geometría SVG como fuente canónica.
4. Usar modelo de habitación y pasos R-02..05, documentar forma de actualizar extrusión al mover trazos.
5. Construir adaptador temporal snapshot → Blender CLI; comparar resultado con salida del viewport.
6. Evaluar libdxfrw **aislado** con una muestra DXF y reporte de entidades/tolerancias. No llevar Qt completo al navegador.
7. Comparar contra prototipo propio en exactitud, facilidad para contribuir, código nuevo requerido y trabajo futuro de interoperabilidad.
8. Redactar ADR definitivo (aceptar/adaptar alternativa) sin descartar prematuramente prototipos existentes.

## Decisiones para esta fase
- **No portar Blender/Cycles a Rust.**
- **No portar toda la app Python/Qt IngeTrazo a Rust.**
- **No usar LibreCAD GPLv2-only como código fuente de una obra AGPLv3.**
- **No traducir código GPL pensando que cambia sus obligaciones legales.**
- **No declarar compatibilidad DWG/SKP sin fixtures y reporte de conversión.**

## Comparación objetiva
Matriz 0–5, ponderada: solidez geométrica 25 %, integración del estado 25 %, soporte escritorio/web 20 %, auditoría licencia 15 % (veto si incompatible), mantenimiento 10 %, rendimiento 5 %. Anotar trabajos concretos «disponible upstream / adaptar / escribir nuevo», no inventar porcentajes de reutilización.

## Estatus de las ramas NEXO
- `feat/mvp-local-glb-workspaces`: pruebas de visor GLB/estado/materiales.
- `feat/cad2d-linked-walls`: experimento CAD SVG y muros conectados. Ambos son **prototipos útiles**, no la arquitectura final ya elegida.
- La PoC de Hew debe vivir en rama/experimento nuevo con PR propio. No fusionar automáticamente a main ni tirar prototipo hasta demostrar alternativa superior.
