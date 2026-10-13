# Hew como base experimental del modelador de NEXO 3D

**Estado:** adaptación funcional de formato/operaciones en la rama `feat/hew-foundation-adapter`. El CI determinará qué escenarios se han validado realmente. **No se ha sustituido el visor Three.js por Hew ni construido un instalador Tauri.**

## Qué cambia realmente

- El **documento de origen** sigue siendo `.nexo3d.json` (schema 2), guardado desde el CAD 2D que ya existe en el prototipo.
- `src/hew-adapter.js` convierte cada segmento levantado visible en operaciones API nativas de Hew: `hew.sketch.draw_rect`, `hew.solid.extrude`, `hew.entity.rotate`, `hew.entity.move` y `hew.entity.rename`.
- **Hew** construye la geometría sólida y guarda un `.hew` real, además de exportar GLB y SKP 2017.
- **Blender** es un ejecutable externo opcional; importa el GLB y genera un PNG Cycles de prueba.
- `source-manifest.json` mapea cada `cadShapeId` a los `hewObjectId` generados, unidad, longitud, alto, espesor y advertencias.
- Un único comando de terminal automatiza la transferencia. No exige arrastrar/exportar intermedios a mano. Este puente todavía **no es interactivo ni bidireccional**.

## Reproducir el prototipo localmente

Requisitos: Node.js 22, Rust 1.97.1, una compilación local oficial de Hew CLI. Para obtener un PNG también Blender con Cycles.

### Preparar Hew **sin copiar su código dentro de NEXO**

```bash
git clone https://github.com/hew3d/hew.git hew-upstream
cd hew-upstream
git checkout f36661fb726253e501ef26a4d5fff3cc6381d814
cargo build --locked -p hew-cli
```

El ejecutable suele quedar en `hew-upstream/target/debug/hew-cli` (Windows: `.exe`).

### Proyecto NEXO de 4 × 3 m

```bash
cd Nexo3D
git fetch origin
git switch feat/hew-foundation-adapter
npm install
npm test
# Ajusta /ruta/... a donde realmente hayas compilado Hew.
node scripts/build-with-hew.mjs \
  examples/room-4x3.nexo3d.json \
  artifacts \
  /ruta/hew-upstream/target/debug/hew-cli
```

Para añadir el render automáticamente:

```bash
node scripts/build-with-hew.mjs \
  examples/room-4x3.nexo3d.json \
  artifacts \
  /ruta/hew-upstream/target/debug/hew-cli \
  /usr/bin/blender
```

En Windows, indicar las rutas absolutas de `hew-cli.exe` y `blender.exe` como argumentos, entre comillas. **No ejecutar desde un directorio diferente de la raíz del repositorio**, porque el script busca su adaptador de render relativo a `scripts/`.

## Archivos generados

| Archivo | Qué representa |
| --- | --- |
| `cad-to-hew.json` | Comandos JSON-RPC reproducibles, útiles para depurar operaciones |
| `scene.hew` | Documento editable en Hew; **no incorpora aún geometría CAD semántica completa** |
| `scene.glb` | Malla de salida para visualización/Blender |
| `scene.skp` | Salida SKP 2017 de Hew; **abrirlo en SketchUp sigue pendiente** |
| `source-manifest.json` | Relación CAD original → objetos generados en Hew |
| `hew-api.jsonl` | Respuestas de Hew (evidencia, IDs y errores) |
| `scene-cycles.png` | Render Cycles de prueba, solo si se especifica Blender |

**Validez:** el CI valida schema, IDs, mallas GLB y cabeceras PNG cuando corresponde. No es prueba de fidelidad visual ni de compatibilidad SKP completa.

## Sistema de coordenadas

- En NEXO CAD: X/Y positivos sobre el plano en **metros**.
- En Hew: X horizontal, Y lateral invertido respecto al plano NEXO, y **Z vertical**.
- Para cada segmento, el adaptador dibuja un rectángulo local de longitud exacta, lo extruye sobre Z, lo rota y traslada a la posición correspondiente.
- Los encuentros de muros son superposiciones de sólidos; **todavía no hay unión/limpieza topológica ni puertas/ventanas paramétricas**.
- Cada ejecución crea una escena Hew derivada **nueva**; editar la geometría dentro de Hew no escribe de vuelta en el CAD NEXO todavía.

## Se conserva y se omite

| Datos NEXO | Resultado |
| --- | --- |
| Trazos con `extrusion` y capas visibles | Se convierten a geometría sólida Hew |
| Línea, polilínea, rectángulo | Uno o varios paños extruidos independientes |
| ID del trazo, capa, nombre y dimensiones | Manifest de correspondencias |
| Capas ocultas | No se convierten, salvo opción programática `includeHidden` |
| Trazos sin extrusión | No se convierten; advertencia explícita |
| GLB adjuntos, volúmenes de prueba, materiales y render settings | No exportados todavía; el manifest explica la omisión |
| DWG/DXF/IFC y topología de planos | No implementados en este adaptador |

## Licencias y seguridad

- [Hew](https://github.com/hew3d/hew) se usa como programa **externo, sin copiar fuentes** al repositorio. Hew: AGPL-3.0-only + excepción de plugins; mantener copyright/avisos al redistribuir.
- [Blender](https://github.com/blender/blender) se ejecuta como proceso aparte bajo su licencia GPL; no se incrusta en el paquete NEXO.
- Se pasan argumentos explícitos a los ejecutables, no se ejecutan comandos shell extraídos del JSON del proyecto.
- Se validan datos CAD con el mismo schema usado en la aplicación. Se limitan tamaños y cantidades; scripts nativos aún requieren sandbox de procesos para futuros archivos no confiables.
- La CLI crea nuevos archivos en el directorio de salida elegido. **No apuntar al directorio de un proyecto importante existente sin copia de seguridad**, porque se sobrescriben archivos con los nombres esperados.
- Los builds CI utilizan el SHA `f36661fb726253e501ef26a4d5fff3cc6381d814` para evitar cambios silenciosos de upstream.

## Qué falta para llamar a Hew «base del programa»

1. Integrar Hew **en el editor interactivo**, usando su API real o el kernel WASM, sin el visor de prueba como fuente paralela de geometría.
2. Acoplar la edición CAD de NEXO a un sistema de **comandos transaccionales/reconciliación** (cotas, muros semánticos, IDs y undo).
3. Adaptar las interfaces profesionalmente: CAD tipo AutoCAD, modelado directo tipo SketchUp, render de arquitectura tipo D5.
4. Empaquetar Windows/Linux/macOS y validar la misma geometría en browser WASM.
5. Ejecutar pruebas con DXF/DWG y SKP reales, licencias/NOTICE y fotografías de resultados.

**Criterio de producto:** Hew es la **base experimental de sólidos**, no una garantía de que la app unificada ya esté terminada. Mantener el CAD como fuente de verdad hasta definir la edición bidireccional.
