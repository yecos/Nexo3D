# Plan ejecutable de implementación — primera versión demostrable

**Importante:** es un plan de tareas, no un software ya creado. Base tecnológica exacta se elegirá tras PoC. **Objetivo del primer demo:** GLB → Modelado → Render → archivo local → reapertura offline.

## Éxito: demostración de 3 minutos
1. Inicio en Linux/Windows con proyecto vacío.
2. Usuario arrastra `sofa.glb`; se crea nodo con ID y nombre.
3. En Modelado lo mueve exactamente 1.2 m en X y cambia su escala.
4. Cambia a Render sin exportar; mismo sofá en nueva posición.
5. Asigna baseColor y roughness; añade luz o entorno de prueba.
6. Guarda en disco; corta internet; cierra y reabre.
7. Sigue viendo sofá, transformaciones, material, entorno, cámara y jerarquía idénticos.
8. Undo/redo correcto dentro de sesión; archivo corrupto no destruye el proyecto activo.

## Orden de tickets / tareas de ingeniería
| Ticket | Resultado | Dependencias | Test de salida |
| --- | --- | --- | --- |
| BOOT-001 | PoC shell + visor ejecutable con una ventana | M0 / decisión stack | Lanzamiento local en Linux/Windows |
| SCENE-001 | Tipos Node/Transform/Material/Light/Camera/Asset con UUID | BOOT-001 | Unit y serialización |
| VIEW-001 | GLB import + scene hierarchy + viewport | SCENE-001 | T-MVP-01 |
| CMD-001 | Command bus para TransformNode, undo/redo | SCENE-001 | T-MVP-02/04 |
| UI-001 | Menú Modelado/Render con misma selección y documento | VIEW-001, CMD-001 | T-MVP-02 |
| MAT-001 | Material PBR + luz/entorno persistibles | SCENE-001 | T-MVP-03 |
| SAVE-001 | Save/Open con versionado de schema y escritura segura | SCENE-001 | T-MVP-03/06 |
| UX-001 | Inspector, errores legibles, import fallido no destructivo | VIEW-001 | T-MVP-05 |
| CI-001 | Lint/test/build y fixture público | BOOT-001 | resultado CI visible |
| DEMO-001 | Prueba end-to-end offline y evidencia | Tickets anteriores | AC-MVP-01/02/03 |

## Secuencia de trabajo semanal sugerida (sin plazo comprometido)
**Iteración A — Spike:** comparar Hew y visor/scene independiente en branch aislada; anotar barreras y licencia.
**Iteración B — Modelo:** IDs y unidades, import fixture, árbol y comandos.
**Iteración C — Interfaz:** Modelado/Render sincronizados e inspector.
**Iteración D — Storage:** save/reopen, materiales, luz, recuperación y casos de error.
**Iteración E — Cierre:** CI, fixtures, guía y video de demo; ajustar arquitectura según evidencia.

Cada iteración termina con PR pequeño, test reproducible y deuda técnica identificada.

## Riesgos para la primera versión
- **Adaptación de Hew costosa:** crear interfaz de integración o visor propio; no bloquear todo el producto.
- **GLB no paramétrico:** limitar operaciones MVP a transformación y PBR; edición CAD se programa en M3.
- **Viewport y render diferencias:** validar datos materiales y no prometer render final en M2.
- **Persistencia compleja:** primero esquema JSON mínimo versionado; contenedor nativo definitivo solo tras ADR.
- **Web futura:** UI separada, no introducir APIs nativas en dominio.

## Fixture sugerido
Una habitación simple con un sofá y una mesa; geometría diseñada por el equipo, materiales CC0 u originales documentados. 1 cámara y 1 área light o environment simple. Guardar archivo original para comparación.

## Cómo demostrar que pasó
Una carpeta `docs/evidence/m2/` con: versión/commit/OS/GPU, pasos, resultados T-MVP-01...08, evidencia visual corta, archivo nativo de ejemplo, captura de reabrir sin internet y fallos conocidos.

## Después del MVP
Comenzar CAD 2D precisión y el adaptador de render final; IA solo después de que los assets GLB sean persistentes y reutilizables.
