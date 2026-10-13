# Especificación de áreas de trabajo

**Regla principal:** un mismo proyecto, selección común y fuentes de datos compartidas; cada workspace añade herramientas, paneles y representaciones distintas.

## Componentes UI comunes
Menú proyecto; navegador de escena; árbol de objetos; inspector de propiedades; buscador de comandos; barra de estado con unidades/coordenadas; historial undo/redo; panel de assets; vistas/cámaras; ayuda; notificaciones de save/errores. Atajos configurables; no secuestrar teclas usadas por entradas de texto.

## CAD — tipo dibujo técnico
**Foco:** precisión 2D y documentación. Existe una primera interfaz experimental en la rama CAD (línea, polilínea, rectángulo, coordenadas, capas, snap y extrusión vinculada); el resto sigue siendo objetivo de producto. Ver [CAD_2D_MVP.md](CAD_2D_MVP.md).
- Herramientas objetivo: línea, polilínea, rectángulo, arco, círculo, trim/extend, offset, snaps, ortogonal, coordenadas absolutas/relativas.
- Capas, tipos de línea, visibilidad, bloques, grupos, cotas y anotación por escala.
- Vistas planta/corte/elevación desde entidades semánticas donde existan; impresión/PDF posterior.
- Unidades en m/mm, opciones imperiales; control de tolerancias.
- El archivo 2D puede tener geometría independiente. Convertir trazo→muro requiere intención y propiedades, no interpretación automática silenciosa.
**P1 demo:** habitación 4 × 3 m, cota 4000 mm, puerta con representación en planta y en vista de modelado coherente.

## Modelado — geometría accesible
**Foco:** flujo tipo SketchUp sin apropiación de marcas/código.
- Orbit/pan/zoom; inferencias geométricas; draw/extrude; push/pull; move/rotate/scale; grupos/componentes; snaps y medidas.
- Distinguir malla importada de sólido editable y operar con capacidades explícitas.
- Biblioteca local de mobiliario con categorías, escala, procedencia y versiones.
- Herramientas futuras: booleanas robustas, editar perfil, array, mirror, sección temporal, operaciones paramétricas.
**P0 demo:** cargar GLB, mover/rotar sofá, cambiar workspace y persistir.

## Render — visualización arquitectónica
**Foco:** aspecto de escena sin perder geometría.
- Paneles: Materiales PBR, HDRI/cielo/sol, luces (área, spot, point), cámaras, exposición, ajustes de salida.
- Diferenciar preview GPU (interactivo) y render final (proceso potencialmente lento).
- Material preview sobre cualquier objeto; importación segura de texturas; biblioteca local de presets.
- Futuro: vegetación/dispersión, clima, animación, panorámicas, recorridos.
**P0 demo:** cambiar roughness y colocar luz/entorno; reabrir offline con el mismo resultado declarativo.

## IA Studio — referencias y activos
**Foco:** asistencia optativa, editable y verificable.
- Tablero de referencias locales con atribución y derechos.
- Enviar imagen a modelo local o nube únicamente con confirmación explícita.
- Revisión obligatoria de malla, escala, UV/material, orientación, triángulos, procedencia y licencia.
- Insertar asset GLB en la misma escena; poder reemplazar/refinar asset sin perder su instancia.
**P2 demo:** sofá generado como GLB revisado, escalado y convertido en asset reutilizable.

## Sincronización entre workspaces
| Evento | CAD | Modelado | Render | IA Studio |
| --- | --- | --- | --- | --- |
| Mover objeto con ID | Actualiza proyección compatible | Actualiza gizmo | Actualiza viewport y cache | Actualiza instancia del asset |
| Material nuevo | Metadato consultable | Vista opcional sombreada | Actualiza PBR | Metadato preservado |
| Cota | Dibuja anotación | Muestra medida si activada | No altera malla | Disponible como restricción |
| Cambiar geometría | Recalcula vista dependiente | Cambia el sólido/malla | Invalida cache | Referencia/asset actualizado según política |
| Crear imagen IA | No modifica automáticamente | Asset disponible | Asset disponible | Revisión pendiente hasta aceptación |

## Reglas de experiencia
- Cambiar vista no debe disparar exportación ni reimportación.
- Selección de objeto común, salvo contextos locales claramente identificados.
- Cerrar paneles no hace perder datos.
- Distintos motores de render pueden diferir visualmente; documentar conversiones y limitaciones.
- Al entrar en Render no deben desaparecer geometría o layers sin decisión del usuario.
