# Arquitectura de render y calidad visual

**Estado:** propuesta. **No hay renderizador integrado**. Objetivo: experiencia visual arquitectónica comparable en funciones, sin copiar código/recursos de D5.

## Dos niveles separados
1. **Viewport interactivo**: navegar, ver materiales, luces y selección con baja latencia.
2. **Render final**: imagen/video de alta calidad, con parámetros explícitos y control de colas/proceso.

Ambos consumen el **mismo snapshot canónico**. Cambios de shader, motor o GPU nunca deben redefinir la geometría del documento.

## Plan progresivo
| Nivel | Alcance | Candidato (sin adoptar) | Evidencia |
| --- | --- | --- | --- |
| R0 | PBR básico + direccional/ambiente + cámara en vista | Three.js/WebGL como baseline | GLB cargado + material y luz |
| R1 | HDRI, sombras, AO, tone mapping y calidad escalable | WebGL/WebGPU según soporte | capturas y métricas |
| R2 | Render local físicamente basado y PNG | Adaptador de Blender/Cycles | render offline reproducible |
| R3 | GI/RTX interactivo avanzado | evaluar Falcor/O3DE u otros, costo de integración alto | benchmark comparativo |
| R4 | animación, vegetación, recorridos | módulos nuevos | pruebas por función |

## Contrato del adaptador de render final
**Entrada:** versión de schema; snapshot inmutable; lista de assets/sha; cámara; configuración de luces, entorno, muestras, resolución, passes y semilla. **Salida:** imagen(es), tiempo, hash, avisos, metadata de motor y errores. **Sin** escritura en el documento salvo importación explícita de resultados.

```text
ProjectRevision → SceneExportAdapter → RenderJobSpec
  → LocalRendererProcess (aislado, sin shell arbitrario)
  → artifacts/png + logs + métricas → Render UI
```
- Validar rutas y argumentos del proceso; tiempo/memoria máximos; cancelación segura.
- Pasar assets mediante directorio temporal controlado.
- Guardar preset y motor/versión para reproducibilidad razonable.

## Materiales e iluminación
- PBR metal/rough; baseColor, normal, ORM, displacement como evolución.
- Texturas color sRGB; mapas de datos en espacio lineal; UV y tangentes explícitos.
- Luces: intensidad y unidades definidas; no usar escalas arbitrarias sin conversión.
- HDRI: distribución y licencia de imagen. Sol/cielo físico como módulo independiente.
- Exposición, white balance, tone mapping y color management declarados por backend.
- Diferencias entre viewport y Cycles deben documentarse; WYSIWYG perfecto no se garantiza.

## GPU y calidad
Equipos objetivo iniciales: GPU NVIDIA RTX 3060 12 GB y portátil RTX 4060, con pruebas reales pendientes. La memoria de GPU limita escena/texturas y escalado; la RTX 4060 portátil varía según configuración. Perfil de benchmark registra GPU, driver, OS, resolución, tamaño de escena, VRAM y tiempo.

**Fallback**: si no hay GPU compatible, permitir edición con render interactivo degradado; render CPU opcional si el backend lo soporta. Navegador usa capacidades detectadas; no asumir DLSS/OptiX disponible dentro del browser.

## Proyectos de terceros
- Blender/Cycles: evaluar ejecución como software externo GPL, empaquetado y avisos.
- NVIDIA Falcor: candidato para investigación de render, no producto final listo para conectar.
- Assets de vegetación, HDRIs, fotos de referencia y texturas deben tener licencia específica y metadatos.
- D5/SketchUp/AutoCAD: no copiar ejecutables, librerías, shaders propietarios ni assets; estudiar comportamiento de forma independiente.

## Tests de render
R-01 snapshot equivalente local→pérdida cero de transforms.
R-02 cámara produce archivo válido de dimensiones correctas.
R-03 textura y normal mapeada, color space validado.
R-04 HDRI ausente/error no pierde sesión.
R-05 cancelación y timeout dejan proceso limpiado.
R-06 render offline (red desactivada) sobre fixture mínimo.
R-07 prueba de rendimiento con scene set público y licencia compatible.
