# NEXO BIM: reutilización de upstream + investigación REA

**Decisión de arquitectura — 2026-10-23**  
**Estado:** investigación y automatización reproducible, NO se ha importado ni adaptado todavía código de BIMROCKET.  
**Límite:** software 100 % abierto, destinado al navegador, entregables IFC/BCF/GLB/planos, sin dependencia de licencias comerciales.

## Qué cambia respecto al PR #18

El prototipo de muros JSON + geometría propia sirve como prueba de concepto, pero NO será el núcleo de un programa BIM profesional. No crear desde cero un motor CAD/CSG, visor IFC, exportadores generales, editor de sólidos ni servidor BCF cuando ya existen proyectos libres. Evitar fusionar ese prototipo al producto hasta decidir qué código se reutiliza y qué datos serán canónicos.

## Base principal a evaluar: BIMROCKET

Repo: https://github.com/bimrocket/bimrocket  
Commit fijado: `a1210cc9cabb099a7a36bbdc6ba5175ce47f396b` (rama `develop` en la fecha de esta decisión).

Razón: implementa una webapp modular JavaScript/Three.js, con herramientas geométricas CAD/CSG, transformación, gestión de objetos, importación/exportación IFC, GLB/OBJ/STL y funciones de análisis y colaboración (BCF, según su documentación). No supone que tenga ya toda la experiencia tipo Revit de modelado de arquitectura ni planos ejecutivos; todo se debe probar.

**Rutas inspeccionadas del código fuente:**

- `bimrocket-webapp/src/main/webapp/platform/core`: sólidos, perfiles, cordones y geometría.
- `bimrocket-webapp/src/main/webapp/platform/builders`: generadores y operaciones geométricas.
- `bimrocket-webapp/src/main/webapp/modules/design/module.js`: herramientas de dibujo, extrusión y transformación.
- `bimrocket-webapp/src/main/webapp/modules/bim/module.js`: importación IFC, inspección y servicio BCF.
- `bimrocket-webapp/src/main/webapp/platform/io`: importadores/exportadores; directorios `ifc`, `gltf`, `obj`, etc.
- `bimrocket-webapp/src/main/webapp/Environment.js`: activación de módulos y backend.
- `bimrocket-webapp/src/main/webapp/app.html`: import map para módulos ES y entrada del editor.

No portar automáticamente el motor a otro lenguaje. **JavaScript ya funciona en navegador**. Mantener el código reutilizable en JS donde aporte valor, crear nueva UI/servicios en TypeScript cuando lo necesitemos y separar la generación IFC profesional en un servicio Python con IfcOpenShell. Portar solamente las partes que realmente lo exijan, respaldadas por pruebas.

## Alternativas / piezas complementarias

| Sistema | Lenguaje/papel | Decisión |
| --- | --- | --- |
| BIMROCKET | JS/Three.js: motor de editor, IFC/GLB, módulos CAD/BIM | **Base inicial para evaluación/fork** |
| That Open Engine | TypeScript, MIT: visor IFC de alto rendimiento | Complemento solo si BIMROCKET falla en visualización/federación |
| web-ifc | C++/WASM, MPL-2.0: lectura/escritura IFC | Evaluar integración si hacen falta operaciones web |
| IfcOpenShell | C++/Python, LGPL: IFC autor, geometría, IFC Clash, dibujos | Servicio IFC y validación por round trip |
| Bonsai Studio | Python/Blender, GPL: referencia funcional de planos y autoría | Estudiar flujos/algoritmos; reutilizar conforme a licencia y límites técnicos |
| REA | Node/MCP, MIT: investigación basada en evidencia | **Auditar características concretas, NO motor de diseño** |

## Licencias y derechos

BIMROCKET declara alternativas **EUPL-1.1 o posterior / LGPL-3.0 o posterior** en `LICENSE.txt` (su archivo es la autoridad; confirmar licencia por archivo y dependencias). NEXO3D está publicado bajo AGPL-3.0-only; incorporar módulos LGPL/EUPL requiere verificación jurídica y técnica del modo de enlace, distribución, avisos, cambios en upstream y obligaciones de servicio web. Mantener marcas y atribuciones. **Nunca copiar código privativo de Revit, Archicad, Navisworks, etc.** REA puede estudiar comportamientos y formatos permitidos; en caso de herramientas privativas, implementar comportamiento original a partir de requisitos y APIs documentadas, no reproducir código protegido ni evadir controles.

## Cómo usar REA sin alterar equipos automáticamente

