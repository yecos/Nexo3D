# Contribuir a NEXO 3D

¡Gracias! NEXO 3D busca ser útil para diseñadores, desarrolladores, artistas y estudiantes. **El proyecto está en fase documental**; antes de contribuir código consulta [docs/README.md](docs/README.md) y [ROADMAP](docs/ROADMAP.md).

## Antes de empezar
1. Comprueba si ya existe issue/PR relacionado.
2. Para cambios estructurales, crea un issue que describa problema, propuesta, riesgos, alternativa y prueba de aceptación.
3. No incorpores código propietario, assets comerciales, logos o datasets sin permiso y licencia documentada.
4. Si el cambio toca formatos, migraciones o licencias, añade o modifica un ADR y pruebas.

## Flujo de contribución
- Haz fork o crea una rama descriptiva: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- PRs pequeños, centrados en un resultado verificable. Nunca mezclar refactor masivo con feature.
- Referencia IDs de requisitos `FR-...` o `NFR-...` y adjunta pasos de reproducción.
- Mantén docs, tests, avisos de licencia y changelog al día.
- Commits claros: `docs: ...`, `feat(scene): ...`, `fix(io): ...`.
- Explica plataformas probadas y limitaciones de rendimiento; evita afirmar que todo funciona sin ejecutar pruebas.

## Checklist de PR
- [ ] Issue/requisito vinculado y comportamiento esperado.
- [ ] Evidencia de prueba, reproducción y hardware/OS.
- [ ] Tests unitarios/integración y migración cuando aplica.
- [ ] Revisión de seguridad, privacidad, accesibilidad y licencias.
- [ ] Documentación actualizada y capturas de cambios visuales.
- [ ] No se añade dependencia sin propuesta en [ENGINE_EVALUATION](docs/ENGINE_EVALUATION.md) y [LICENSING](docs/LICENSING.md).

## Política de revisión
Al menos una revisión para PR normal; cambios de formato, render, seguridad o núcleo común requieren segunda revisión cuando haya mantenedores disponibles. Un revisor no debe aprobar su propio cambio como única validación.

## Licencia de contribuciones
Contribuir implica aportar código original o legalmente redistribuible bajo **AGPL-3.0-only**, a menos que un directorio indique claramente otra licencia compatible y validada. Conserva avisos de terceros; el proyecto no exige por ahora un Contributor License Agreement. Consulta [LICENSE](LICENSE) y [docs/LICENSING.md](docs/LICENSING.md).

## Conducta y seguridad
Consulta [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) y [SECURITY.md](SECURITY.md). Para vulnerabilidades, evita publicar detalles explotables antes de coordinar una solución.

## Ambiente de desarrollo
Los comandos definitivos se agregarán cuando se cree el esqueleto de código. **No hay build oficial aún.** Revisa [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
