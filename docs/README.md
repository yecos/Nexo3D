# NEXO 3D — Centro de documentación

**Versión de documentación:** 0.1 · **Fecha:** 2026-10-13 · **Estado:** especificación preliminar, no implementación.

> **Convención de estados:** **DECIDIDO** (regla de producto), **PROPUESTO** (arquitectura pendiente de prototipo), **EN EVALUACIÓN** (dependencia/decisión por validar), **IMPLEMENTADO** (solo con código y prueba verificable).

## Leer en este orden
| Orden | Documento | Para qué sirve |
| --- | --- | --- |
| 1 | [Visión](PRODUCT_VISION.md) | Problema, usuarios, casos de uso, límites |
| 2 | [Requisitos](REQUIREMENTS.md) | Qué debe hacer, prioridad, criterios de aceptación |
| 3 | [Arquitectura](ARCHITECTURE.md) | Cómo interactúan editor, escena, motor y servicios |
| 4 | [Modelo/archivo](PROJECT_FORMAT.md) | Identidades, unidades, persistencia y versión de proyecto |
| 5 | [Espacios de trabajo](WORKSPACES.md) | CAD, Modelado, Render, IA Studio |
| 6 | [Render](RENDERING.md) | Vista interactiva, renders finales, GPU y fallback |
| 7 | [IA](AI_STUDIO.md) | Imagen a 3D, revisión humana y ejecución local/nube |
| 8 | [Offline y nube](OFFLINE_FIRST.md) | Almacenamiento local, privacidad y futura sincronización |
| 9 | [Interoperabilidad](INTEROPERABILITY.md) | Formatos y reglas de fidelidad |
| 10 | [Evaluación de motores](ENGINE_EVALUATION.md) | Cómo elegir tecnología sin casarnos prematuramente |
| 11 | [Roadmap](ROADMAP.md) | Fases y entregables con salida objetiva |
| 12 | [Estrategia de pruebas](TEST_STRATEGY.md) | Requisitos ↔ pruebas ↔ evidencia |
| 13 | [Desarrollo](DEVELOPMENT.md) | Organización, convenciones y proceso de bootstrap |
| 14 | [Licencias](LICENSING.md) | AGPL, terceros, activos y marcas |
| 15 | [Bitácora de decisiones](adr/README.md) | Por qué se tomó cada decisión |

## Documentación para colaborar
- [CONTRIBUTING](../CONTRIBUTING.md) — flujo de issues, ramas, PR, revisiones.
- [SECURITY](../SECURITY.md) — reporte responsable de vulnerabilidades.
- [Código de conducta](../CODE_OF_CONDUCT.md).

## Reglas para mantenerla viva
1. Cada característica nueva lleva un requisito con ID, escenario de aceptación y prueba correspondiente.
2. Cada decisión arquitectónica de alto impacto se documenta con un ADR.
3. Si una dependencia cambia, actualizar matriz de licencias, soporte de plataformas y plan de pruebas.
4. No describir como existente una función aún no implementada.
5. Cambios que afecten el modelo nativo requieren estrategia de migración.
6. En cada release registrar funciones realmente validadas, limitaciones conocidas y evidencia.

**Idioma principal:** español; nombres de APIs/estándares permanecen en inglés. Se invita a agregar traducciones con control de versiones.
