# Interoperabilidad y política de importación/exportación

**Estado:** soporte REAL se declarará solo tras implementarlo y probarlo. NEXO 3D no reproduce formatos propietarios de manera automática.

## Principio
El **formato nativo editable** es la fuente primaria. Los importadores convierten a entidades propias y **no necesariamente recuperan** cotas, restricciones, familias BIM ni materiales del programa de origen. Los exportadores producen archivos de intercambio, nunca la única versión del proyecto.

## Matriz objetivo
| Formato | Inicial | Dirección | Objetivo / cautela |
| --- | --- | --- | --- |
| **GLB/glTF** | M1 | Importar; exportar P1 | Escena, jerarquía, mallas, PBR; no BIM/CAD paramétrico garantizado |
| **OBJ** | Posterior | Import/export | Mallas estáticas; limitación materiales y jerarquía |
| **DXF** | M3 | Import/export 2D | Entidades, cotas y layers según subconjunto probado |
| **IFC** | Posterior | Import/export | BIM semántico vía librerías y schema compatibles |
| **SKP** | Investigación | Según licencia/implementación | Compatibilidad variable por versión; auditar reverse engineering independiente |
| **DWG** | Investigación | Según soporte legal/técnico | Formato complejo; no prometer paridad AutoCAD |
| **Archivos D5 nativos** | Fuera de alcance inicial | — | Sin compatibilidad garantizada ni ingeniería invasiva del ejecutable |

## Contrato de adaptador
`probe(file)` → mime/format/version; `import(file, options)` → objeto de escena temporal + warnings; `validate`; `commit` en transacción; `export(snapshot, options)` → archivo + reporte de pérdidas. Los datos de origen no deben ejecutarse como código.

**Reporte de pérdida obligatorio** cuando se pierdan entidades, restricciones, materiales, escala, luz, animaciones o metadatos. Nunca describir como "compatibilidad total" si se redujo a mesh.

## Controles
- Unidades explicitadas, ejes y handedness, normales, UV, materiales, triangulación y orientación.
- Límite de tamaño, memoria, texturas, profundidad de anidamiento y rutas relativas.
- Archivos rotos: error manejable, sin cambiar el documento actual.
- Fixtures con licencias compatibles y casos patológicos (mallas invertidas, jerarquías, mm/m, texturas faltantes).
- Importación no puede hacer fetching remoto silencioso de URLs incluidas en assets.

## Política de compatibilidad
Tabla pública de versiones soportadas por formato, riesgos conocidos, diffs visuales y pruebas. Considerar SKP/DWG como dependencia de bibliotecas/licencias/documentación disponibles y revisión legal antes de afirmar capacidad.
