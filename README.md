# NEXO 3D

**Open-source architecture, interior design and visualization — offline first.**

**Estado / Status:** etapa inicial de arquitectura. Aún no existe una aplicación instalable.

NEXO 3D busca reunir un único proyecto y varias áreas de trabajo, con las herramientas adecuadas para cada fase del diseño:

- **CAD:** plantas, capas, cotas y documentación 2D.
- **Modelado:** geometría 3D, componentes y mobiliario.
- **Render:** materiales PBR, HDRI, iluminación, cámaras y visualización.
- **IA Studio:** referencias e imagen-a-3D, con ejecución local o nube opcional.

## Principios

1. **Funciona sin internet:** la creación, edición y apertura de proyectos deben funcionar de manera local. La nube es opcional.
2. **Multiplataforma:** Windows, Linux y macOS; pensado también para la web.
3. **Un proyecto, distintos espacios de trabajo:** los cambios en geometría y propiedades son compartidos.
4. **Código abierto:** desarrollo público y transparente, con respeto a licencias y atribuciones.
5. **Arquitectura modular:** cada motor se integra a través de interfaces documentadas, sin depender de formatos propietarios como fuente primaria de datos.

## Primera meta verificable (MVP)

Importar una escena GLB, mostrarla en el editor, cambiar entre vistas Modelado y Render sin exportar, aplicar un material PBR y una luz/HDRI, guardar localmente y volver a abrir el proyecto.

**No intentaremos reproducir íntegramente AutoCAD, SketchUp o D5 en la primera versión.**

## Diseño técnico

Consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para la arquitectura propuesta y [docs/ROADMAP.md](docs/ROADMAP.md) para etapas y criterios de aceptación.

> La selección de componentes externos (Hew, IngeTrazo, FreeCAD/LibreCAD, Blender, etc.) es aún exploratoria. No se ha incorporado código de esos proyectos y antes se auditarán las licencias.

## Licencia

**Pendiente de decisión y revisión de compatibilidad.** Que un repositorio sea público no concede automáticamente permiso legal para reutilizar su código. Antes de publicar código utilizable se incorporará una licencia libre explícita (se evaluará AGPL-3.0).

---

## English

NEXO 3D is an early-stage, public, offline-first, cross-platform architecture/design project with shared CAD, modeling, rendering and AI workspaces. The optional cloud should not be required for ordinary project editing. **No runnable application has been published yet; the open-source license is pending final selection.**
