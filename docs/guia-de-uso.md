# Guía de uso

[Volver al proyecto](../README.md)

## Abrir

Abre [index.html](../index.html) en Chrome o Edge. Conserva la estructura completa de carpetas al copiar o descomprimir el editor. El ejemplo se incluye en `examples/demo-data.js` para no tener que leer imágenes locales mediante peticiones web.

1. En **Imágenes**, carga la versión coloreada y opcionalmente la inicial.
2. Elige entre neutralizar el papel del archivo inicial o generar una base desaturada desde la final. Con dos imágenes puedes alinear automáticamente sus contornos y afinar posición, escalas y giro con una superposición de referencia.
3. Crea etapas y ordénalas con las flechas de la lista. Para renombrar, haz doble clic en el nombre, usa el lápiz o edita el campo del inspector. Enter guarda y Escape cancela.
4. Delimita cada zona con un rectángulo o polígono. El polígono se cierra con **Enter** o doble clic; **Escape** cancela los vértices pendientes.
5. Con **Puntos**, haz clic para añadir y arrastra para mover. Un doble clic sobre un punto lo elimina; también puedes eliminarlo desde el inspector.
6. En la lista de puntos, usa ↑/↓ para ordenarlos y la casilla para activarlos o desactivarlos. Elige su modo de inicio y demora. Después de calcular verás los instantes de inicio y fin.
7. Opcionalmente, arrastra con **Recorrido**. El pincel se desplaza por ese trazo y deja propagación detrás. Puntos y recorrido pueden coexistir; desactiva los puntos si quieres que solo pinte el pincel.
8. Ajusta velocidades, ambos radios, resistencia al tono y viento. Reproduce para calcular y ver la animación. Cada etapa puede esperar un clic o una tecla antes de continuar.
9. Selecciona **Inicio** para definir la vista que verá el público antes de comenzar. En cada etapa, **Encuadre** delimita el enfoque y el control de acercamiento regula el zoom. **Habilitar destacado** permite tratar el exterior de ese rectángulo o dibujar otro independiente.
10. Descarga el **proyecto** para retomarlo y **Exportar HTML** para presentar.

En **Editar**, el lienzo muestra la imagen final como referencia con las guías encima; **Imagen inicial** permite revisar la base preparada. La reproducción comienza desde esa base.

## Orden y tiempos de los puntos

- **Junto al anterior activo**: comparte el instante de inicio del punto activo anterior.
- **Al terminar el anterior activo**: espera a que termine su propia expansión, incluidos los últimos píxeles y su transición.
- **Con demora desde el anterior activo**: comienza X segundos después de que ese anterior comienza; pueden pintar al mismo tiempo.
- El **primer punto activo empieza en 0 s**. Conserva su modo y demora configurados para cuando vuelva a tener un anterior activo.
- Reordenar cambia los números en el lienzo. Cada punto conserva coordenadas, activación, modo y demora; las dependencias se recalculan.
- Los desactivados aparecen atenuados y no emiten color ni intervienen en los tiempos. Si el punto 2 está desactivado, el 3 depende del 1.
- La duración propia no se acorta por solaparse con pintura de otro emisor. Las etapas sin puntos activos ni recorrido se omiten, incluida su pausa.
- El recorrido de pincel empieza al comenzar la etapa, independientemente de la secuencia de puntos.

## Encuadres

**Inicio** es una vista previa a la primera etapa: muestra la base preparada y espera Reproducir, un clic en la imagen o Espacio. No pinta ni cuenta como etapa. Reiniciar regresa a ella.

Cada etapa tiene su propio enfoque y acercamiento. Con 0% se ve la página completa y con 100% la cámara se ajusta al rectángulo, conservando las proporciones. La cámara pasa suavemente desde la vista anterior mientras pinta y conserva su posición durante las pausas. Los encuadres no cambian las zonas ni las coordenadas de propagación.

