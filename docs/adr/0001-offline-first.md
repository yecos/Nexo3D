# ADR-0001: Offline-first

**Estado:** Aceptada · 2026-10-13

**Contexto:** un estudio debe poder trabajar en obra, taller o lugar con conectividad inestable. Una licencia online o API externa no puede bloquear abrir o guardar.

**Decisión:** operaciones básicas de creación, edición, guardado, materiales y visualización deben funcionar localmente en escritorio. IA remota, sincronización y granja de render son servicios **opcionales** y requieren consentimiento.

**Consecuencias:** preferir bases locales, empaquetar recursos necesarios, documentar límites de proveedores remotos y diseñar reintentos sin pérdida de trabajo. El rendimiento y las capacidades IA variarán con hardware local.

**Alternativas descartadas:** editor exclusivamente SaaS y verificación de licencia online obligatoria.

**Validación:** NFR-001 / AC-MVP-02; prueba completa con conectividad desactivada.
