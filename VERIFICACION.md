# Verificación de la primera versión

Fecha: 18 de octubre de 2026.

- Sintaxis JavaScript comprobada en los archivos del editor, motor, preparación, reproductor y pruebas.
- 17 pruebas sintéticas correctas en JavaScript y también dentro de Chrome. Incluyen propagación radial, claridad, resistencia de tinta, barreras fuera del radio, límites de zonas, esquinas diagonales, dirección y radio del viento, múltiples puntos, recorrido progresivo, duración, independencia aproximada de resolución y estados del reproductor.
- Ejemplo con las dos imágenes proporcionadas calculado en un Web Worker y reproducido en Chrome. Pausas intermedias observadas; sin errores de consola durante la prueba.
- Herramientas de rectángulo, polígono cerrado con Enter y recorrido comprobadas mediante interacción con el lienzo.
- Preparación alternativa desde la imagen final aplicada en el diálogo y base desaturada comprobada visualmente.
- Guardado de proyecto descargado y contenido validado con las funciones reales del editor; se conservan imágenes, etapas y alineación. Archivo inválido rechazado por el validador.
- Exportación HTML descargada, sintaxis del script incorporado validada y mapas de tiempos revisados. Incluye dos imágenes PNG, tres mapas y el reproductor; no referencia recursos externos.
- Presentación exportada abierta y reproducida en Chrome, con pausa manual y desplazamiento al final de la secuencia.

## Límites de la comprobación

La automatización del navegador solo permite direcciones HTTP/HTTPS. La revisión visual se hizo mediante un servidor temporal enlazado únicamente a `127.0.0.1`, limitado a los archivos de esta aplicación. El editor y la exportación usan scripts locales y datos incorporados, sin peticiones de red, pero la apertura directa mediante `file://` no pudo automatizarse.

La extensión de Chrome no tiene el permiso de acceso a archivos requerido para automatizar su selector. Se verificaron la descarga y el contenido del proyecto; no se completó la reapertura mediante el selector del navegador ni la carga de imágenes nuevas por ese selector. No se modificaron los permisos de la extensión.

La alineación se comprobó con las imágenes proporcionadas; otros pares pueden requerir ajustes manuales. No se han realizado pruebas en otros navegadores ni en dispositivos móviles.
