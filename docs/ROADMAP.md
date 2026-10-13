# Hoja de ruta basada en evidencias

**Estado a 2026-10-13:** especificaciones en `main`, código experimental en PR #1 y PR #2, y [auditoría de reutilización OSS](audits/2026-10-13-oss-reuse-audit.md) realizada sobre fuentes. **No hay ejecutable estable ni base final escogida**. El siguiente hito es compilar y ensayar upstream antes de inventar más herramientas.

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
- [x] Inspección documental inicial de Hew / IngeCAD / IngeTrazo / QCAD / LibreCAD / Blender, con SHAs, licencias y puntos de integración.
- [ ] Completar evaluación **ejecutable y reproducible** en hardware real; pruebas de licencias transitivas, DWG/SKP y Blender; ver [plan de PoC](spikes/FOUNDATION_POC_PLAN.md).
- [ ] Acordar ADR de motor elegido después de prueba de concepto.
- [ ] Crear configuración monorepo y pipeline CI mínimo; comandos se añadirán cuando exista código.
**Salida:** documentación y licencia publicadas, candidatos documentados; sin afirmar que exista aplicación.

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
