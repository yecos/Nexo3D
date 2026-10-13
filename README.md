# NEXO 3D

**CAD · Modelado · Render · IA — una aplicación abierta para diseñar, construir y visualizar espacios.**

[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0--only-blue.svg)](LICENSE)

> **Estado (2026-10-13): fase de diseño y documentación.** Este repositorio NO contiene todavía una aplicación instalable, un motor propio implementado ni un prototipo validado. Las tecnologías listadas son propuestas que requieren pruebas y auditorías.

## La idea
Una plataforma multiplataforma y **offline-first** con **cuatro espacios de trabajo sobre un único proyecto**:

| Espacio | Función |
| --- | --- |
| **CAD** | Plantas, cortes, capas, cotas, bloques, impresión y dibujo preciso 2D |
| **Modelado** | Volúmenes, empujar/tirar, objetos, componentes, mobiliario y geometría 3D |
| **Render** | PBR, HDRI, sol, luces, cámaras, recorridos y renders |
| **IA Studio** | Imágenes de referencia, imagen→3D, mejoras de malla, catalogación y automatización opcional |

El mismo objeto y sus propiedades permanecen sincronizados al cambiar de espacio de trabajo. La nube **no es requisito** para editar, guardar, abrir y visualizar proyectos.

## Principios no negociables
- **Libertad:** código fuente público bajo AGPL-3.0-only (consultar [LICENSE](LICENSE)); contribuciones y componentes externos mantienen avisos/licencias correspondientes.
- **Un único estado canónico:** los workspaces son vistas y herramientas de un modelo compartido, no editores desconectados.
- **Escritorio primero, web preparada:** Windows, Linux y macOS; evitar decisiones que bloqueen ejecución web futura.
- **Archivos locales y portables:** guardado recuperable, backups y migraciones de versión.
- **Interop realista:** glTF/GLB inicialmente; DXF/IFC/SKP según estudios y pruebas. No prometer compatibilidad total con DWG/SKP/D5.
- **Transparencia:** separar lo implementado, lo experimental y lo planificado; exigir pruebas y evidencia.

## Primera meta (MVP)
1. Importar un modelo GLB.
2. Mostrarlo y transformar al menos un objeto.
3. Alternar **Modelado ↔ Render** sin exportaciones.
4. Asignar un material PBR y una luz/entorno.
5. Guardar localmente el proyecto, cerrar, reabrir y recuperar su estado **sin internet**.
6. Validarlo al menos en Linux y Windows.

La capacidad CAD 2D y la generación IA llegarán de manera incremental; aún no se han implementado.

## Documentación
Empieza en el **[Índice de documentación](docs/README.md)** y continúa por:
- [Visión de producto](docs/PRODUCT_VISION.md)
- [Requisitos trazables](docs/REQUIREMENTS.md)
- [Arquitectura técnica](docs/ARCHITECTURE.md)
- [Hoja de ruta y criterios de salida](docs/ROADMAP.md)
- [Guía de desarrollo](docs/DEVELOPMENT.md)
- [Contribuir](CONTRIBUTING.md) · [Seguridad](SECURITY.md)

## Tecnología (candidatas, no integración realizada)
React/TypeScript y Tauri para interfaces de escritorio; Rust/WASM para componentes reutilizables; evaluar Hew e IngeTrazo para modelado; un visor web moderno para interacción; Blender/Cycles mediante adaptador separado para imágenes finales. **Ningún proyecto externo se ha incorporado todavía.**

## Contribuir y licencias
Consulta [CONTRIBUTING.md](CONTRIBUTING.md), [docs/LICENSING.md](docs/LICENSING.md) y [LICENSE](LICENSE). NEXO 3D es un proyecto independiente: no está afiliado con Autodesk, Trimble ni D5. Referencias a productos comerciales se usan solo para describir funcionalidades comparables.

---

### English summary
NEXO 3D is a planned free/open-source, offline-first, cross-platform architecture and visualization application with one shared scene and multiple workspaces (CAD, Modeling, Render, AI Studio). **Early design stage; no working release yet.** Source code is licensed under AGPL-3.0-only; third-party materials retain their licenses. Start at [docs/README.md](docs/README.md).
