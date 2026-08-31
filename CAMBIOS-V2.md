# Cambios V2

## Resultado

La aplicación se reestructuró como un centro de aprendizaje empresarial inspirado en Talma, Microsoft Fluent y Power BI. No es un cambio de tema: se sustituyeron la jerarquía de navegación, la composición de las vistas, el pipeline de datos, el ciclo de render y la administración de gráficos.

## Problemas de rendimiento encontrados

1. **Doble render al navegar.** El router ejecutaba el render de la ruta y luego el callback de navegación volvía a ejecutar la misma vista.
2. **Gráficos reconstruidos.** Cada notificación destruía y creaba de nuevo todas las instancias Chart.js, incluso cuando solo cambiaba un filtro o la vista ni siquiera estaba activa.
3. **Múltiples recorridos por widget.** Dashboard y Analítica repetían `.filter()`, `.map()`, `.reduce()`, agrupaciones y ordenamientos sobre el mismo arreglo para cada KPI y gráfico.
4. **Agregaciones repetidas entre vistas.** Personas, cursos, grupos, perfiles y tablas recalculaban agrupaciones completas cada vez que el store notificaba.
5. **Detección de duplicados con búsqueda lineal interna.** El cálculo de integridad usaba `data.find()` dentro de recorridos, generando comportamiento cercano a O(n²).
6. **Filtros sin cache.** Volver a una combinación ya usada recorría otra vez toda la colección y reconstruía todas las métricas.
7. **Selectores regenerados.** Las opciones de base, curso, grupo, salón e instructor se reconstruían en cada cambio de filtro y cada pulsación de búsqueda.
8. **Actualización Firebase redundante.** El botón manual ejecutaba `getDocs()` aunque `onSnapshot()` ya mantenía una suscripción en tiempo real.
9. **Importación masiva costosa.** Cada fila nueva se comparaba contra la colección completa en lugar de usar el índice de persona.
10. **Render global.** Los gráficos de Analítica podían procesarse como parte de notificaciones generales, sin una política progresiva por ruta.

## Arquitectura implementada

- `data-engine.js` es un motor puro sin DOM ni Firebase.
- Una única suscripción `onSnapshot()` alimenta el store.
- Cada documento se normaliza y decora una sola vez con identidad, texto de búsqueda, nota numérica, horas, periodo, estado de vigencia y problemas de calidad.
- Se crean mapas O(1) por ID y conjuntos invertidos por curso, grupo, base, instructor, salón, fecha y persona.
- Se precalculan relaciones completas de persona, curso y grupo para perfiles laterales.
- El filtro parte de la intersección de índices exactos y solo evalúa búsqueda/rangos sobre el conjunto candidato.
- La combinación de filtros usa una clave estable y cache LRU de 24 resultados.
- Cada resultado filtrado se agrega en una sola pasada para producir KPIs, dimensiones, estados, calidad, notas, recientes e inasistencias.
- Los gráficos consumen únicamente `store.metrics`; no recorren la colección original.

## Gráficos

- Se agregó `chart-manager.js` para reutilizar instancias y ejecutar `chart.update("none")`.
- Animaciones desactivadas en actualizaciones y `resizeDelay` para reducir trabajo durante cambios de tamaño.
- Puntos ocultos en series largas y decimación habilitada en tendencias.
- Resumen renderiza primero KPIs, hallazgos, alertas y calidad; tendencia y rankings entran en tiempo ocioso.
- Analítica solo crea sus gráficos al entrar a la ruta y los carga en dos fases.
- Comparaciones limitadas a los 15 elementos con mayor volumen para mantener legibilidad y rendimiento.

## Experiencia y navegación

- Navegación final: **Resumen, Registros, Personas, Cursos, Grupos y Analítica**.
- Menú lateral permanente y barra de comandos superior al estilo Fluent.
- Resumen ejecutivo con cuatro KPIs no redundantes.
- Panel de **Hallazgos** calculado desde los agregados reales.
- Alertas por baja asistencia, vigencias y calidad de datos.
- Ranking de bases y tendencia temporal.
- Analítica con comparación seleccionable por curso, base, instructor o grupo.
- Perfiles laterales para personas, cursos y grupos.
- Tablas de registros y personas paginadas; el DOM no recibe miles de filas.
- Diseño adaptable, modo oscuro y estados de carga/error conservados.

## Funciones conservadas

- Configuración y proyecto Firebase originales.
- Colección `capacitaciones` y colección `documentos`.
- Firebase Storage para adjuntos.
- Crear, editar y eliminar registros.
- Edición y eliminación masiva por lotes de 450 operaciones.
- Importación Excel/CSV con UPSERT, validación y previsualización.
- Exportación Excel del universo filtrado.
- Búsqueda y filtros globales.
- Vigencias, recurrencias y reglas de negocio existentes.

## Validación realizada

- Pruebas de sintaxis para todos los módulos JavaScript.
- Suite de lógica de negocio original: aprobada.
- Suite V2 con 12.000 registros sintéticos: indexación, filtro, agregación, rankings e insights.
- Prueba en navegador de las seis rutas, filtros, búsqueda, tabla paginada, cambio de dimensión analítica y perfiles laterales.
- Conexión real de lectura a Firebase confirmada mediante el listener único.
- Modal de alta CRUD y flujos de edición/importación verificados sin escribir datos de prueba en producción.
- Error de configuración Chart.js detectado durante QA y corregido; validación final sin errores nuevos de consola.

## Medición de referencia

En la ejecución de prueba incluida (`test-v2.mjs`) con 12.000 registros:

- construcción del modelo e índices: ~1,6 s;
- filtro indexado: ~4 ms;
- agregación del resultado: ~8 ms.

Los tiempos dependen del equipo, pero la prueba incluye umbrales para detectar regresiones algorítmicas.

