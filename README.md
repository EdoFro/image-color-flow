# Tinta y color

Editor local para animar la aparición del color en dibujos con tinta. Funciona sin instalación, sin servicios externos y sin acceso a internet.

## Abrir

Abre **index.html** en Chrome o Edge. Los archivos JS y CSS deben permanecer junto al HTML. El ejemplo se incluye en `demo-data.js` para no tener que leer imágenes locales mediante peticiones web.

1. En **Imágenes**, carga la versión coloreada y opcionalmente la inicial.
2. Elige entre neutralizar el papel del archivo inicial o generar una base desaturada desde la final. Con dos imágenes puedes alinear automáticamente sus contornos y afinar posición, escalas y giro con una superposición de referencia.
3. Crea etapas, ponles nombre y ordénalas con las flechas de la lista.
4. Delimita cada zona con un rectángulo o polígono. El polígono se cierra con **Enter** o doble clic; **Escape** cancela los vértices pendientes.
5. Con **Puntos**, haz clic para añadir y arrastra para mover. Un doble clic sobre un punto lo elimina; también puedes eliminarlo desde el inspector.
6. En la lista de puntos, usa ↑/↓ para ordenarlos y la casilla para activarlos o desactivarlos. Elige su modo de inicio y demora. Después de calcular verás los instantes de inicio y fin.
7. Opcionalmente, arrastra con **Recorrido**. El pincel se desplaza por ese trazo y deja propagación detrás. Puntos y recorrido pueden coexistir; desactiva los puntos si quieres que solo pinte el pincel.
8. Ajusta velocidades, ambos radios, resistencia al tono y viento. Reproduce para calcular y ver la animación. Cada etapa puede esperar un clic o una tecla antes de continuar.
9. Con **Encuadre**, arrastra un rectángulo para acercar esa parte durante la etapa. **Ver encuadre** permite revisarlo; **Página completa** quita el acercamiento. Ajusta la duración de la transición.
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

Cada etapa puede tener un encuadre o mostrar la página completa. La cámara se mueve suavemente desde el encuadre anterior mientras pinta, conserva su posición en las pausas y puede volver a la vista general en una etapa posterior. El rectángulo se amplía cuando es necesario para conservar las proporciones de la imagen, sin deformarla. La cámara no cambia las zonas, radios ni coordenadas del dibujo.

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

Se guardan proyectos de formato 2 y se pueden abrir también los de formato 1. A los antiguos se les asignan puntos activos simultáneos, resistencia al tono cero, radio máximo del 150% del ancho y vista de página completa.

## Cómo se propaga el color

Se calculan mapas de llegada independientes mediante caminos de coste mínimo sobre ocho vecinos (Dijkstra). Cada píxel tiene resistencia según la luminosidad de la **imagen final**; la tinta y los cambios de tono añaden demora. Los tiempos se calculan en un Web Worker. La reproducción mezcla la base con la imagen final según esos tiempos y conserva las contribuciones tenues del borde.

- **Velocidad base** y **velocidad del pincel**: fracciones del ancho de la imagen por segundo. La resolución no multiplica el tiempo de animación, aunque el muestreo y el grosor de las líneas pueden cambiar ligeramente el resultado.
- **Impulso en colores claros**: velocidad multiplicada por `1 + claridad × luminosidad / 255`.
- **Demora de tinta**: resistencia multiplicada por `1 + demora` en píxeles bajo el umbral de negro.
- **Resistencia al cambio de tono**: demora las transiciones entre tonos de píxeles vecinos. Usa distancia circular de tono para que dos rojos a ambos lados de 0°/360° sigan siendo parecidos. Disminuye su influencia cerca de tonos neutros y negros; no es una barrera infranqueable.
- **Radio para atravesar tinta**: fracción del ancho; dentro se permite atravesar negro con demora. Fuera, la tinta bloquea el avance. No detiene el color en zonas claras.
- **Radio máximo**: límite obligatorio alrededor de cada emisor. Hasta el 80% puede aparecer color completo; del 80% al 100% pierde intensidad suavemente; fuera no pinta. No reduce la velocidad y el color depositado no desaparece.
- **Viento**: la velocidad y ambos radios se multiplican por `exp(fuerza × cos(ángulo respecto al viento))`. Con fuerza cero conservan su comportamiento radial. 0° apunta a la derecha; 90°, hacia abajo.
- **Varios emisores**: cada uno respeta sus propios radios, inicio y barreras; un punto futuro no habilita el paso a uno anterior. Se conserva la contribución más intensa que haya llegado, sin sumar ni oscurecer los solapamientos.
- **Pincel**: cada posición muestreada del trazo emite al pasar el pincel y tiene su propio radio máximo. La huella final forma una franja alrededor de todo el recorrido, deformada por el viento; el radio no se mide desde el comienzo del trazo.
- **Zonas**: siempre son límites obligatorios. No se cruza diagonalmente por una esquina cerrada.
- **Duración**: el final más tardío entre todos los emisores y la transición de cámara. La duración total suma etapas y excluye pausas que esperan interacción y etapas omitidas.
- **Solapamiento**: el color ya revelado por una etapa anterior se conserva, incluida su intensidad parcial en los bordes.

