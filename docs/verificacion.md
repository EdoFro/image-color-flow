# Verificación del proyecto

[Volver al proyecto](../README.md)

## v0.4.0 · General y etapas visuales

Fecha: 18 de octubre de 2026.

- 54 pruebas sin DOM y 62 pruebas correctas en Chrome. Los nuevos casos cubren etapas visuales, permanencia, pausas de duración cero, color acumulado, resumen de radios efectivos, aplicación colectiva, validación del lote y alcance opcional de Inicio.
- Transiciones comprobadas con píxeles reales: mezcla de negro a blanco con alfa opaco y paso gradual desde imagen opaca a exterior transparente.
- General comprobado en la interfaz: valores uniformes y variados, cambio pendiente, revisión de destinos, cancelación sin aplicar, conservación al navegar y confirmación que unifica el valor. Un valor fuera de rango bloquea la aplicación.
- Proyecto descargado de formato 4 revisado: conserva fondo exportado, permanencia y radios heredados. Un proyecto anterior de formato 3 se normaliza a 4 conservando sus encuadres, con permanencia cero y fondo achurado.
- Secuencia con todos los puntos desactivados reproducida como etapas visuales hasta la primera pausa, sin descartarlas.
- Presentación exportada comprobada en Chrome: fondo achurado real, borde y sombra del lienzo ausentes, última etapa visual conserva el color y deja ver el patrón a través del exterior transparente; sin errores de consola.
- Los fondos achurado, liso personalizado y transparente se comprobaron en la salida del constructor real de la presentación. Sintaxis del script incorporado correcta y sin recursos externos.
- Ejemplos editable y autónomo regenerados con una cuarta etapa exclusivamente visual. Capturas del editor, General y presentación actualizadas.

## v0.3.1 · Reorganización

Fecha: 18 de octubre de 2026.

- 44 pruebas sin DOM ejecutadas con `scripts/ejecutar-pruebas.mjs` y 50 pruebas correctas en Chrome desde `tests/index.html`.
- Editor cargado desde la raíz con scripts en `src/`, estilos en `assets/` y ejemplo en `examples/`; recursos servidos correctamente desde las nuevas rutas.
- Ejemplo calculado en el trabajador y reproducido hasta la primera pausa, con duración total de 14,1 segundos y sin errores de consola.
- Presentación existente abierta desde `examples/presentacion-ejemplo.html`, con Inicio listo y sin errores de consola. Su contenido autónomo y el proyecto editable se conservan sin cambios.
- Generador del ejemplo comprobado: datos de ambas imágenes idénticos a los incorporados antes de reorganizar y salida reproducible.
- Referencias locales del README, documentación y archivos HTML comprobadas; sin destinos ausentes.
- Sintaxis del código reubicado y del script de la presentación comprobada. La captura del editor se actualizó en `docs/images/`.
- Se mantiene el formato editable 3. La reorganización no introduce dependencias ni compilación.

## v0.3.0 · Funcionalidad

Fecha: 18 de octubre de 2026.

- Sintaxis JavaScript comprobada en los archivos del editor, motor, preparación, reproductor y pruebas.
- 44 pruebas sintéticas correctas en JavaScript y 50 dentro de Chrome. Las seis adicionales comprueban píxeles reales de los modos mostrar, desenfocar, negro, blanco, color y transparente. Incluyen las comprobaciones originales y nuevos casos de secuencias, primer activo, desactivación, reordenamiento, tono, radio máximo, pincel, borde tenue persistente, cámara, etapas omitidas y codificación de la exportación.
- Ejemplo con las dos imágenes proporcionadas calculado en un Web Worker y reproducido en Chrome. Pausas intermedias observadas; sin errores de consola durante la prueba.
- Herramientas de rectángulo, polígono cerrado con Enter y recorrido comprobadas mediante interacción con el lienzo.
- Preparación alternativa desde la imagen final aplicada en el diálogo y base desaturada comprobada visualmente.
- Guardado de proyecto descargado y contenido validado con las funciones reales del editor; se conservan imágenes, etapas y alineación. Archivo inválido rechazado por el validador.
- Exportación HTML descargada, sintaxis del script incorporado validada y mapas de tiempos revisados. Incluye dos imágenes PNG, tres mapas y el reproductor; no referencia recursos externos.
- Presentación exportada abierta y reproducida en Chrome, con pausa manual y desplazamiento al final de la secuencia.
- Doble clic sobre un punto comprobado: se elimina y se renumera la lista.
- Activación y reordenamiento de puntos comprobados en la interfaz; se conservan modo y demora. Una etapa vacía se omite y no consume su pausa.
- Encuadre arrastrado en el lienzo, vista previa comprobada y acercamiento observado en la presentación autónoma.
- Pincel probado sobre las imágenes de ejemplo con todos los puntos desactivados y radio máximo del 10%: colorea una franja y conserva el resto de la página como base.
- Proyecto descargado de formato 2 revisado: contiene activación, modos, demoras, ambos radios, tono y encuadres.

- Inicio, enfoque y destacado independientes comprobados en el editor: zoom al 0%, desenfoque y transparencia con damero.
- Renombrado con doble clic y lápiz comprobado; Enter guarda y Escape conserva el nombre anterior.
- Arrastre del asa de tinta comprobado: cambia de 22% a 30% solo en el punto, desactiva la herencia y conserva el 22% de la etapa. La casilla restaura la herencia.
- Presentación exportada con Inicio transparente y destacado independiente abierta en Chrome; conserva el canal alfa, comienza desde la base y restaura Inicio al reiniciar.
- Pruebas del motor para radios propios y heredados, límite por punto, inversión del viento, normalización de vista, zoom independiente y metadatos de destacado en el códec.
- Ejemplos editable y autónomo regenerados con formato 3 y los valores predeterminados acordados.

## Límites de la comprobación

La automatización del navegador solo permite direcciones HTTP/HTTPS. La revisión visual se hizo mediante un servidor temporal enlazado únicamente a `127.0.0.1`, limitado a los archivos de esta aplicación. El editor y la exportación usan scripts locales y datos incorporados, sin peticiones de red, pero la apertura directa mediante `file://` no pudo automatizarse.

La extensión de Chrome no tiene el permiso de acceso a archivos requerido para automatizar su selector. Se verificaron la descarga y el contenido del proyecto; no se completó la reapertura mediante el selector del navegador ni la carga de imágenes nuevas por ese selector. No se modificaron los permisos de la extensión.

La alineación se comprobó con las imágenes proporcionadas; otros pares pueden requerir ajustes manuales. No se han realizado pruebas en otros navegadores ni en dispositivos móviles.
