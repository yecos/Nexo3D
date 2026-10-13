# ADR-0002: Desktop primero, web preparada

**Estado:** Aceptada como estrategia; stack concreto PROPUESTO · 2026-10-13

**Contexto:** se requiere Windows, Linux y macOS, con posibilidad de funcionar desde navegador en una etapa posterior.

**Decisión:** separar UI, comandos de edición, persistencia, geometría y render mediante interfaces. Evaluar React/TypeScript para UI, Tauri para empaquetado desktop y Rust/WASM para núcleo portable, sin afirmar selección definitiva hasta PoC.

**Consecuencias:** no acoplar proyecto ni comandos a APIs de filesystem, GPU o procesos de un único sistema. Implementar adaptadores desktop y web cuando sea necesario; la web tendrá capacidades diferentes y render remoto optativo.

**Alternativas:** editor Qt nativo (fuerte en desktop, mayor costo web); base web exclusiva (restricciones GPU y filesystem); integración directa de varios editores independientes (rompería el estado compartido).

**Validación:** smoke Linux/Windows, test de interfaz sin importaciones nativas y prototipo web temprano.
