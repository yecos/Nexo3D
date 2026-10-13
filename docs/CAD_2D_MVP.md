# CAD 2D → Muros 3D → Render — Primera integración

**Estado:** prototipo de implementación en la rama `feat/cad2d-linked-walls`, basado en `feat/mvp-local-glb-workspaces`. Está pendiente de comprobación manual con navegador en Windows y Linux. **No sustituye AutoCAD/SketchUp/D5; implementa la primera prueba de un flujo unificado.**

## Objetivo del flujo
1. **CAD 2D:** dibujar líneas, rectángulos y polilíneas a escala con rejilla, capas y coordenadas.
2. **Modelado 3D:** levantar trazos elegidos como muros y verlos en perspectiva junto con cubos o modelos GLB.
3. **Render:** ver exactamente esos muros (derivados del mismo proyecto), ajustar materiales básicos de objetos, luz y color ambiental.
4. **Regresar a CAD:** editar las coordenadas de un trazo con muro asociado; Modelado/Render generan nuevamente el muro. No hay exportación manual.

## Qué implementa el código
| Función | Estado del prototipo | Limitación |
| --- | --- | --- |
| Lienzo CAD 2D oscuro | Implementado en fuente | UI inspirada en CAD, no copia de AutoCAD |
| Línea / polilínea / rectángulo | Implementado en fuente | Sin arco, círculo, offset, trim ni booleans |
| Coordenadas numéricas X,Y (m) | Implementado en fuente | Dos valores por punto, separados por coma; usar punto decimal |
| Rejilla y snap de punto extremo | Implementado en fuente | Rejilla fija de 0,25 m; falta snap centro, perpendicular, intersección |
| Ortogonal (Shift) | Implementado en fuente | Bloqueo del último segmento a X/Y |
| Capas, visibilidad, capa activa | Implementado en fuente | No hay estándares de línea, impresión ni bloques |
| Etiquetas de longitud | Implementado en fuente | No son cotas CAD asociativas con estilos |
| Editar vértices por números | Implementado en fuente | Falta arrastrar vértices, trim, cotas y restricciones |
| Levantar muro (alto/espesor) | Implementado en fuente | Extrusión de segmentos; encuentros de muros sin limpieza topológica |
| Vincular muro al plano | Implementado en fuente | Mismo trazo + extrusión, no dos documentos |
| Guardar y reabrir | Implementado en fuente (schema v2) | Formato JSON temporal; falta backup/guardado atómico |
| Abrir archivos de la versión anterior | Migrador v1→v2 | La migración añade CAD vacío a proyectos viejos |
| Importar GLB al proyecto | Conservado de PR #1 | No transforma mallas importadas en entidades CAD semánticas |
| DWG/DXF/SKP/IFC | No implementado | Requieren adaptadores, licencias y pruebas de fidelidad |

## Prueba de aceptación manual (ejercicio de arquitectura)
**Primero dibujar, después levantar, finalmente renderizar.**

1. Iniciar servidor local de desarrollo:
   ```bash
   git clone https://github.com/yecos/Nexo3D.git
   cd Nexo3D
   git fetch origin
   git switch feat/cad2d-linked-walls
   npm install
   npm test
   npm run dev
   ```
2. Abrir el servidor local indicado por Vite (normalmente `http://127.0.0.1:5173`).
3. En CAD 2D, seleccionar **Rectángulo** (R). Introducir punto `0, 0`, y punto `4, 3` en el campo de coordenadas exactas; esto representa habitación 4×3 m.
4. Seleccionar el rectángulo. En el panel derecho usar **Altura 2.60 m**, **Espesor 0.15 m**, y pulsar **Levantar / actualizar muro**.
5. Pasar a **Modelado 3D** y comprobar que hay cuatro paños perimetrales sobre el plano. No habrá techo ni vanos: son prismas por segmento, no BIM.
6. Pasar a **Render** y mover iluminación principal. Los muros deben persistir.
7. Regresar a CAD, elegir la entidad, cambiar un vértice a un valor distinto; pasar a Modelado y comprobar la modificación derivada.
8. **Guardar**, descargar `.nexo3d.json` y abrir de nuevo. Confirmar el contorno CAD, las capas y los muros vinculados.
9. Desconectar internet con la app ya servida localmente y volver a editar/guardar. Si se usa Vite necesita seguir ejecutándose en la máquina; no hay instalador/PWA todavía.
10. Reabrir un archivo JSON antiguo (schema v1) creado por PR #1; debe migrar sin perder objetos GLB.

## Coordenadas y convenciones
- CAD trabaja en metros y ejes XY; Y positivo es arriba en plano.
- En la escena 3D: el plano CAD X,Y se interpreta como X,-Z.
- Altura vertical de los muros = Y de Three.js.
- Puntos con máximo 100 km de coordenada absoluta por validación de prototipo; no es una solución definitiva para georreferenciación.
- Las paredes son prismas por segmento centrados en la línea del dibujo. **No existe aún detección/limpieza de encuentros, carpinterías, puertas y ventanas.**

## Pruebas automáticas y criterios para PR
- `npm test` valida geometría de línea, perímetro, proyección 3D, snapping, serialización, migración v1 y rechazos de datos malformados.
- `npm run build` confirma que la UI compila; **no prueba interacción en navegador ni fidelidad visual**.
- Antes de fusionar: probar manualmente el ejercicio en al menos Windows y Linux, verificar no regresión GLB y observar FPS.
- Añadir fixture arquitectónico libre y evidencia visual de un plano→muro en un nuevo commit.

## Trabajo siguiente, sin saltarnos tu orden
CAD: selección avanzada, mover/cortar/offset, círculos/arcos, cotas asociativas, import DXF. Después: puertas/ventanas, operaciones push/pull, componentes. Finalmente: render con HDRI, PBR texturizado, Cycles y bibliotecas libres.

**Decisión de producto:** CAD primero, Modelado después, Render al final; ninguno obliga al usuario a exportar el proyecto entre pestañas.
