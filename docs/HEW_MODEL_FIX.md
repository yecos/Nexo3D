# Solución: Modelado 3D muestra una ventana vacía en Windows

**Identificado con la captura del usuario (2026-10-13):**
- CSS ocultaba ambas barras laterales, pero dejaba una cuadrícula `0 1fr 0`. El único elemento visible se colocaba en la primera columna **de 0 píxeles**: no se veían ni los botones ni el iframe.
- Cuando Hew no estaba compilado, Vite devolvía `index.html` en `/hew/nexo-manifest.json` con status 200. La lectura `response.json()` fallaba con **`Unexpected token '<'`**, pero la vista estaba colapsada.
- Los errores de carga diferida de Hew no deben borrar CAD ni Render. El modelo se ejecuta dentro de la ventana NEXO, sin importar herramientas externas por separado.

## Correcciones
La rama `fix/hew-model-workspace-blank` corrige la cuadrícula, exige la cabecera JSON adecuada y muestra mensajes para instalar/reintentar. También detecta si el motor WebAssembly no responde en 30 segundos, conservando el proyecto.

### Si ya tienes Rust y wasm-pack
En la carpeta local Nexo3D:

```powershell
git fetch origin
git switch fix/hew-model-workspace-blank
npm install
npm run hew:setup
npm run dev
```

Abre `http://127.0.0.1:5173` y entra en Modelado 3D.

### Más fácil: Hew ya compilado (sin Rust en tu portátil)

1. Abre [GitHub Actions: Downloadable Hew Modeler for NEXO Windows](https://github.com/yecos/Nexo3D/actions/workflows/hew-modeler-download.yml). Entra en una ejecución **verde** de la rama `fix/hew-model-workspace-blank`.
2. Descarga el artifact `nexo-hew-windows-sin-rust` y descomprime su ZIP de GitHub.
3. Dentro encontrarás `nexo-modelador-hew.zip`. Descomprime **ese archivo en la carpeta raíz de Nexo3D**; creará `public/hew/index.html`, `public/hew/nexo-manifest.json` y los recursos WASM.
4. Comprueba desde PowerShell:
   ```powershell
   Test-Path .\public\hew\nexo-manifest.json
   ```
   Debe devolver `True`.
5. Ejecuta `npm install` y `npm run dev`, actualiza el navegador con `Ctrl + Shift + R` y selecciona Modelado 3D.

Si la Action aún está ejecutándose, la descarga **todavía no estará lista**. Los artefactos expiran según la retención configurada. Si falla, no consideres disponible el modelo precompilado; utiliza `npm run hew:setup` o comparte el error de esa acción.

## Validación
- `npm test`, `npm run build` y **Chromium real sin Hew instalado** comprueban que se ve el aviso, el ancho del visor y que CAD continúa utilizable; ver [workflow](../.github/workflows/hew-missing-ui.yml).
- El workflow de compilación descarga upstream Hew fijado en commit `f36661fb726253e501ef26a4d5fff3cc6381d814`; los assets compilados **no** se incorporan al repositorio de fuentes, y los avisos de licencia de Hew siguen aplicando.
- La compilación y el comportamiento interactivo completo en **este portátil Windows** no están verificados hasta abrir la escena real.
