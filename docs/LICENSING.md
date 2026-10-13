# Licenciamiento, derechos y procedencia

**Decisión de proyecto:** `AGPL-3.0-only` para el código original de NEXO 3D. Texto oficial en [../LICENSE](../LICENSE). Esto permite uso personal y comercial, copia, estudio, modificación y redistribución **con las obligaciones de la licencia**; incluye disposiciones relacionadas con versiones modificadas accesibles por red.

> Este documento es política del proyecto, no asesoría jurídica. Revisar caso por caso distribución, compilaciones, servicios y dependencias.

## 1. ¿Qué cubre y qué no?
- Código original aportado a NEXO 3D: AGPL-3.0-only, con SPDX en encabezados cuando aplique.
- Librerías de terceros: **su licencia original**, no se relicencian por incluirlas; sus avisos se conservan.
- Assets: materiales, HDRI, fuentes, modelos, iconos y fotografías requieren **derechos propios**; ponerlos en un repositorio AGPL no los vuelve libres automáticamente.
- Pesos de modelos de IA: pueden tener licencias y condiciones diferentes; licencia de software != licencia de pesos/datasets.
- Marcas: NEXO 3D, Autodesk, SketchUp, D5 y otras identificaciones no conceden derechos de marca por el código.

## 2. Declaración de licencia en archivos nuevos
Recomendación cuando el código exista:
```text
SPDX-License-Identifier: AGPL-3.0-only
Copyright (C) 2026 NEXO 3D contributors
```
Conservar avisos existentes y autorías específicas donde corresponda. No borrar encabezados upstream.

## 3. Reutilización de otras bases
Si se integra Hew u otra base, registrar licencia por ruta, excepciones, subdependencias y forma de integración (biblioteca, fork, proceso separado, asset). Hew publica licencia AGPL; las excepciones (por ejemplo para plugins) deben leerse exactamente en sus archivos, no asumirse extendidas a NEXO. **Compatible no significa libre de obligaciones.**

Evaluar expresamente licencias GPL de componentes CAD, Blender, motores CAD/WASM, SDK GPU, fuentes, recursos y plataformas móviles. La integración en un mismo binario/servicio puede desencadenar obligaciones distintas a comunicarse mediante un formato de archivo; no hay atajo legal automático.

## 4. Ingeniería inversa y equivalentes libres
Objetivo legítimo de producto: estudiar comportamientos públicos, formatos abiertos y flujos de trabajo para **implementar capacidades propias**. No copiar ejecutables, código, shaders, bases de datos propietarias ni recursos protegidos. Revisar condiciones contractuales y excepciones legales antes de cualquier investigación de compatibilidad con formato propietario. Documentar aportes independientes y fuentes autorizadas.

## 5. Registro de terceros requerido antes de importar código
| Campo | Ejemplo de contenido |
| --- | --- |
| Nombre + repositorio | Librería `X`, URL y commit exacto |
| Licencia | SPDX + enlace al archivo LICENSE del tag usado |
| Dependencias | Licencias transitivas, SDK/archivos redistribuidos |
| Uso | Fuente incluida / runtime externo / protocolo / asset |
| Obligaciones | Copyright, NOTICE, publicación de fuentes, modificaciones |
| Plataforma | Windows/Linux/macOS/web |
| Decisión | Aprobado / rechazo / pendiente revisión por persona |

Estado inicial: **no se ha incorporado código fuente, imágenes, modelos o materiales de Hew, IngeTrazo, Blender ni proyectos propietarios**. Las referencias documentales son enlaces, no dependencias incorporadas. Consultar también [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md).

## 6. Fotos de referencia y modelos generados
- Verificar permiso para usar fotografías o diseños de terceros; "está en internet" no es licencia.
- Guardar atribución y términos aplicables al activo.
- El usuario debe revisar límites comerciales del proveedor IA, copyright de entradas y derechos de outputs.
- No distribuir bibliotecas de muebles marcas ajenas sin autorización.

## 7. Checklist de publicación
- [ ] LICENSE completo en raíz, SPDX coherente.
- [ ] Inventario de dependencias y avisos de copyright correctos.
- [ ] Fuentes correspondientes y scripts de build según obligaciones.
- [ ] Bibliotecas y activos con derechos confirmados.
- [ ] Licencia visible en instalador/UI/About y fuente ofrecida cuando corresponda.
- [ ] Avisos de marca y ausencia de afiliación comercial incorrecta.
