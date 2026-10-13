# Hoja de ruta basada en evidencias

**Estado a 2026-10-13:** documentación en main; visor GLB en PR #1 y CAD 2D + muros vinculados en la rama sucesora experimental. Hay CI de dominio y compilación; **sin instalador desktop ni prueba manual completa en Windows/Linux**. No fijar fechas de entrega antes de estimar capacidad.

## Resumen de hitos
| Hito | Resultado demostrable | Dependencias |
| --- | --- | --- |
| **M0 — Fundamentos** | Repo AGPL, docs, ADR, inventario de dependencias y criterios | — |
| **M1 — Shell y escena** | App inicia, visor con GLB, escena/IDs, selección | M0 |
| **M2 — Modelo ↔ Render** | Trasformación, material/luz, cambio de workspace, save/load offline | M1 |
| **M3 — Geometría y CAD mínimo** | Dibujo 2D y cotas básicos, unidades, vínculos con objetos 3D | M2 |
| **M4 — Render final** | Adaptador de render local, cámaras, output PNG, materiales avanzados | M2 |
| **M5 — IA Studio** | Referencias, proveedor local/opcional, revisar GLB generado, catálogo | M2 |
| **M6 — Web y colaboración** | Cliente web validado, limitaciones declaradas, sync optativa | M2–M5 |

## M0: documentación, licencia y elección de plataforma
- [x] Repositorio público.
- [x] Requisitos de producto acordados: offline-first, escritorio, web futura y espacios de trabajo.
- [x] Confirmación de licencia AGPL-3.0.
- [ ] Completar evaluación **reproducible** de Hew / IngeTrazo / geometría CAD y licencias transitivas.
- [ ] Acordar ADR de motor elegido después de prueba de concepto.
- [x] Pipeline CI básico de tests/build en rama de prototipo (PR #1); falta comprobación manual y arquitectura monorepo definitiva.
**Salida:** documentación y licencia publicadas, candidatos documentados; sin afirmar que exista aplicación.

## Estado de implementación experimental
- [x] Código en PR #1 para importar GLB, escena compartida, edición por transformaciones y material básico.
- [x] CI (Linux GitHub Actions): pruebas unitarias de dominio y build Vite han pasado en el commit de implementación inicial.
- [ ] Validar apertura y guardado con archivos GLB reales (incluyendo materiales/texturas), prueba manual offline.
- [ ] Pruebas de escritorio Linux y Windows; definición del shell Tauri.
- [ ] Auditoría de dependencias transitivas/lockfile y licencia en distribución.

## M1: primera escena
- [ ] Ventana desktop y menú con Modelado/Render.
- [ ] Cargar GLB, renderizar jerarquía en visor.
- [ ] Seleccionar objetos y mostrar inspector.
- [ ] Identificadores estables y API de comandos.
**Salida:** grabación/test reproducible de importación y selección; smoke tests Linux/Windows.

## M2: la demostración del producto
- [ ] Transformar objeto con undo/redo.
- [ ] Material básico y luz/entorno compartidos.
- [ ] Guardado nativo local con versión de schema y recuperación.
- [ ] Cambiar workspace sin reimportar, guardar offline, reabrir íntegro.
- [ ] Pruebas FR-001..008, NFR-001, NFR-004.
**Salida:** prueba de extremo a extremo AC-MVP-01/02/03 en dos sistemas.

## M3: CAD/arquitectura
**Primer incremento en revisión:** líneas, polilíneas, rectángulos, capas, snap, coordenadas métricas y conversión explícita a muros enlazados; ver [CAD_2D_MVP](CAD_2D_MVP.md). No confundir estas herramientas iniciales con AutoCAD completo, planos constructivos listos ni BIM.
- [ ] Sketch 2D: líneas, polilíneas, arco, snap, capas.
- [ ] Reglas de unidades, tolerancias y cotas.
- [ ] Decisión de motor paramétrico y entidades semánticas.
- [ ] Vistas derivadas donde haya semántica suficiente (NO proyección bidireccional mágica).
**Salida:** plano de una habitación con cotas y muros 3D verificables.

## M4: Render
- [ ] Exportar escena a adaptador compatible y renderizar localmente.
- [ ] PBR, HDRI, sol, luces, cámaras y presets reproducibles.
- [ ] Cuantificar consumo VRAM/tiempo/calidad por GPU.
**Salida:** PNG final reproducible, sin internet, con assets correctamente atribuidos.

## M5: IA/bibliotecas
- [ ] Arrastrar referencia y preservar procedencia/permisos.
- [ ] Pipeline imagen→GLB local si hardware lo permite, remoto solo con consentimiento.
- [ ] Validar malla, escala, UV/materiales y licencia antes de agregar a biblioteca.
**Salida:** sofá generado, revisado, escalado y reutilizado en segundo proyecto.

## M6: Navegador
- [ ] UI portable, persistencia con capacidades del navegador (OPFS/IndexedDB según soporte).
- [ ] Modo de render adaptable y opción remota consentida.
- [ ] Sincronización con conflictos explícitos, nunca sustitución silenciosa.
**Salida:** escenario de referencia abre en web compatible; límites publicados.

## Tabla de disciplina
- **Bloqueado:** requiere dependencia, ADR o test pendiente.
- **En progreso:** issue/PR y responsable identificado.
- **Validado:** build + test + evidencia + doc + plataformas especificadas.
- **Publicado:** changelog y distribución reproducible.

**Criterio de priorización:** robustez de proyecto local > integridad geométrica > interoperabilidad > experiencia de render > IA remota. El alcance se revisa con datos, no con listas de marketing.