Los tiempos exportados se cuantizan a 16 bits por etapa; su precisión es la duración de la etapa dividida por 65 534. Las contribuciones tenues se guardan con intensidad de 8 bits. La vista previa y la exportación usan el mismo reproductor.

## Alcance y límites de esta versión

- Imágenes raster PNG, JPEG, WebP, GIF, BMP y AVIF que el navegador pueda decodificar. En formatos animados se utiliza una imagen estática.
- Resolución de trabajo de 720, 1080 o 1440 píxeles de lado mayor; los originales se conservan en el proyecto. Hasta 64 etapas, 64 puntos por etapa y un recorrido por etapa.
- La alineación compensa desplazamiento, escala por eje y giro; no corrige redibujos o deformaciones locales. Una imagen inicial derivada de la final coincide exactamente en geometría.
- La base derivada desatura los colores y conserva las sombras. No reconstruye un dibujo de tinta sin todas sus aguadas.
- Las líneas abiertas pueden dejar pasar color: delimita una zona si necesitas un contorno garantizado. El umbral de negro permite adaptar el motor a tinta gris o fotografías.
- El estilo es una revelación guiada por el dibujo, no una simulación física de acuarela. El tono genera demora; no se incluye una barrera rígida por tono ni seguimiento automático de cámara al pincel.
- El trazo se muestrea por longitud de arco. Muchos emisores, trazos largos y resoluciones altas requieren más cálculo y pueden producir exportaciones mayores.
- No se incluyen audio, exportación de video ni procesamiento por lotes.

## Archivos

Sin bibliotecas ni pasos de compilación:

- `index.html`, `styles.css`, `app.js`: editor e intercambio de archivos.
- `engine.js`: propagación y validación de parámetros, sin dependencia del DOM.
- `preparation.js`: normalización del papel y alineación de imágenes.
- `player.js`: reproducción compartida con las presentaciones exportadas.
- `codec.js`: empaquetado y lectura de tiempos, bordes tenues y encuadres en la presentación autónoma.
- `demo-data.js`: las dos imágenes de prueba incorporadas como datos locales.
- `tests.html`, `tests.js`: pruebas sintéticas del motor y del reproductor. Abre `tests.html` para ejecutarlas.

Para desarrollo también puede servirse esta carpeta con cualquier servidor estático local; no es necesario para el uso normal.

Se incluyen `ejemplo.colorflow.json`, una configuración editable de las imágenes de prueba, y `presentacion-ejemplo.html`, una presentación ya exportada. Consulta `VERIFICACION.md` para las comprobaciones realizadas y sus límites.

## Control de versiones

El proyecto utiliza Git localmente, con la rama principal `main`. La etiqueta `v0.1.0` conserva la primera versión funcional; `v0.2.0` incorpora secuencias de puntos, tono, radio máximo y encuadres. Los cambios se detallan en `CHANGELOG.md`.

Comandos útiles desde esta carpeta:

```sh
git status
git log --oneline --decorate
git diff
```

Los ejemplos y las imágenes de prueba se conservan en el historial. Los archivos temporales y la configuración privada local se excluyen mediante `.gitignore`.
