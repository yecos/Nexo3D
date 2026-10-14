# NEXO 3D · CAD → Modelado → Render (Windows experimental)

**No sustituye NEXO estable.** Conserva los ejecutables originales de IngeCAD e IngeTrazo en procesos independientes, alojados dentro de una ventana Qt con tres pestañas. Aún necesita validación en un PC Windows real.

## Qué implementa NEXO Bridge

- **CAD → Modelado (tras guardar):** la extensión opcional de IngeTrazo revisa cambios del archivo DXF, valida unidades y sustituye solamente los grupos CAD enlazados como referencia bloqueada. Los sólidos y grupos modelados a mano no se eliminan. El plano es una referencia para dibujar o calcar y posteriormente extruir; no se reconstruyen los sólidos automáticamente al mover una línea.
- **Modelado → Render:** tras cada edición, la extensión espera brevemente y exporta GLB en una ruta temporal mediante reemplazo atómico. NEXO Bridge detecta revisiones validadas por SHA-256 y un visor Three.js en la pestaña Render recarga el GLB sin exportación manual.
- **No es bidireccional:** todavía no convierte sólidos 3D de regreso a CAD, ni usa un documento geométrico canónico compartido. IngeCAD guarda DWG/DXF e IngeTrazo guarda IGZ por separado.
- La pestaña Render es una **previsualización 3D de materiales y luz**, todavía no un render fotorrealista definitivo.
- Servidor solo de lectura en 127.0.0.1, que publica exclusivamente estado, previsualización GLB y recursos web; no expone documentos CAD.

## Instrucciones para probar

1. Descarga el artefacto **NEXO-Bridge-CAD-Modelado-Render-Windows-PoC** de una ejecución exitosa del [workflow Windows](../../.github/workflows/native-cad-modeling-poc.yml). Instala por separado [IngeCAD](https://github.com/ingelibre/ingecad/releases) e [IngeTrazo](https://github.com/ingelibre/ingetrazo/releases).
2. Abre NEXO: autodetecta las instalaciones habituales de IngeCAD e IngeTrazo, guarda sus rutas y abre ambos editores al iniciar. Si una instalación está en otra carpeta, usa los botones **IngeCAD.exe** o **IngeTrazo.exe** como respaldo. NEXO valida el ejecutable dueño de cada ventana y no lanza duplicados. Pulsa **Instalar extensión NEXO**. La acción explícita guarda un único archivo en %APPDATA%/ingetrazo/plugins; nunca sobrescribe una extensión modificada por el usuario.
3. Pulsa **Abrir DWG / DXF** y elige un **DXF con unidades definidas**. Si trabajas con DWG, abre el DWG en CAD, guarda una copia DXF y selecciónala desde NEXO para el vínculo automático. El puente no convierte DWG en vivo.
4. En CAD dibuja y **guarda en ese mismo DXF**. En Modelado abre IngeTrazo desde NEXO: con la extensión instalada, comienza en blanco y carga la referencia CAD. Traza o copia geometría independiente para crear caras y usar Push/Pull.
5. **Guarda tu documento IGZ desde IngeTrazo**. La pestaña **Render Live** muestra el modelo GLB y se actualiza al editar geometría y materiales.
6. Antes de cambiar a otro plano, guarda tu IGZ y cierra IngeTrazo manualmente. La ruta DXF queda fijada al inicio del proceso para evitar cambiar referencias a mitad de una edición.

La extensión se activa únicamente cuando NEXO lanza IngeTrazo con NEXO_BRIDGE_GLB. Sin extensión instalada, IngeTrazo abre normalmente, con importaciones manuales. NEXO no modifica ni sobrescribe archivos IGZ. El visor Render integrado usa QtWebEngine cuando está disponible y ofrece abrir el visor en el navegador como alternativa.

## Revisión de cambios por capas (experimental)

El botón **Cambios CAD** compara el DXF guardado contra la versión anterior
detectada dentro de la misma sesión de NEXO. Muestra capas nuevas, eliminadas
y modificadas. La lectura se realiza en un hilo independiente y no escribe en
el dibujo ni en el modelo 3D. Incluye las coordenadas de líneas, atributos
geométricos comunes y vértices de polilíneas al comparar; ignora cambios de
handles CAD para evitar falsos positivos al volver a guardar.

La primera lectura establece la referencia: para comparar dos cambios,
guarda el plano y luego edítalo y vuelve a guardar. El informe **NO indica
que NEXO haya movido automáticamente los muros 3D**. Son referencias CAD
actualizables y el reporte avisa dónde hay modificaciones que revisar.

Limitaciones: DXF únicamente, no DWG directo; las entidades DXF especiales
o personalizadas (por ejemplo detalles interiores de algunas tramas HATCH
o definiciones de bloques) pueden requerir una revisión visual. En desarrollo
local, además de PySide6, instalar la biblioteca ezdxf. En el ejecutable
Windows esta dependencia se empaqueta con NEXO.

## Validación técnica

Pruebas Python: python -m unittest discover -s experiments/qt-unified-shell -p "test_*.py" -v

Compilar visor offline: npm install && npx vite build --config experiments/qt-unified-shell/vite.render.config.mjs

Ejecutar desde fuente en Windows: instalar PySide6==6.9.3 y ejecutar python experiments/qt-unified-shell/nexo_shell.py; la carpeta dist-render tiene que estar compilada.

**Aún pendiente de probar físicamente:** alojamiento Win32 con OpenGL, foco, menús, DPI, carga de la extensión en IngeTrazo y previsualización WebEngine real. El sistema todavía no está validado para proyectos productivos. La API de plugins de IngeTrazo está en evolución (versiones 0.x).

**Licencias:** NEXO usa AGPL-3.0-only. Antes de redistribuir binarios o código combinado, revisar licencias y atribuciones de IngeCAD e IngeTrazo. Estos ejecutables de terceros no van empaquetados con NEXO.

La [PR #14](https://github.com/yecos/Nexo3D/pull/14) sigue siendo el prototipo anterior solo de alojamiento nativo y pase manual de DXF.
