# ADR-0003: Modelo único de escena editable

**Estado:** Aceptada como principio; schema aún PROPUESTO · 2026-10-13

**Contexto:** editar muro/cámara/material en una vista debe verse al instante en las demás sin reimportar. Un GLB es formato de intercambio, no representa necesariamente restricciones CAD, historial, cotas o entidades BIM.

**Decisión:** definir una fuente de verdad versionada con IDs estables para objetos, geometría editable, jerarquías, componentes, metadatos, materiales, luces y cámaras. Workspaces usan comandos transaccionales sobre ese estado. Render mantiene caches derivadas, no datos canónicos alternativos.

**Consecuencias:** más diseño de schema y migraciones; permite undo/redo, exportadores y vistas 2D/3D coherentes. Algunas proyecciones desde objetos no semánticos no podrán reconstruir BIM paramétrico automáticamente.

**Alternativas descartadas:** mantener archivo distinto por modo; usar GLB como proyecto maestro; persistir únicamente meshes para elementos semánticos.

**Validación:** FR-002, FR-006 y AC-MVP-01/02.
