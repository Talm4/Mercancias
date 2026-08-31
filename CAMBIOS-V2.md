# Talma Data Center V2 — Cambios realizados

## Renovación de interfaz
- Nueva estructura tipo aplicación empresarial con sidebar persistente, top bar y contenido por vistas.
- Identidad visual Talma reinterpretada con verde, azul corporativo, blancos y neutros.
- Navegación renombrada y simplificada: Resumen, Registros, Personas, Cursos, Grupos y Tendencias.
- Resumen reconstruido como command center: KPIs prioritarios, panorama de asistencia, estados, hallazgos operativos, rankings, actividad reciente y calidad de datos.
- Analítica dejó de duplicar el dashboard: ahora se concentra en evolución temporal, ranking de cursos, desempeño de instructores, notas, horas y hallazgos calculados.
- Vistas operativas conservan CRUD, filtros, importación/exportación, perfiles y lógica existente.

## Rendimiento
- Se eliminó un doble render de cada ruta: `router.js` ya ejecutaba la vista y `app.js` la volvía a renderizar inmediatamente.
- Se eliminó el triple recalculo del filtro de integridad (dos `setFiltro` + `applyFilters`). Ahora se actualiza el estado y se filtra una sola vez.
- Nuevo `analytics-engine.js`: procesa el universo filtrado en una sola pasada y reutiliza agregaciones por base, curso, grupo, instructor, fecha y periodo.
- Cache LRU ligera de analítica basada en versión de datos + filtros.
- Gráficos de Tendencias actualizan instancias existentes con `update('none')` en vez de destruir/recrear siempre.
- Animaciones de gráficos analíticos desactivadas y render secundario diferido con `requestIdleCallback` / `requestAnimationFrame`.
- El cálculo de estados del dashboard pasó de un patrón potencial O(n²) (`filter()` por persona) a índices `Map` construidos en una sola pasada.
- Calidad de datos dejó de ejecutar `find()` sobre toda la base por cada registro en revisión; usa un índice por `_docId`.
- Se añadieron mediciones con `performance.mark()` / `performance.measure()` para normalización, dashboard y analítica.

## Datos presentados
- KPIs ejecutivos limitados visualmente a los cuatro más importantes.
- Panel de hallazgos automáticos sin IA externa, calculado con datos reales.
- Rankings Top 10 para evitar gráficos ilegibles con cientos de categorías.
- Evolución temporal sin puntos cuando el volumen es alto.
- Analítica orientada a preguntas distintas del Resumen, reduciendo duplicación visual.

## Archivos principales
- `index.html` — nueva arquitectura visual y contenido de las vistas.
- `assets/css/design-v2.css` — nueva capa de diseño empresarial responsive.
- `assets/js/analytics-engine.js` — agregaciones y cache central de analítica.
- `assets/js/analitica.js` — render analítico optimizado.
- `assets/js/dashboard.js` — dashboard optimizado y cálculo de estados mejorado.
- `assets/js/app.js` — corrección de doble render y sincronización de top bar.
- `assets/js/filtros.js` — filtro de integridad optimizado.
- `assets/js/store.js` — versión de datos y mediciones de normalización.

## Validación
- Sintaxis de todos los módulos JavaScript validada con `node --check`.
- `test-logica.mjs` ejecutado correctamente: todas las pruebas pasaron.
- HTML revisado para evitar IDs duplicados.
- Se conservaron los IDs y acciones requeridos por CRUD, filtros, modales, importación/exportación y perfiles.


## Ajustes V2.1 solicitados
- Se reemplazó el isotipo textual falso por el logo oficial de Talma cargado desde `https://www.talma.com.co/img/talma_white.png`.
- Se eliminó completamente la sección Tendencias.
- Se eliminó el bloque de Vigente / Recurrencia / Próximo a vencer / Vencido / Sin fecha del Resumen.
- En Personas se eliminaron Cursos realizados y Último curso.
- En el perfil de colaborador se eliminó Empresa, Cursos realizados y Último curso.
- Se corrigió el filtro Asistió/No asistió con normalización tolerante (`SI`, `SÍ`, `NO`, `No asistió`, etc.).
- Los filtros ahora cambian según la sección y los filtros ocultos dejan de afectar otras vistas.
- Se eliminaron botones de actualización manual y textos visibles de conexión/sincronización.
- Los datos siguen cargando automáticamente al abrir mediante la suscripción existente.


## V2.2 — corrección de carga inicial
- La carga de datos vuelve a iniciarse automáticamente al abrir la aplicación.
- Se mantiene `onSnapshot` para actualizaciones en tiempo real, pero ahora existe una consulta directa automática de respaldo si la escucha inicial tarda más de 2,2 segundos.
- Se habilitó autodetección de long polling para redes corporativas/proxies que dificultan el canal normal de Firestore.
- Se agregó `Traer datos` como recuperación manual, sin hacerlo requisito para usar la app.
- Se agregó versionado de CSS/JS para evitar que el navegador reutilice módulos antiguos después de desplegar una versión nueva.
- El logo oficial de Talma queda contenido dentro del sidebar con máximos de ancho/alto y `overflow:hidden`.
