# NEXO 3D · Integración nativa IngeCAD / IngeTrazo (Windows)

**Prueba técnica, no nuevo NEXO estable.** Conserva la app Tauri existente; este proyecto compara una base Qt alternativa para CAD/Modelado. No afecta `main`, archivos del usuario ni versiones publicadas.

## Qué hace
- Una ventana NEXO con dos espacios, CAD 2D y Modelado 3D.
- Inicia los **ejecutables originales** de IngeCAD e IngeTrazo en procesos separados y aloja las ventanas mediante la API Win32 `SetParent`. Conserva barras, comandos CAD y herramientas de modelado existentes.
- Un dibujo elegido en NEXO abre en CAD, y el mismo DWG/DXF se importa en una nueva sesión de IngeTrazo (revisar escalas). **Guardar en CAD primero**. Un dibujo modificado en CAD no se sincroniza automáticamente con IngeTrazo.
- Al cerrar NEXO intenta devolver las ventanas al escritorio sin terminar los programas ni descartar cambios.

## Descarga de prueba
Workflow [NEXO native CAD + modeling PoC](../../.github/workflows/native-cad-modeling-poc.yml). En una ejecución exitosa, descargar el artifact `NEXO-Native-CAD-Modelado-Windows-PoC`, descomprimirlo y ejecutar `NEXO-CAD-Modelado-PoC.exe`. **Requiere los ejecutables de IngeCAD e IngeTrazo instalados por separado.**

- [IngeCAD releases](https://github.com/ingelibre/ingecad/releases/latest)
- [IngeTrazo releases](https://github.com/ingelibre/ingetrazo/releases/latest)

En la barra superior elegir las rutas de ambos `.exe`. Abrir un `.dxf` (recomendado inicialmente), CAD 2D, guardar y pulsar **Enviar plano a Modelado**. En IngeTrazo comprobar la importación, unidades, cierre de contornos y Push/Pull. No se modifica el archivo CAD original al extruir.

Alternativa para desarrollar en Windows (Python >= 3.11): `py -m pip install PySide6`, después `py nexo_shell.py`.

## Pruebas automáticas
`python -m unittest discover -s experiments/qt-unified-shell -p "test_*.py" -v`

Se prueban selección segura de archivos y argumentos; el empaquetado Windows es automático. **No hay todavía validación visual ni garantía de alojamiento OpenGL**: la GPU, políticas de DPI, diálogos y algunos ejecutables que arrancan procesos secundarios pueden impedir `SetParent` o bloquear el foco. Debe verificarse en PC real. Si falla, la alternativa es una integración Qt nativa de código fuente con módulos aislados, no una ventana externa reparentada.

## Límites
- Los documentos siguen independientes: IngeCAD administra DWG/DXF; IngeTrazo administra IGZ. No existe geometría canónica unificada ni ida y vuelta de sólidos al plano.
- Reabrir un mismo dibujo no sobrescribe una sesión de modelado abierta.
- Solo Windows: SetParent **no** es una solución multiplataforma.
- Se necesita revisión de licencias GPL-3.0-or-later de ambos editores frente a AGPL de NEXO y atribuciones si se distribuyen juntos. Este artefacto **no empaqueta sus binarios**.
- No actualizar dependencias de proveedores silenciosamente; usar releases verificadas, fijar versiones, pruebas y autorización.

## Criterios de aceptación para la siguiente etapa
1. IngeCAD abre DWG/DXF y conserva barra de comandos, capas, cotas, guardar y OSNAP.
2. IngeTrazo muestra el dibujo como aristas, permite crear cara y extruir, y guarda IGZ.
3. Cambiar de pestaña >= 10 veces sin perder menús, render OpenGL ni entradas de ratón/teclado.
4. NEXO cierra sin matar una edición sin guardar, y las ventanas externas siguen accesibles.
5. Diseñar un puente con IDs, unidades, capas, origen y revisión, no solo "reimportar DXF".

Fuentes: https://github.com/ingelibre/ingecad y https://github.com/ingelibre/ingetrazo. Proyectos independientes; NEXO no está afiliado a los autores.
