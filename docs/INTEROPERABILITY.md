# Interoperabilidad y política de importación/exportación

**Estado a 2026-10-13:** primer prototipo en rama de desarrollo. **Importación GLB propuesta/implementada en código experimental, pendiente de pruebas E2E.** Todos los demás formatos **NO DISPONIBLES** todavía.

## Regla de oro
El formato nativo editable es la fuente primaria. Importar formatos externos **no garantiza** recuperar cotas, restricciones, familias BIM ni propiedades de render. Cada importador emite warnings de conversión/pérdida y soporta un subconjunto versionado verificable.

## Compatibilidad por etapas
| Formato | Intención | Estado actual | Biblioteca candidata / riesgo |
| --- | --- | --- | --- |
| **GLB (glTF binario)** | Importar primero, exportar después | **Prototipo experimental en rama** | Three.js/GLTFLoader. Solo 2.0, autocontenido, máx. 30 MB |
| **glTF (.gltf)** | Importar/exportar | Planificado | Recursos externos y rutas seguras |
| **OBJ/MTL** | Importar/exportar mallas | Planificado | Pérdida de jerarquías y materiales PBR |
| **DXF** | Import/export CAD 2D | M3 | LibreCAD/QCAD/implementación; cotas/capas por subconjunto |
| **SKP** | Import/export geometría y componentes | Investigación | OpenSKP/Hew: matriz por versión, licencia y round-trip |
| **DWG** | Import/export CAD con reportes | Investigación | LibreDWG; limitaciones de versiones/escritura/entidades |
| **FBX** | Intercambiar modelos | Investigación | Assimp u otro conversor licenciado; materiales y animación |
| **STEP/STP** | Sólidos CAD precisos | Investigación | Kernel B-Rep; no confundir con malla importada |
| **IFC** | Arquitectura BIM | Investigación | IfcOpenShell y entidades semánticas |
| **DAE/3DS/STL** | Importar/exportar según casos | Posterior | Pérdida posible de escala/materiales/animaciones |
| **USD/USDZ** | Intercambio de escenas | Posterior | SDK, licencia, tamaño y plataforma |
| **Formato nativo D5** | — | Fuera de alcance inicial | No garantizar lectura de proyectos propietarios |

## Contratos de importación
1. `probe` identifica versión, formato, tamaño y requisitos.
2. `parse` opera sobre archivo no confiable, sin acceso a internet por defecto.
3. `validate` comprueba estructuras, límites y referencias.
4. `convert` genera documento temporal con informe de pérdidas.
5. `commit` aplica cambios en transacción con deshacer.
6. `export` entrega archivo y metadatos, nunca reemplaza implícitamente el original.

## Pruebas de fidelidad por formato
| Familia | Debe verificarse |
| --- | --- |
| CAD DWG/DXF | Capas, unidades, arcos, polilíneas, bloques, textos, cotas, layouts |
| SKP | Caras, grupos, instancias, materiales, UV, transforms y versiones |
| Mallas GLB/OBJ/FBX | Orientación, escala, normales, UV, PBR, jerarquía y texturas |
| STEP | Caras y sólidos editables, tolerancias, booleanas, precisión |
| IFC | GUID, tipos, unidades, propiedades y clasificaciones |
| Render final | Luz, color, cámara y assets, reconociendo diferencias de motor |

**Regla:** no convertir silenciosamente un sólido o muro semántico en una malla y declarar "edición completa". Reportar qué propiedades se han perdido.

## Riesgos de seguridad y licencias
- Bloquear carga silenciosa de archivos/URLs remotos incrustados al importar.
- Límite de tamaño, triángulos, profundidad, texturas y consumo de memoria.
- No usar assets privados de empresas de software sin permiso.
- Revisar compatibilidad de licencias GPL/AGPL y excepciones de terceros antes de incluir kernels.
- SKP/DWG: validar versiones reales; no prometer leer formatos futuros ni compatibilidad perfecta.
