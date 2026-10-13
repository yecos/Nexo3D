# NEXO 3D — Centro de documentación

**Edición:** 0.1 · **Fecha:** 2026-10-13 · **Estado:** especificación preliminar, no implementación.

> **Convención de estados:** **DECIDIDO** (regla de producto), **PROPUESTO** (diseño sin PoC), **EN EVALUACIÓN** (tecnología por validar), **IMPLEMENTADO** (código probado y reproducible). Un enlace a repositorio ajeno no es una integración.

## Ruta de lectura sugerida
| Orden | Documento | Resultado |
| --- | --- | --- |
| 1 | [Visión](PRODUCT_VISION.md) | Problema, usuarios, límites, propósito |
| 2 | [Requisitos](REQUIREMENTS.md) | FR/NFR y escenarios de aceptación |
| 3 | [Arquitectura](ARCHITECTURE.md) | Modelo compartido y capas |
| 4 | [Formato de proyecto](PROJECT_FORMAT.md) | Identidades, unidades, schema, persistencia |
| 5 | [Espacios de trabajo](WORKSPACES.md) | CAD, Modelado, Render, IA Studio |
| 6 | [Render](RENDERING.md) | Preview, render final, GPU y fallbacks |
| 7 | [IA Studio](AI_STUDIO.md) | Imagen→3D, revisión y proveedores |
| 8 | [Offline-first](OFFLINE_FIRST.md) | Datos locales, privacidad, sync |
| 9 | [Interoperabilidad](INTEROPERABILITY.md) | GLB, DXF, IFC, SKP y fidelidad |
| 10 | [Evaluación de motores](ENGINE_EVALUATION.md) | Rúbrica Hew/IngeTrazo y demás |
| 11 | [Roadmap](ROADMAP.md) | M0–M6, criterios de salida |
| 12 | [Guía para construir MVP](MVP_IMPLEMENTATION.md) | Tickets técnicos en orden |
| 12a | [CAD 2D → 3D → Render](CAD_2D_MVP.md) | Prueba exacta de habitación 4×3 m y muro vinculado |
| 13 | [Estrategia de pruebas](TEST_STRATEGY.md) | Fixtures, tests, plataforma, evidencia |
| 14 | [Desarrollo](DEVELOPMENT.md) | Convenciones y primer bootstrap |
| 15 | [Licencias y activos](LICENSING.md) | AGPL, marcas, terceros y copyright |
| 16 | [Gobernanza](GOVERNANCE.md) | Decisiones, roles y releases |
| 17 | [Glosario](GLOSSARY.md) | Términos del proyecto |
| 18 | [ADR](adr/README.md) | Decisiones arquitectónicas y motivos |

## Para colaborar
- [Cómo contribuir](../CONTRIBUTING.md)
- [Código de conducta](../CODE_OF_CONDUCT.md)
- [Seguridad](../SECURITY.md)
- [Avisos de terceros](../THIRD_PARTY_NOTICES.md)
- [Plantilla de PR](../.github/PULL_REQUEST_TEMPLATE.md)

## Mantenimiento obligatorio
1. Toda característica con ID de requisito, test o escenario y evidencia.
2. Toda decisión de arquitectura de alto impacto con ADR.
3. Cada dependencia nueva con licencia, commit y requisitos de distribución.
4. Formatos y versiones nativas deben tener estrategia de migración.
5. No decir "funciona en macOS/web" sin build y test de esa plataforma.
6. Las revisiones de docs acompañan el cambio de código que describen.
7. Una release necesita changelog, matriz de funcionalidades probadas y límites conocidos.

**Idioma principal: español.** Se aceptan traducciones independientes sin cambiar API ni términos técnicos originales.
