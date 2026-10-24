# NEXO BIM · Web MVP 0.1

**Primer incremento ejecutable, no un producto BIM terminado.** Editor de vivienda en navegador sin licencias ni dependencias de npm en tiempo de ejecución. Código fuente AGPL-3.0-only (igual que el repositorio padre).

## Ejecutar

Requiere Node.js 20+ (para el servidor de desarrollo y las pruebas).

```bash
cd apps/nexo-bim-web
npm run start
# Abrir http://127.0.0.1:4173
```

Tests:

```bash
npm run check
npm test
```

También se puede servir la carpeta con cualquier servidor HTTP estático. No utilizar `file://` para módulos ES. Sin servicios de pago ni claves API.

## Funcionalidades implementadas

- Planta 2D editable: herramienta Muro (dos clics), seleccionar, puerta y ventana.
- Rejilla de 0,25 m y dibujo ortogonal con Shift.
- Modelo 3D sincronizado, orbitable, con huecos geométricos para puertas y ventanas.
- Propiedades editables del muro: extremos, espesor, altura.
- Duplicación de niveles con IDs independientes y elevación acumulada.
- Longitud y volumen neto geométrico de muros (estimaciones, no presupuesto).
- Guardado local automático, JSON editable y carga validada (2 MB máximo).
- Deshacer cambios (60 pasos), exportación SVG de la planta e impresión PDF desde el navegador.
- Exportación GLB 2.0 para Blender/render, con un nodo por muro y geometría de los vanos.

## Límites conocidos (importantes)

- **No se exporta IFC todavía**: la información geométrica paramétrica vive en el JSON propio, y la exportación GLB se destina solo a visualización.
- Las losas de la vista 3D son envolventes rectangulares de referencia, **no losas BIM**; no deben utilizarse para cantidades.
- No existen todavía muros multicapa, unión limpia en intersecciones, restricciones paramétricas completas ni conexiones automáticas.
- SVG es una planta geométrica básica, no un juego de planos técnicos. El PDF proviene del cuadro de diálogo de impresión.
- El render 3D es una vista proyectada en Canvas 2D pensada para el MVP, no un motor WebGL de producción.
- No hay coordinación IFC/BCF, gestión multiusuario, servidor cloud ni IA conectada.
- Guardado en LocalStorage no sustituye un respaldo: descargar JSON de forma frecuente.
- No usar este prototipo para firmar planos, licencias, presupuesto o construcción.

## Arquitectura

- `src/model.js`: modelo canónico paramétrico validado, geometría y cantidades.
- `src/glb.js`: exportador GLB 2.0 sin dependencias externas.
- `src/app.js`: interfaz y herramientas de interacción.
- `styles.css` e `index.html`: interfaz premium adaptable.
- `server.mjs`: servidor localhost de desarrollo, sin acceso a la red externa.

### Próximo incremento

1. Modelo IFC4 con IfcOpenShell y pruebas de reimportación (round-trip).
2. Motor WebGL (Three.js o That Open) en lugar del render de Canvas 2D.
3. Herramientas de losa, puerta/ventana como entidades IFC y áreas fiables.
4. Coordinación IFC federado + BCF y extracción de vistas/dibujos.

El MVP vive en `apps/nexo-bim-web` para no alterar los prototipos existentes de CAD/Modelado/Render de otras ramas.
