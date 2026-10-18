# Tinta y color

Editor local para animar la aparición del color en dibujos con tinta. Funciona sin instalación, sin servicios externos y sin acceso a internet.

## Abrir

Abre **index.html** en Chrome o Edge. Los archivos JS y CSS deben permanecer junto al HTML. El ejemplo se incluye en `demo-data.js` para no tener que leer imágenes locales mediante peticiones web.

1. En **Imágenes**, carga la versión coloreada y opcionalmente la inicial.
2. Elige entre neutralizar el papel del archivo inicial o generar una base desaturada desde la final. Con dos imágenes puedes alinear automáticamente sus contornos y afinar posición, escalas y giro con una superposición de referencia.
3. Crea etapas, ponles nombre y ordénalas con las flechas de la lista.
4. Delimita cada zona con un rectángulo o polígono. El polígono se cierra con **Enter** o doble clic; **Escape** cancela los vértices pendientes.
5. Haz clic en el lienzo para añadir puntos de inicio. Arrástralos para moverlos. Para eliminarlos, usa sus botones en el inspector.
6. Opcionalmente, arrastra con la herramienta **Recorrido**. El pincel se desplaza por ese recorrido y deja propagación detrás. Puntos y recorrido pueden coexistir; quita los puntos si quieres que solo pinte el pincel.
7. Ajusta velocidades, radio y viento. Reproduce para calcular y ver la animación. Cada etapa puede esperar un clic o una tecla antes de continuar.
8. Descarga el **proyecto** para retomarlo y **Exportar HTML** para presentar.

En **Editar**, el lienzo muestra la imagen final como referencia con las guías encima; **Imagen inicial** permite revisar la base preparada. La reproducción comienza desde esa base.

## Presentar sin conexión

La exportación es **un único archivo HTML**: incluye la base preparada, la imagen final, los mapas de tiempos y el reproductor. No necesita la carpeta del editor, servidor, instalación ni conexión. Ábrelo con un navegador y haz clic en Reproducir.

- **Espacio**: reproducir, pausar o continuar después de una pausa.
- **← / →**: cambiar de etapa.
- **Clic en la imagen**: reproducir, pausar o continuar.
- **F** o el botón correspondiente: pantalla completa. F11 es una alternativa del navegador.
- La barra permite desplazarse por la secuencia; el tiempo mostrado excluye pausas manuales.
- Al cambiar a otra pestaña, la reproducción se pausa.

Para integrarlo en otra presentación web, conserva el HTML exportado junto a ella y enlázalo o úsalo dentro de un `iframe`. Si el contenedor restringe scripts o usa `sandbox`, debe permitir scripts; añade `allowfullscreen` si necesitas pantalla completa.

Guarda un proyecto `.colorflow.json` para seguir editando: contiene las imágenes originales, zonas, puntos, recorridos, alineación y parámetros. El HTML de presentación es un producto final y no sustituye al proyecto editable. Las descargas se guardan en la carpeta que elija tu navegador.

## Cómo se propaga el color

Se calcula un mapa de llegada con una búsqueda de caminos de coste mínimo sobre ocho vecinos (Dijkstra). Cada píxel tiene resistencia según la luminosidad de la **imagen final**, y la tinta añade demora. Los tiempos se calculan en un Web Worker para no bloquear la interfaz. La reproducción solo mezcla la base con la imagen final según esos tiempos, con una transición suave por píxel.

- **Velocidad base** y **velocidad del pincel**: fracciones del ancho de la imagen por segundo. La resolución no multiplica el tiempo de animación, aunque el muestreo y el grosor de las líneas pueden cambiar ligeramente el resultado.
- **Impulso en colores claros**: velocidad multiplicada por `1 + claridad × luminosidad / 255`.
- **Demora de tinta**: resistencia multiplicada por `1 + demora` en píxeles bajo el umbral de negro.
- **Radio**: fracción del ancho; dentro se permite atravesar negro con demora. Fuera, la tinta bloquea el avance. No es un corte del color en zonas claras.
- **Viento**: en una dirección de avance, la velocidad y el radio se multiplican por `exp(fuerza × cos(ángulo respecto al viento))`. Con fuerza cero, ambos conservan el comportamiento original. 0° apunta a la derecha; 90°, hacia abajo.
- **Varios emisores**: se toma la primera llegada; sus radios de cruce se combinan. Para el recorrido, los radios se calculan sobre el conjunto de puntos emisores del trazo, mientras la emisión sigue el tiempo de paso del pincel.
- **Zonas**: siempre son límites obligatorios. No se cruza diagonalmente por una esquina cerrada.
- **Duración**: última llegada alcanzable más el tiempo de aparición del píxel. La duración total suma etapas y excluye las pausas que esperan interacción.
- **Solapamiento**: el color ya revelado por una etapa anterior se conserva.

Los mapas exportados se cuantizan a 16 bits por etapa para reducir tamaño; la precisión temporal es la duración de la etapa dividida por 65 534.

## Alcance y límites de esta versión

- Imágenes raster PNG, JPEG, WebP, GIF, BMP y AVIF que el navegador pueda decodificar. En formatos animados se utiliza una imagen estática.
- Resolución de trabajo de 720, 1080 o 1440 píxeles de lado mayor; los originales se conservan en el proyecto. Hasta 64 etapas, 64 puntos por etapa y un recorrido por etapa.
- La alineación compensa desplazamiento, escala por eje y giro; no corrige redibujos o deformaciones locales. Una imagen inicial derivada de la final coincide exactamente en geometría.
- La base derivada desatura los colores y conserva las sombras. No reconstruye un dibujo de tinta sin todas sus aguadas.
- Las líneas abiertas pueden dejar pasar color: delimita una zona si necesitas un contorno garantizado. El umbral de negro permite adaptar el motor a tinta gris o fotografías.
- El estilo es una revelación guiada por el dibujo, no una simulación física de acuarela. La barrera por cambio de tono y el movimiento de cámara quedan para una siguiente versión.
- No se incluyen audio, exportación de video ni procesamiento por lotes.

## Archivos

Sin bibliotecas ni pasos de compilación:

- `index.html`, `styles.css`, `app.js`: editor e intercambio de archivos.
- `engine.js`: propagación y validación de parámetros, sin dependencia del DOM.
- `preparation.js`: normalización del papel y alineación de imágenes.
- `player.js`: reproducción compartida con las presentaciones exportadas.
- `demo-data.js`: las dos imágenes de prueba incorporadas como datos locales.
- `tests.html`, `tests.js`: pruebas sintéticas del motor y del reproductor. Abre `tests.html` para ejecutarlas.

Para desarrollo también puede servirse esta carpeta con cualquier servidor estático local; no es necesario para el uso normal.

Se incluyen `ejemplo.colorflow.json`, una configuración editable de las imágenes de prueba, y `presentacion-ejemplo.html`, una presentación ya exportada. Consulta `VERIFICACION.md` para las comprobaciones realizadas y sus límites.

## Control de versiones

El proyecto utiliza Git localmente, con la rama principal `main`. La etiqueta `v0.1.0` identifica la primera versión funcional, anterior a las mejoras de tono, radio máximo y encuadres.

Comandos útiles desde esta carpeta:

```sh
git status
git log --oneline --decorate
git diff
```

Los ejemplos y las imágenes de prueba se conservan en el historial. Los archivos temporales y la configuración privada local se excluyen mediante `.gitignore`.