Prerrequisitos: Node.js versión admitida por REA (22.19+, 24.11+ o 26+), Git y REA oficial. El setup de REA modifica configuración MCP de tu agente y **requiere revisar y aprobar explícitamente el plan**.

Desde la raíz de Nexo3D, ejecutar primero comandos de plan que no escriben nada:

```bash
node scripts/rea-bim-audit.mjs plan
node scripts/rea-bim-audit.mjs prepare
node scripts/rea-bim-audit.mjs analyze
```

Con autorización para preparar un checkout **aislado**, hacer:

```bash
node scripts/rea-bim-audit.mjs prepare --run
```

Para instalar REA, consultar el repositorio oficial `morluto/rea` y el comando `npx rea-agents@latest setup`. Revisar y aprobar el plan propuesto y reiniciar el agente. Verificar con `rea doctor`. No es necesario instalar Ghidra para el análisis estático de JavaScript.

Con REA disponible en PATH, ejecutar el análisis en una ruta controlada:

```bash
node scripts/rea-bim-audit.mjs analyze --run
```

Esto genera evidencia en `.rea-lab/evidence/bimrocket-javascript-evidence.json`, con registro SHA256. La carpeta está ignorada por Git. El JSON puede ser muy grande y contener rutas locales, **no subir evidencias completas a GitHub ni compartirlas sin revisión**. La herramienta de análisis corre localmente; si los resultados se comparten con un agente de nube, aplican las políticas de datos del proveedor de ese agente.

## Plan de ingeniería inversa (una característica por vez)

1. **Modelado:** rastrear `modules/design/module.js` y herramientas de dibujo / extrusión. Entregar diagrama de llamadas, datos editables, casos y evidencia del código. Probar crear y editar un muro.
2. **Archivo IFC:** rastrear `modules/bim/module.js`, `IFCSTEPLoader`, `IFCSTEPExporter`, verificar importación y exportación IFC4. Comparar GUID, storeys y relaciones.
3. **Visualización:** estudiar `Application.js`, la escena, selección, cámara, cortes, shaders y el acoplamiento con propiedades IFC. Determinar si hace falta That Open.
4. **Planos:** verificar fuentes 2D, secciones e impresión PDF vectorial. Identificar lo que no existe y suplementar con IfcOpenShell/IfcDraw.
5. **Coordinación:** verificar capacidad de cargar varios IFC, BCF, y detección de choques (no asumir que BIMROCKET haga clash detection completo).
6. **Render:** confirmar exportación GLB, materiales PBR, jerarquía y cámaras. Abrir en Blender, guardar y reimportar en un motor de render.

Cada hallazgo llevará ruta, commit, evidencia, limitación, licencia y prueba reproducible. No presentar inferencias como funcionalidades verificadas.

## Arquitectura objetivo

```text
NEXO BIM (web, nuevo shell/UI)
    │
    ├── Núcleo del editor BIMROCKET (fork/licencia conservada)
    │     ├── Geometría CAD/CSG y herramientas de modelado
    │     ├── Visor Three.js y estructuras de escena
    │     ├── IFC / GLB / materiales
    │     └── Extensiones de arquitectura de vivienda (nuevas)
    │
    ├── Servicio openBIM Python (IfcOpenShell)
    │     ├── IFC4 + validación round-trip
    │     ├── Cantidades / tablas / plano SVG o PDF
    │     └── Clash detection IFC + BCF
    │
    ├── IA local (posterior): comandos validados, no edición sin aprobación
    └── Render NEXO3D: GLB con IDs y materiales
```

**Modelo de datos:** un IFC validado como intercambio profesional, más datos de edición paramétrica versionados cuando no puedan describirse completamente en IFC. Evitar transformar IFC en geometría anónima al exportar.

## Criterio para aprobar la base upstream

**No integrar al producto hasta completar:**

- Checkout reproducible de commit fijado, licencias y dependencias verificadas.
- Arranque del editor en navegador local.
- Creación y edición de un muro u objeto de diseño sin pérdida de información.
- IFC4 import/export: IDs, relaciones, unidades, niveles y geometría tras reimportar.
- Exportar GLB y abrirlo en Blender con objetos organizados.
- Crear vistas 2D/cortes sin perder escala.
- Auditoría REA documentada para al menos una característica del flujo.
- Cumplimiento de las licencias originales y seguridad de importación de archivos.

**Resultado esperado:** fork mínimamente adaptado de BIMROCKET + adaptadores propios, no clon visual ni reimplementación entera de software comercial.
