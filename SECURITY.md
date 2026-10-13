# Política de seguridad

**Estado:** desarrollo temprano, sin release estable ni canal privado de reporte formal configurado.

## Cómo reportar
Si GitHub ofrece la opción **Report a vulnerability** / **Private vulnerability reporting** en la pestaña Security, úsala preferentemente. Si no está disponible, solicita a un mantenedor un canal privado en un issue **sin publicar** payloads, credenciales, datos personales ni pasos explotables. No hay SLA de respuesta comprometido por ahora.

## Alcance prioritario
- Importación de GLB/GLTF y formatos complejos (archivos maliciosos, agotamiento de memoria).
- Path traversal, symlinks, escritura de archivos y corrupción durante guardado.
- Comandos de sistemas locales, conversores, procesos externos y scripts/plugin.
- Descarga de modelos o dependencias con ejecución de contenido externo.
- IA en nube: consentimiento, transferencia de imágenes, tokens y logs.
- Deserialización de proyectos, rutas de assets, dependencias y actualizaciones.

## Reglas técnicas
- Abrir proyectos no debe ejecutar scripts arbitrarios.
- Validar rutas y tamaños; presupuestos de memoria/triángulos/texturas configurables.
- Tokens solo en almacén seguro del OS, nunca en proyectos o logs compartidos.
- Procesos de render con permisos mínimos y argumentos validados.
- No cargar recursos remotos por defecto al abrir un proyecto offline.
- Dependencias inventariadas y revisión de vulnerabilidades en CI cuando exista.

## Publicación de correcciones
Issue privado cuando se disponga, parche revisado, changelog y comunicación de impacto. No revelar información del reportante sin consentimiento. Esta política se refinará antes de la primera release pública.
