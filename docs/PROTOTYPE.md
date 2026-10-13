# Primer prototipo ejecutable — GLB, Modelado y Render

**Estado:** implementación en la rama `feat/mvp-local-glb-workspaces`. **No declarado listo para producción** hasta comprobar CI, build y una ejecución manual en Linux/Windows.

## Alcance REAL de este prototipo
- Visor interactivo con órbita, paneo y zoom; importar archivos **.glb 2.0 autocontenidos**.
- Agregar cubos de referencia; seleccionar modelos desde el árbol o visor.
- Mover, rotar y escalar mediante inspector numérico en metros, o gizmo (botones Mover/Rotar/Escalar).
- Cambiar Modelado ↔ Render sobre el mismo documento sin reimportar.
- Sobreobjetos: PBR básico (color, roughness, metalness); iluminación ambiental y direccional.
- Guardar / abrir archivo local `.nexo3d.json` provisional con modelos GLB embebidos y metadatos.
- Deshacer/rehacer cambios de escena (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z o Ctrl/Cmd+Y).
- Rechazar proyectos inválidos y GLB que dependan de recursos externos.
- **No:** CAD, DWG, DXF, SKP, HDRI real, imagen IA, render final offline, Tauri empaquetado o sincronización. Ninguna funcionalidad comercial de D5 se incluye.

## Ejecutar localmente (requiere Node.js 22 o superior)
```bash
git clone https://github.com/yecos/Nexo3D.git
cd Nexo3D
git switch feat/mvp-local-glb-workspaces
npm install
npm test
npm run dev
```
Abrir la dirección local mostrada por Vite (normalmente `http://127.0.0.1:5173`). Todo el código de la UI y el visor se obtiene de dependencias instaladas en el equipo; la aplicación **no necesita un servidor de cuentas ni una API externa** para el flujo básico, pero `npm install` requiere obtener dependencias inicialmente. Servir mediante Vite o build local es distinto de tener ya un instalador desktop.

**Build:** `npm run build` genera `dist/` para alojar en un servidor estático; usar `npm run preview` para probarlo. No abrir `dist/index.html` por `file://` y esperar que funcionen rutas absolutas.

## Primer ejercicio
1. Abre Modelado, mira el volumen inicial.
2. Pulsa **Importar GLB** y elige un archivo GLB 2.0 autocontenido (tamaño máximo temporal 30 MB).
3. Selecciona el archivo desde Escena; mueve X = 2.50 m.
4. Cambia a Render, observa que la posición se conserva.
5. Cambia color y roughness; ajusta iluminación.
6. Pulsa Guardar: se descarga un archivo `nexo3d-proyecto.nexo3d.json`.
7. Desconecta la red, recarga con el servidor local activo, pulsa Abrir y selecciona el archivo.
8. Comprueba IDs, transformaciones, materiales y luces; anota fallos en issue.

## Limitaciones importantes
- El visor es WebGL y **no sustituye a Cycles/D5**: sin HDRI, ray tracing, export PNG ni path tracing.
- Proyecto prototipo JSON con GLB base64: no es el futuro formato nativo y genera archivos grandes.
- El manejo de GLB conserva geometría y puede modificar apariencia/material por override al editar; no ofrece edición paramétrica de caras.
- Sin autenticación, nube, autosave, guardado atómico del sistema ni instaladores aún.
- El modo offline web depende de disponer de Vite local o servir un build local; aún no hay PWA.
- Los materiales deben revisarse visualmente; importar texturas embebidas es compatible con GLB estándar, pero no se ha validado todavía un conjunto amplio de extensiones.
- Tests de dominio cubren validación y round-trip de estado; CI compila la UI; las pruebas visuales y empaquetado son pendientes.

## Cómo reportar evidencia
Documentar versión/commit, navegador, SO, GPU, driver, tamaño y procedencia del GLB, foto/captura del resultado, resultado esperado y pasos repetibles. Nunca subir diseños de cliente sin autorización.

## Próximo hito
Validar esto en Linux y Windows, estabilizar formato y pipeline de activos. Luego evaluar con PoC **Hew** como kernel de modelado avanzado; solo después considerar DXF/SKP/DWG y conexión con render final Blender.
