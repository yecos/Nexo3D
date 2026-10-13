# Visión y alcance del producto

## 1. Problema a resolver
Diseñadores de interiores, arquitectos, fabricantes y estudiantes trabajan con CAD, modeladores, renderizadores y generadores IA separados. Deben reimportar, perder metadatos, reconfigurar materiales y mantener copias distintas de la misma geometría.

**Hipótesis de producto:** un proyecto único con espacios de trabajo especializados reduce retrabajo y hace viable un flujo local, libre y extensible.

## 2. Propuesta
NEXO 3D será una **sola aplicación multiplataforma** con modo **CAD**, **Modelado**, **Render** e **IA Studio**. Cambiar de modo **no convierte ni reimporta** el proyecto: usa el mismo estado de escena. La disponibilidad de red no determina la capacidad básica de diseñar.

## 3. Usuarios y tareas
- **Arquitectura/interiorismo:** planta precisa → muros y muebles 3D → materiales → imagen y documentación.
- **Diseño de mobiliario:** referencia visual → malla generada/opcional → escala exacta → ajustes → catálogo reutilizable.
- **Visualización:** modelos importados → cámaras, cielo HDRI y luces → previsualización → imagen final.
- **Docencia y comunidad:** instalar sin pagar licencias de uso, revisar el código y publicar extensiones conformes a la licencia.

## 4. Experiencia objetivo
1. Crear o abrir proyecto local; elegir unidades y plantilla.
2. En CAD, dibujar geometrías con snaps, capas y cotas.
3. En Modelado, crear o editar objetos, componentes y transformaciones.
4. En Render, **sin exportar**, aplicar material PBR, configurar HDRI/luces/cámara y producir imagen.
5. En IA Studio, adjuntar una referencia con derechos adecuados, generar un asset opcionalmente y revisar malla/escala.
6. Guardar, reabrir y continuar sin conexión.

### Experiencia mínima antes de expandir módulos
**MVP:** GLB→modelo compartido→transformación→vista Render→material/luz→guardado local→reapertura. CAD pleno e IA no forman parte del primer hito.

## 5. Límites explícitos
**No** pretende inicialmente reemplazar todas las funciones de AutoCAD, SketchUp, Revit o D5, abrir nativamente proyectos de D5 ni garantizar fidelidad total de DWG/SKP. No incluye por defecto servicios de IA de pago, biblioteca propietaria, cloud obligatorio ni colaboración simultánea.

## 6. Principios de diseño
- Una acción debe ser **predecible, reversible y medible**.
- Integridad geométrica y medidas antes que efectos cosméticos.
- UI sencilla para tareas frecuentes y herramientas avanzadas por contexto.
- Autosave/recuperación y propiedad local de datos.
- Accesibilidad: teclado, atajos configurables, contraste, navegación y unidades.
- Rendimiento degradable: calidad del viewport adaptable, sin impedir editar.
- Atribución de recursos y licencias visibles en assets.

## 7. Indicadores de éxito (objetivos a validar)
- Abrir y guardar un ejemplo sin red y sin pérdida de propiedades.
- Sincronización inmediata entre workspaces para cambios de escena dentro de una misma sesión.
- Tiempo de lanzamiento y FPS medidos en escena de referencia (umbrales tras benchmark, no promesas).
- Reproducción automática de las pruebas de round-trip y recuperación.
- Contribuciones externas aprobadas y documentación suficiente para ejecutar el proyecto.

## 8. No metas en el primer año (sujetas a revisión)
BIM completo, simulación de cargas, CAD mecánico profesional, render en tiempo real idéntico a D5, compatibilidad universal con plugins propietarios y edición colaborativa concurrente. Se podrán investigar, no comprometer sin capacidad y pruebas.
