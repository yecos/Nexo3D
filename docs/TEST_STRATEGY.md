# Plan maestro de pruebas — NEXO 3D

**Estado:** estrategia y casos escritos; no se afirma que existan tests ejecutables hasta implementar el repositorio. **Objetivo:** confianza en integridad de proyecto y sincronización, no solo imágenes bonitas.

## 1. Pirámide y alcance
| Capa | Qué verificar | Cuándo |
| --- | --- | --- |
| Unitarias | IDs, transformaciones, unidades, serialización, validación, migraciones, comandos | Cada PR |
| Integración | GLB→escena→materiales→guardar/reabrir, adapter geométrico, renderer | PRs de módulo |
| UI/E2E | Flujo de usuario Modelado↔Render, menús, atajos, import, save | Build MVP y releases |
| Plataforma | Linux, Windows y luego macOS, con versiones/driver identificados | CI y release |
| Robustez | archivos corruptos, límites de recursos, crash durante guardado | M1–M2 y regresión |
| Performance | fixtures públicos, FPS/VRAM/RAM/tamaño/tiempo | Hitos de render |
| Seguridad | path traversal, assets remotos, scripts, permisos, tokens | Todas las releases |

## 2. Fixtures mínimos
```text
tests/fixtures/
  simple-cube.glb          # 1 objeto con ejes reconocibles
  nested-furniture.glb     # jerarquía / rotación / varias mallas
  pbr-textures.glb         # materiales y texturas
  meters-and-millimeters/  # dimensiones esperadas documentadas
  corrupt/                 # archivos truncados / referencias inválidas
  expected/                # propiedades de geometría y snapshots
```
**No agregar archivos de terceros sin licencia que permita redistribución.** Fixtures generados por el proyecto deben indicar su autor y licencia.

## 3. Identificadores de pruebas y requisitos
| Test | Requisitos | Pasos | Resultado |
| --- | --- | --- | --- |
| T-MVP-01 | FR-001 | Importar fixture con jerarquía | Nodos/materiales aparecen, import report sin errores |
| T-MVP-02 | FR-002/003/007 | Mover 1.0 m objeto seleccionado y cambiar workspace | Misma UUID, misma posición en ambos workspaces |
| T-MVP-03 | FR-004/005/006 | Añadir roughness+light, guardar/offline/reabrir | Mismos valores, sin fetch remoto |
| T-MVP-04 | FR-003 | Undo+redo de transformación y borrado | Estado vuelve exactamente al previo |
| T-MVP-05 | FR-008 | Importar GLB truncado mientras proyecto está abierto | Error legible y documento intacto |
| T-MVP-06 | NFR-004/010 | Interrumpir escritura y reabrir archivo | Último proyecto íntegro o recuperación disponible |
| T-MVP-07 | NFR-002 | Abrir fixture y completar flujo en Linux/Windows | Resultado verificable, logs conservados |
| T-MVP-08 | NFR-001/006 | Desactivar red y revisar intentos de conexión | Operaciones básicas OK; sin transferencia de assets |
| T-CAD-01 | FR-009 | Línea 2500 mm con snaps | Medida y dirección correctas según tolerancia |
| T-RENDER-01 | FR-012 | Exportar PNG local del fixture | Dimensiones/píxeles y salida válidos |
| T-AI-01 | FR-015 | Aceptar GLB generado tras revisión | Asset contiene procedencia, escala y licencia |

## 4. Pruebas de round-trip
Aserciones fuertes (sin depender solo de pixel diff):
- Mismos IDs y relaciones padre/hijo después de guardar/reabrir.
- Transformaciones comparadas bajo tolerancia definida y unidad explícita.
- Materiales, texturas, referencias a assets, cámaras, luces y capas idénticos.
- Export/import no cambia la escala sin advertencia.
- Si el formato externo no representa un campo, reportarlo como pérdida; no ocultarlo.

## 5. Render visual
Snapshots de referencia con OS, renderer, GPU, versión de driver, escala de color, resolución y seed. Usar tolerancias adecuadas (no exigir hash de píxeles idéntico entre GPUs). Separar test de configuración de escena (determinista) de similitud perceptual (sujeta a variación).

## 6. Rendimiento
Registrar al menos: tiempo carga GLB, FPS p50/p95/p99 en órbita, memoria RAM/VRAM, tamaño escena (triángulos y texturas), tiempo de render PNG, tiempo de reabrir. Fijar umbrales **después de crear benchmark base**, no anticipar números comerciales.

Dispositivos de referencia propuestos: Windows con RTX 3060 12 GB, portátil RTX 4060 y Linux en GPU disponible; el hardware no es un requisito de usuario universal.

## 7. Plataformas
| Plataforma | MVP | Después |
| --- | --- | --- |
| Windows x64 | Build + import/guardar + E2E | GPU matrix y empaquetado |
| Linux x64 | Build + import/guardar + E2E | Wayland/X11 y drivers |
| macOS | Diseño portable; test antes de declarar soporte | ARM64 / notarización según distribución |
| Navegador | Comprobación arquitectónica | Tests por browser y capabilities |

## 8. Evidencia de cada hito
Carpeta `docs/evidence/<hito>/` a crear: README con versión/commit, captura o video corto, comando y logs, sistema, GPU, fixture, pasos y resultado. No guardar secretos, fotos de clientes o activos sin licencia. **No marcar "PASS" sin ejecutar el test.**

## 9. CI propuesta
Fase de código: formato/lint → unit → integración headless → build por OS → E2E smoke. Bloquear merge en compilación/tests/licencias/secretos cuando exista pipeline. Evitar depender de runner GPU público para tests de integridad.
