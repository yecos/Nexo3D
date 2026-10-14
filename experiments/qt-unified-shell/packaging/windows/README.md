# Paquete Windows único de NEXO

Este directorio genera un instalador privado que coloca NEXO, IngeCAD e IngeTrazo bajo una sola carpeta y crea un único acceso directo. Los ejecutables de los editores no se guardan en el repositorio: el script los toma de instalaciones locales que el usuario ya tenga y los copia al paquete.

## Generar el instalador

Desde la raíz del repositorio, con el ejecutable de NEXO ya compilado:

powershell -ExecutionPolicy Bypass -File experiments/qt-unified-shell/packaging/windows/build-windows-installer.ps1 ^
  -NexoExe experiments/qt-unified-shell/dist/NEXO-Bridge-CAD-Modelado-Render-PoC.exe ^
  -OutputDir C:\ruta\de\salida

El script detecta automáticamente IngeCAD dentro de Descargas e IngeTrazo en C:\Program Files\IngeTrazo. También acepta -IngeCadRoot y -IngeTrazoRoot cuando las instalaciones están en otras ubicaciones.

El instalador resultante:

- instala NEXO y los dos editores en C:\Program Files\NEXO 3D;
- crea accesos directos en Inicio y Escritorio;
- instala la extensión NEXO si el perfil de IngeTrazo no tiene una versión personalizada;
- conserva una extensión existente diferente y deja la nueva como .nexo-new;
- incluye bundle-manifest.json con versiones, tamaños y SHA-256 de los ejecutables principales.

## Importante

El paquete generado es para uso local autorizado. Antes de distribuirlo a terceros hay que verificar que las licencias de IngeCAD, IngeTrazo, sus DLL y sus recursos permitan redistribución conjunta. El repositorio no incorpora esos binarios.
