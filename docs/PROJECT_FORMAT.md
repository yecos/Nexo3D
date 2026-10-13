# Documento y formato de proyecto — diseño inicial

**Estado:** propuesta de contrato. No hay extensión o esquema estabilizados. **GLB es intercambio, NO proyecto nativo completo.**

## Objetivos
1. Identidad estable para objetos y sus propiedades entre CAD, Modelado y Render.
2. Persistencia local y round-trip sin pérdida de materiales, luces, cámara y transformaciones.
3. Separar modelo editable, triangulación y assets; soportar actualizaciones de esquema.
4. Respetar metadatos y licencias de assets.
5. Evitar dependencia de servicios o proveedor del render.

## Entidades
| Entidad | Campos propuestos | Reglas |
| --- | --- | --- |
| Document | schemaVersion, projectId, units, createdAt, updatedAt | Versión imprescindible |
| Node | id, type, name, parentId, transform, visible, locked, layerId | UUID inmutable, grafo acíclico |
| Geometry | sourceType, reference, precision, bounds | `sketch`, `solid`, `mesh`; fuente editable preservada |
| Component | definitionId, instances, overrides | Instancia separada de definición |
| Layer | id, name, order, visibility | Referencias consistentes |
| Material | id, baseColor, metallic, roughness, textures | Convenciones PBR declaradas |
| Light/Environment | type, intensity, units, color, hdriRef | Unidades/calibración explícitas |
| Camera | projection, transform, exposure, clipping | Guardar parámetros, no solo imagen |
| Asset | sha256, mediaType, size, source, license, author | Trazabilidad y deduplicación |
| CAD View | plane, scale, visibility, annotations | Cotación separada de geometría |
| Operation | id, timestamp, action, affectedIds, before/after | Diseñar con undo, recuperación y futura sync |

## Unidad, precisión y ejes
**Propuesta** (validar con fixtures antes de fijar): unidades internas en **metros**, posiciones en double precision; coordenadas locales por objeto para proyectos grandes. Vistas permiten mm, cm, m, pulgadas y pies. Sistema interno Z-up; adaptador glTF realiza conversión de ejes cuando corresponda. No se debe inferir escala en importaciones ambiguas sin advertir.

Las tolerancias de snaps y booleanas NO deben convertirse en una constante global sin relación con escala; defínelas por operación/dimensión y pruébalas (milímetros ↔ edificios).

## Estructura de archivo
Evaluar contenedor ZIP o carpeta empaquetada **solo después** de PoC. Diseño orientativo:
```text
project.nexo3d  (nombre/extensión provisional)
  manifest.json                 # versión, proyecto y checksums
  scene/document.json           # nodos, propiedades, metadatos
  geometry/                     # representaciones editables serializadas
  assets/<sha256>.<extension>    # imágenes, meshes, HDRI y referencias legales
  previews/thumbnail.webp       # derivado opcional, nunca fuente canónica
  backups/                      # opcional y preferentemente externo al paquete
```
**Importante:** no se ha adoptado aún un tipo MIME, compresión ni extensión pública; no generar archivos "compatibles" de forma ficticia.

## Ejemplo conceptual (NO esquema definitivo)
```json
{
  "schemaVersion": "0.1-draft",
  "projectId": "uuid-project",
  "units": {"length": "m", "display": "mm"},
  "nodes": [
    {
      "id": "uuid-sofa",
      "type": "mesh",
      "name": "Sofá",
      "parentId": null,
      "transform": {"translation": [1.0, 0.0, 0.0], "rotation": [0, 0, 0, 1], "scale": [1, 1, 1]},
      "geometryRef": "asset:sha256-...",
      "materialIds": ["mat-lino"]
    }
  ],
  "materials": [{"id": "mat-lino", "baseColor": [0.8, 0.75, 0.68, 1], "metallic": 0, "roughness": 0.85}],
  "cameras": [], "lights": [], "assets": []
}
```
Separar meshes importadas de geometría CAD regenerable. Un asset GLB no se vuelve paramétrico solo por contener polígonos.

## Guardado y recuperación
- Snapshot serializable con `schemaVersion`, hash de archivos y operación de reemplazo segura.
- Verificación postlectura de estructura e integridad; errores sin perder sesión actual.
- Diario local/autosave separado del guardado explícito; recuperación tras caída, sin sobrescribir último archivo bueno.
- Política de recursos faltantes, rutas relativas/absolutas y links externos.
- Migradores de versión con ida desde `n-1`; backups al migrar; fixtures legados inmutables.
- Nunca almacenar secretos de servicios ni credenciales dentro del proyecto.

## Historias para pruebas
1. GLB con jerarquía y transformaciones no triviales → guardar/reabrir → comparar ID, bounding boxes y transformaciones.
2. Textura PBR, HDRI y luz → guardar/reabrir offline → mismo estado declarativo.
3. Apagar proceso entre escritura temporal y commit → original legible y recuperación disponible.
4. Cargar versión antigua → migración reversible mediante backup.
5. Dos archivos con mismo hash → reutilización de asset sin pérdida de atribución.

## Decisiones pendientes
Extensión definitiva, serialización binaria/json, precisión y sistema de ejes, resolución de referencias, control de cambios y compatibilidad futura para colaboración. Cada decisión exige ADR + pruebas.
