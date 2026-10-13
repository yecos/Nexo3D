# Arquitectura propuesta — NEXO 3D

> Documento de diseño (no implementación). Las bibliotecas y dependencias son candidatas, no decisiones irreversibles.

## Visión

Una aplicación y un formato de proyecto unificado, con espacios de trabajo independientes en interfaz pero conectados al mismo estado.

```text
[CAD] [Modelado] [Render] [IA Studio]
                 |
          Estado del proyecto
                 |
      Núcleo geométrico y de escena
       /          |          \
   CAD 2D     Visor 3D     Gestor de assets
                 |
       Renderers y adaptadores
        (local / nube opcional)
```

## Objetivos técnicos

- **Desktop primero, web preparada**: UI React + TypeScript con Tauri como contenedor para Windows/Linux/macOS. Compilar módulos reutilizables a WebAssembly cuando sea viable.
- **Separación de responsabilidades**: geometría editable; representación de escena; datos arquitectónicos semánticos; materiales; luces; cámaras; vistas 2D.
- **Modelo común**: IDs persistentes para objetos; transformaciones, unidades, historial de cambios, referencias a recursos locales. Guardado atómico y recuperable.
- **Offline first**: proyectos, mallas, materiales y metadatos persisten localmente. Servicios de nube e IA son complementarios y no bloquean funciones básicas.
- **Render progresivo**: empezar con visor ligero y Blender Cycles como adaptador para renders finales; evaluar render interactivo avanzado más adelante.
- **Interoperabilidad**: comenzar por glTF/GLB; evaluar DXF, IFC y SKP con cautela. No asumir fidelidad completa de formatos propietarios.

## Propuesta de estructura

```text
apps/
  desktop/           # shell Tauri
  web/               # build futuro
packages/
  ui/                # workspaces y componentes
  scene/             # modelo compartido de escena/proyecto
  viewer/            # visualización interactiva
  io/                # importación y exportación
  plugin-api/         # contratos extensibles
services/
  render-local/      # adaptadores de Blender
  ai-optional/        # conexión local o nube
docs/
```

La estructura se creará solo a medida que aparezca código real.

## Integración de terceros

No copiar código ni recursos de aplicaciones propietarias. Antes de reutilizar proyectos libres, registrar licencia, versión, dependencias, avisos de copyright y obligaciones aplicables a distribución o acceso web. Evaluar Hew e IngeTrazo en pruebas aisladas; decidir luego si integrar, adaptar o implementar.

## Decisiones abiertas

1. Licencia final del proyecto (candidata AGPL-3.0, pendiente de confirmación).
2. Núcleo de modelado geométrico y restricciones CAD.
3. Formato editable nativo y versionado.
4. Backend de render en tiempo real para desktop/web.
