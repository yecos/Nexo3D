# Guía de desarrollo y puesta en marcha

**Estado actual:** no existe esqueleto compilable. **No hay comandos oficiales de build, instalación ni ejecución todavía.** Este documento define cómo crearlos; cualquier ejemplo marcado «propuesto» NO debe tratarse como ejecutable.

## 1. Ruta para integrarse al proyecto hoy
1. Leer [Visión](PRODUCT_VISION.md), [Requisitos](REQUIREMENTS.md), [Arquitectura](ARCHITECTURE.md), [Roadmap](ROADMAP.md).
2. Revisar [Licencia](../LICENSE), [Contribuir](../CONTRIBUTING.md) y ADR.
3. Crear issue con PoC acotada, criterios de aceptación, plataforma y riesgos.
4. Aislar evaluación de dependencias en ramas de prueba, sin fusionar código ni activos de terceros antes de auditar.
5. En PR explicar qué corre realmente, qué no funciona y cómo reproducir.

## 2. Stack orientativo para PoC (todavía NO aprobado)
- UI: React + TypeScript y editor de viewport basado en APIs web.
- Desktop: Tauri para Windows/Linux/macOS.
- Núcleo: Rust como candidato para datos geométricos y WASM web.
- Librería render viewport: evaluar Three.js y motores alternativos.
- Render final: Blender/Cycles invocado a través de adaptador.
- Paquetes: monorepo con versiones fijadas y archivos lock, gestor a seleccionar por ADR.

No ejecutar instrucciones arbitrarias copiadas de terceros; validar versiones, firma, hashes y licencias.

## 3. Estructura ideal al iniciar código
Consultar [ARCHITECTURE.md](ARCHITECTURE.md); crear `apps/desktop`, `packages/domain`, `packages/renderer-viewport`, `packages/workspace-model`, `packages/workspace-render`, `packages/storage`, `tests/fixtures` **cuando tenga sentido**. No crear todos los workspaces vacíos antes de probar el modelo canónico.

## 4. Orden técnico del primer prototipo
1. **PoC UI shell**: dos pestañas Modelado/Render y vista 3D.
2. **Documento mínimo**: nodos y transformaciones con IDs persistentes.
3. **Importador GLB**: solo transferencia de assets y mallas.
4. **Comandos**: `ImportAsset`, `SetTransform`, `AssignMaterial`, `SetLight`, `SaveProject`, `OpenProject`.
5. **Renderer preview**: dibuja estado derivado del documento.
6. **Persistencia local** con versión de schema y prueba round-trip.
7. **Render view** material/entorno y sincronicidad inmediata.
8. **E2E offline** en Linux y Windows; documentar diferencias.

## 5. Contratos de código sugeridos
- Cada paquete tiene interfaz tipada y README de responsabilidad.
- Ningún componente UI escribe geometría o archivos directamente.
- Validación de datos en frontera de importación y comandos; resultados con error explícito.
- No referencias circulares `domain -> renderer`; dominio independiente de UI.
- Evitar que el editor cargue por defecto una URL externa al iniciar.
- Tests deterministas en dominio, fixtures versionados, mocks de filesystem y red.
- API de plugins no puede exponer shell sin permisos explícitos.

## 6. Convenciones
Ramas `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `spike/<tema>`. Commits descriptivos. TypeScript estricto y Rust sin warnings críticos donde aplique; formatter/linter configurados en el código inicial; no mezclar lógica de UI y formato de archivo. Identificadores públicos documentados y versionados.

## 7. Entornos
**Windows:** toolchain específica cuando decidamos versiones. **Linux:** documentar paquetes del WebView/sistema según distro y renderer. **macOS:** runners/builds validados antes de anunciar soporte. **Web:** evitar imports nativos en core; filesystem mediante adaptador browser; fallback a WebGL cuando GPU avanzada no esté disponible.

## 8. Dependencias
Pin de versiones para builds reproducibles. Registrar licencia SPDX, notice, URL, commit, activos redistribuidos, transitive dependencies y posibles restricciones. Consultar [LICENSING.md](LICENSING.md). Credenciales fuera de Git; `.env.example` sin secretos si se necesita.

## 9. Calidad antes de subir un PR
- Requisito identificable, test, capturas solo si ayudan a reproducir, licencia y efectos sobre storage.
- Scripts y comandos escritos en README del paquete y ejecutados realmente.
- Matriz de plataformas **reales** y faltantes. No marcar macOS/web como listos si no se probaron.
- Evaluar rendimiento con fixture público para cambios en GPU.

## 10. Primeras tareas para quien quiera programar ya
Consultar [MVP_IMPLEMENTATION.md](MVP_IMPLEMENTATION.md) y [ENGINE_EVALUATION.md](ENGINE_EVALUATION.md). El primer código ideal no es un render hiperrealista, sino una escena pequeña reproducible y un documento que se guarda y reabre.
