# Talma Mercancías Dashboard V2

Aplicación empresarial para gestionar y analizar capacitaciones de mercancías peligrosas. Conserva el proyecto Firebase, la colección `capacitaciones`, Firebase Storage, el CRUD, la carga/exportación Excel, los filtros y la lógica de vigencias de la versión anterior.

## Uso

Sirve la carpeta desde un servidor HTTP estático y abre `index.html`. No requiere compilación ni migración de datos. Por seguridad de los módulos ES y Firebase, no se recomienda abrir el archivo con `file://`.

Ejemplo:

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080/index.html`.

## Navegación

- **Resumen:** KPIs esenciales, tendencia, hallazgos, alertas, ranking por base y calidad.
- **Registros:** tabla paginada con búsqueda, filtros, CRUD, acciones masivas e importación/exportación.
- **Personas:** personas únicas y perfil lateral con historial, vigencias y documentos.
- **Cursos:** portafolio y perfil lateral consolidado.
- **Grupos:** cohortes y perfil lateral de participantes.

## Certificados personalizados

En el perfil de cada persona, cada fila del historial incluye la acción **Configurar**. Desde allí puedes:

- personalizar número, categoría, metodología, ciudad, tratamiento y licencia del instructor;
- guardar esos campos en el mismo registro de `capacitaciones` en Firestore;
- descargar el certificado PDF con los datos reales del colaborador;
- guardar el PDF en Firebase Storage y verlo después en Documentos.

La plantilla institucional está en `assets/pdf/PLANTILLA-CERTIFICADO.pdf`. Ese archivo sí puede vivir en GitHub porque es estático. Los datos personalizados y los certificados generados se guardan en Firebase, no en GitHub.

## Arquitectura

```text
Firestore (1 listener)
  → normalización y derivados
  → índices por dimensión
  → filtro con cache LRU
  → agregación de una sola pasada
  → KPIs / hallazgos / tablas
  → gráficos lazy con actualización incremental
```

Los detalles técnicos y los problemas corregidos están en `CAMBIOS-V2.md`.

## Pruebas

```bash
node test-logica.mjs
node test-v2.mjs
```
