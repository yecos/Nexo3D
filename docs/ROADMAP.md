# Hoja de ruta — NEXO 3D

## Fase 0 — Fundamentos

- [x] Repositorio público creado
- [x] Visión y arquitectura inicial documentadas
- [ ] Elegir licencia de software libre compatible con las bases seleccionadas
- [ ] Revisar de forma documentada las bases Hew, IngeTrazo y posibles motores
- [ ] Crear esqueleto de app, checks automáticos y pruebas

## Fase 1 — MVP de integración

- [ ] Abrir un GLB en el visor
- [ ] Transformar un objeto (mover/rotar/escalar) y persistir sus cambios
- [ ] Alternar workspaces Modelado y Render sobre la misma escena
- [ ] Material PBR sencillo y una luz o HDRI en Render
- [ ] Guardar y reabrir un proyecto sin acceso a internet
- [ ] Probar escritorio Linux y Windows

**Criterio de éxito:** un mismo objeto cambia en Modelado y se ve actualizado en Render, sin exportación manual.

## Fase 2 — Productividad arquitectónica

- [ ] Dibujo CAD 2D, unidades, capas y cotas
- [ ] Elementos 3D con medidas precisas y operaciones geométricas
- [ ] Vistas y documentación derivadas del modelo
- [ ] Importadores adicionales, uno a uno y con pruebas de fidelidad

## Fase 3 — Visualización

- [ ] Materiales PBR avanzados
- [ ] HDRI, sol, cielo, luces, cámaras y recorridos
- [ ] Exportar imagen usando render local
- [ ] Optimizar rendimiento con escenas arquitectónicas reales

## Fase 4 — IA y web

- [ ] Módulo de referencias e imagen a modelo GLB
- [ ] Servicios IA locales y nube optativa
- [ ] Compilación web del cliente y persistencia local
- [ ] Compatibilidad multiusuario/sincronización opcional

## Reglas de avance

Un módulo solo se considera terminado con: prueba funcional reproducible, archivo de ejemplo, documentación corta y evidencia. No afirmar compatibilidad que no esté probada.
