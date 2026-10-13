# NEXO 3D Desktop — instalación y actualizaciones

**Estado:** `feat/desktop-tauri-alpha`, primera versión de prueba. Tauri 2, misma interfaz CAD / Hew / Render, instalador Windows NSIS y AppImage Linux compilados por GitHub Actions. La compilación real debe verificarse en [Actions](https://github.com/yecos/Nexo3D/actions/workflows/desktop-installers.yml); no asumir que los instaladores existen hasta que el workflow esté verde.

## Qué cambia en el flujo

Antes: `npm run dev`, abrir Chrome y compilar Hew por separado.  
Desktop: instalar NEXO 3D una vez desde `*-setup.exe`; la interfaz corre dentro de WebView2 en la **misma ventana**, con el modelo Hew WASM incluido como recurso local. No requiere un servidor Node activo ni abrir el navegador. En Linux se genera `.AppImage`.

El estado de los planos, GLB y proyecto Hew **no se sube a GitHub**, y deben mantenerse en archivos `.nexo3d.json` **fuera de la carpeta de instalación**, por ejemplo Documentos/NEXO 3D. No utilizar las carpetas de instalación para almacenar proyectos. Las guardas vía descargas desde WebView deben probarse directamente en Windows antes de considerarlas producción.

## Crear instalador beta
1. Abrir [GitHub Actions → NEXO Desktop installers](https://github.com/yecos/Nexo3D/actions/workflows/desktop-installers.yml) y elegir una ejecución **verde** de `feat/desktop-tauri-alpha`.
2. En *Artifacts*, descargar `NEXO-3D-Windows-Alpha-Setup`, abrir su ZIP y extraer el instalador NSIS `*-setup.exe`.
3. Instalar y abrir NEXO 3D desde el menú Inicio. Comprobar **CAD 2D → Modelado 3D → Render**, abrir proyecto, guardar, cerrar y reabrir, todo **sin conexión a internet**.
4. Si Windows SmartScreen muestra advertencia por editor desconocido, se debe a que el instalador inicial aún no tiene certificado comercial de firma de código. Instalar solo si procede de nuestro repositorio oficial y se ha verificado su commit; no desactivar globalmente las protecciones de Windows.

**Importante:** un build de GitHub Actions verde verifica empaquetado, no garantiza compatibilidad WebView2/driver ni que Hew se maneje correctamente con el ratón del equipo real. Mantener `main` intacto hasta pruebas.

## Crear instalador local de desarrollador
Requisitos: Node 22, Rust stable y WebView2 SDK/toolchain de Windows; el modelo Hew compilado debe estar en `public/hew` (archivo `nexo-manifest.json` + WASM).
```powershell
git switch feat/desktop-tauri-alpha
npm install
npm run desktop:icons
npm run build
npm run desktop:build
```
El instalador aparece generalmente en `src-tauri/target/release/bundle/nsis/`. Para desarrollo rápido `npm run desktop:dev`, pero **el instalador distribuido no depende del servidor Vite**.

## Actualizaciones y releases
Fase actual (**real**): publicación **manual** y revisada de nuevas versiones desde GitHub Releases. Ejecutar workflow `publish-desktop-release.yml` con el **ID de una compilación exitosa** y el tag que coincide con `package.json`, `src-tauri/Cargo.toml` y `tauri.conf.json`. El proceso produce **draft prerelease** con instalador Windows y AppImage; publicar tras una revisión humana y permitir reinstalar sobre versión anterior conservando los proyectos externos.

Fase siguiente (**NO activa en esta beta**): actualizador Tauri v2 con firma Ed25519. Debe verificar descargas firmadas antes de instalarlas, y requiere claves que se mantendrán bajo control del propietario del repositorio:
- Generar claves localmente con `npx tauri signer generate -w $HOME/.tauri/nexo3d.key` (según sistema) y almacenar el archivo privado **fuera del repositorio**, con backup seguro.
- Guardar el contenido de la clave privada como secreto GitHub `TAURI_SIGNING_PRIVATE_KEY` y contraseña opcional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`; nunca insertar en workflows, documentación ni archivos públicos.
- Añadir la **clave pública** a la configuración del plugin updater de Tauri; registrar un endpoint HTTPS como `https://github.com/yecos/Nexo3D/releases/latest/download/latest.json`, y configurar `bundle.createUpdaterArtifacts=true`.
- Activar el plugin y permitir el chequeo/instalación solo tras verificar firmas, cadencia Beta/Estable y recuperación de fallos. Un instalador NSIS **sin firma de Windows** es distinto de un updater firmado con Ed25519: ambos mecanismos tienen propósitos distintos.
- No publicar `latest.json` con versiones no probadas ni sobreescribir tags; actualizar siempre las tres versiones de metadatos.

**Por seguridad:** la beta actual *no* instala ejecutables descargados automáticamente, ni afirma disponer de actualizaciones automáticas firmadas.

## Restricciones / licencia
- NEXO AGPL-3.0-only; conservar fuente y avisos.
- Hew AGPL-3.0-only + excepción de plugins y OpenSKP con avisos que deben acompañar distribución.
- Tauri MIT/Apache; WebView2 (componente del sistema Windows), WebKitGTK (Linux), Three.js MIT, Blender GPL (render final no incluido).
- Política de seguridad de CSP sin endurecer para compatibilidad temprana Hew WASM: **solo beta**; debe revisarse antes de versión estable.
- No hay aún macOS ni certificación de arranque en portátil Windows, y Render Studio avanzado está en ramas dependientes. No presentar esta beta como CAD/D5 comercial terminado.

## Verificación antes de promover a estable
- [ ] Windows NSIS construido y disponible como artifact.
- [ ] Linux AppImage construido y disponible como artifact.
- [ ] Ejecutar EXE en Windows WebView2 real, confirmar Hew UI sin pantalla vacía.
- [ ] Guardar y reabrir un proyecto único CAD+Hew y exportar GLB.
- [ ] Render usable con una escena GLB real.
- [ ] Añadir actualizaciones firmadas con respaldo de claves y release tags inmutables.
- [ ] Política de migraciones/backup y revisión de licencias/atribuciones y CSP.