**Habilitar destacado** viene desmarcado. Al activarlo, el exterior puede mostrarse normal, desenfocado, negro, blanco, de color personalizado o transparente. La intensidad del desenfoque es ajustable. **Usar el mismo rectángulo para enfoque y destacado** viene marcado; al desmarcarlo puedes dibujar el destacado por separado con su herramienta. Esto permite destacar una viñeta sin acercarla. El tratamiento se aplica al dibujo antes del recorte de cámara.

La transparencia usa el canal alfa real: el editor la representa con un damero y la presentación permite ver el fondo de la página que la contiene. El fondo del documento de presentación también se vuelve transparente mientras esté activo ese modo; la barra de controles conserva su fondo.

## Radios con el mouse

En **Puntos**, selecciona un origen en el lienzo o con **Editar radios** en la lista. El radio de tinta tiene una línea naranja discontinua y el máximo una azul continua, ambos con halo claro y oscuro. Por defecto solo aparecen los del punto seleccionado; **Mostrar todos los radios** permite compararlos.

Arrastra el asa **T** o **M** para cambiar cada radio. El punto usa inicialmente los valores de la etapa; al arrastrar pasa a valores propios. Marca **Usar radios de la etapa** para recuperar la herencia. También puedes ajustar sus dos deslizadores en el inspector. Con viento, las asas modifican el radio base y conservan la deformación. El pincel sigue utilizando ambos radios de la etapa en cada posición del recorrido.

## Presentar sin conexión

La exportación es **un único archivo HTML**: incluye la base preparada, la imagen final, los mapas de tiempos y el reproductor. No necesita la carpeta del editor, servidor, instalación ni conexión. Ábrelo con un navegador y haz clic en Reproducir.

- **Espacio**: reproducir, pausar o continuar después de una pausa.
- **← / →**: cambiar de etapa.
- **Clic en la imagen**: reproducir, pausar o continuar.
- **F** o el botón correspondiente: pantalla completa. F11 es una alternativa del navegador.
- La barra permite desplazarse por la secuencia; el tiempo mostrado excluye pausas manuales.
- Al cambiar a otra pestaña, la reproducción se pausa.

Para integrarlo en otra presentación web, conserva el HTML exportado junto a ella y enlázalo o úsalo dentro de un `iframe`. Si el contenedor restringe scripts o usa `sandbox`, debe permitir scripts; añade `allowfullscreen` si necesitas pantalla completa.

Guarda un proyecto `.colorflow.json` para seguir editando: contiene las imágenes originales, zonas, orden y activación de puntos, modos de inicio, recorridos, alineación, encuadres y parámetros. El HTML de presentación es un producto final y no sustituye al proyecto editable. Las descargas se guardan en la carpeta que elija tu navegador.

Se guardan proyectos de formato 3 y se pueden abrir también los de formatos 1 y 2. Se conservan los campos presentes en cada archivo; los ausentes reciben valores predeterminados. Consulta el [formato del proyecto](formato-del-proyecto.md) para los detalles de compatibilidad.

## Alcance y límites de esta versión

- Imágenes raster PNG, JPEG, WebP, GIF, BMP y AVIF que el navegador pueda decodificar. En formatos animados se utiliza una imagen estática.
- Resolución de trabajo de 720, 1080 o 1440 píxeles de lado mayor; los originales se conservan en el proyecto. Hasta 64 etapas, 64 puntos por etapa y un recorrido por etapa.
- La alineación compensa desplazamiento, escala por eje y giro; no corrige redibujos o deformaciones locales. Una imagen inicial derivada de la final coincide exactamente en geometría.
- La base derivada desatura los colores y conserva las sombras. No reconstruye un dibujo de tinta sin todas sus aguadas.
- Las líneas abiertas pueden dejar pasar color: delimita una zona si necesitas un contorno garantizado. El umbral de negro permite adaptar el motor a tinta gris o fotografías.
- El estilo es una revelación guiada por el dibujo, no una simulación física de acuarela. El tono genera demora; no se incluye una barrera rígida por tono ni seguimiento automático de cámara al pincel.
- El trazo se muestrea por longitud de arco. Muchos emisores, trazos largos y resoluciones altas requieren más cálculo y pueden producir exportaciones mayores.
- No se incluyen audio, exportación de video ni procesamiento por lotes.
