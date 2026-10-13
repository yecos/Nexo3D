# Offline-first, nube opcional y privacidad

## Promesa de producto
Sin internet, el usuario puede **abrir, crear, editar, visualizar y guardar proyectos** desde escritorio. Funciones que usen servicios remotos (sincronización, IA en nube, render cloud) son **adicionales y explícitas**. IA local podrá requerir hardware/descargas previas; no se promete estar disponible en cualquier máquina.

## Capacidades por entorno
| Función | Escritorio offline | Navegador (fase futura) | Nube opcional |
| --- | --- | --- | --- |
| Proyecto local | Sí, meta obligatoria | Sí donde navegador y almacenamiento lo permitan | Backup/sync |
| CAD y modelado | Sí, según módulos implementados | Según WASM/GPU y características | No necesario |
| Material PBR/preview | Sí | Con fallback y límites | No necesario |
| Render final local | Sí, con backend instalado | No asumir backend nativo en navegador | Render remoto con opt-in |
| Imagen→3D IA | Solo si modelo local está instalado y hardware soporta | No garantizado | Servicio remoto consentido |
| Colaboración en tiempo real | No en MVP | Posterior | Servidor opcional |

## Persistencia
Desktop: proyecto local, assets embebidos o vinculados, backups y journaling. Web: explorar Origin Private File System (OPFS) o IndexedDB según compatibilidad; solicitar acceso explícito a archivos externos. No convertir almacenamiento del navegador en servidor obligatorio.

## Cuando la conexión falla
- Ninguna acción local queda bloqueada por timeout de red.
- Colas de nube, si existen, con estados `pendiente`, `enviado`, `fallido`, `conflicto`.
- Error de sincronización no descarta ni sobreescribe versión local.
- Sincronización futura requiere identidad de versiones, estrategia de merge/conflicto y consentimiento por proyecto.

## Política de privacidad
- **Sin telemetría obligatoria** por diseño.
- Información mínima por operación remota, con vista previa de archivos a enviar.
- Tokens no se incluyen en proyectos, logs ni crash reports.
- Historial de prompts/fotos de clientes no se envía automáticamente.
- Si un proveedor tiene retención de datos u otros términos, mostrarlos antes de enviar.
- Exportación y borrado local de proyectos independiente de la nube.

## Modelo de amenazas
Exfiltración involuntaria de referencias; assets con urls maliciosas; uso indebido de comandos de shell desde plugins; conflictos al sincronizar; enlaces absolutos rotos; secretos guardados en project files. Mitigar con permisos granulares, sandbox, sanitización, logs locales y pruebas.

## Aceptación
1. Probar M2 con Wi-Fi/desconectado desde inicio.
2. Guardado offline y recuperación sin credenciales.
3. Bloquear salida de red (firewall de prueba), comprobar que edición local no falla.
4. Inspeccionar logs/proyecto para descartar secretos.
5. Simular timeout/corte en tareas remotas; cambios locales permanecen íntegros.
