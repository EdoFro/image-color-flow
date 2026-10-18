# Formato del proyecto

[Volver al proyecto](../README.md)

El proyecto editable es un JSON con extensión `.colorflow.json`. Incluye las imágenes originales como datos base64. Puede trasladarse sin archivos de imagen adicionales.

El formato actual es **6**. Su número es independiente de la versión de la aplicación: reorganizar carpetas no cambia el formato.

## Estructura principal

| Campo | Contenido |
| --- | --- |
| `format` | Identificador fijo `tinta-y-color`. |
| `version` | Versión del formato: se guarda `6`; se leen `1`, `2`, `3`, `4`, `5` y `6`. |
| `images.final` | Imagen coloreada obligatoria, con `name` y `data` (URL de datos de imagen). |
| `images.initial` | Imagen inicial opcional, con la misma estructura. |
| `baseMode` | `uploaded` para preparar la inicial o `derived` para desaturar la final. Sin inicial se utiliza `derived`. |
| `resolution` | Lado mayor de trabajo: 720, 1080 o 1440 píxeles. |
| `alignment` | Desplazamiento `x`, `y`, escalas `sx`, `sy` y giro `angle`. |
| `presentation` | Fondo exportado: `background` (`hatch`, `color` o `transparent`) y `color` hexadecimal; valores iniciales `hatch` y `#e5e7e3`. |
| `initialView` | Enfoque, acercamiento y destacado de Inicio; no contiene emisores. |
| `stages` | Lista ordenada de 1 a 64 etapas. |

Las coordenadas `x` e `y` de puntos, zonas y rectángulos son fracciones de las dimensiones correspondientes de la imagen, entre 0 y 1. Los radios y velocidades se expresan respecto al **ancho**. El giro de alineación y la dirección del viento usan grados. Los tiempos usan segundos.

## Etapas y emisores

Cada etapa contiene:

- `name`, hasta 80 caracteres, `enabled` para habilitar la etapa (predeterminado `true`) y `pauseAfter`, para esperar interacción al terminar.
- `zone`, polígono de al menos tres puntos, o `null` para toda la imagen.
- `points`, hasta 64 emisores ordenados.
- `path`, recorrido de pincel de hasta 2000 puntos, y `pathSpeed`.
- `radius`, `maxRadius`, `speed`, `clarity`, `ink`, `hueResistance`, `fade` y `blackThreshold`.
- `windStrength`, `windAngle` y los campos de vista descritos abajo.
- `cameraDuration`, duración de la transición de cámara y destacado desde la vista anterior; `paintDelay`, desfase inicial de pintura de 0 a 60 segundos, inicialmente 0; y `hold`, permanencia adicional de 0 a 60 segundos, inicialmente 0.

Un emisor tiene coordenadas `x`, `y` y estos campos:

| Campo | Significado |
| --- | --- |
| `enabled` | Si es `false`, no pinta ni interviene en las dependencias. Predeterminado: `true`. |
| `startMode` | `with`: junto al anterior activo; `after`: al terminar; `delay`: con demora desde su inicio. |
| `delay` | Demora en segundos, utilizada con `startMode: "delay"`. |
| `inheritRadii` | Hereda ambos radios de la etapa, salvo que sea `false`. |
| `radius`, `maxRadius` | Valores propios, utilizados cuando no hereda. |

El primer punto activo empieza en `paintDelay` segundos desde el inicio de su etapa, conservando su modo para posibles cambios de orden. El pincel comienza con el mismo `paintDelay` y utiliza los radios de la etapa en cada posición muestreada del recorrido.

## Vista de Inicio y de las etapas

| Campo | Significado y valor predeterminado |
| --- | --- |
| `frame` | Rectángulo `{x, y, width, height}` de enfoque; `null` indica página completa. |
| `zoom` | Acercamiento de 0 a 1; predeterminado 1. Con 0 se ve toda la página. |
| `highlightEnabled` | Habilita el destacado; predeterminado `false`. |
| `highlightLinked` | Usa `frame` como destacado; predeterminado `true`. |
| `highlightFrame` | Rectángulo independiente cuando no están vinculados; predeterminado `null`. |
| `outside` | `show`, `blur`, `black`, `white`, `color` o `transparent`; predeterminado `blur`. |
| `outsideColor` | Color hexadecimal `#RRGGBB`; predeterminado `#202c29`. |
| `blur` | Desenfoque de 0 a 40, escalado a la resolución de trabajo; predeterminado 12. |

Sin rectángulo de destacado se utiliza la página completa. Los ajustes del exterior solo actúan cuando el destacado está habilitado.

## Compatibilidad y validación

La apertura normaliza los datos mediante `validateProject` en `src/app.js` y las funciones de `src/engine.js`. El editor limita cantidades y rangos, valida las imágenes incorporadas y rechaza versiones desconocidas. No basta con cambiar `version` para convertir un formato futuro.

Los archivos de formato 2 conservan sus puntos, tiempos, radios, tono y encuadres. Al faltar los campos de formato 3 reciben Inicio de página completa, destacado desactivado, rectángulos vinculados y radios heredados. Los campos antiguos que falten, también en formato 1, reciben los valores del motor: por ejemplo, puntos activos simultáneos, resistencia al tono cero y radio máximo de 1,5 veces el ancho.

El formato 4 añade la permanencia y las opciones de fondo exportado. Al abrir formatos anteriores se asigna permanencia cero y fondo achurado. Las etapas sin emisores ahora se reproducen como etapas visuales, conservando sus opciones de cámara y pausa.

General no se almacena como etapa ni como conjunto de valores predeterminados: deriva el resumen de las etapas y puntos actuales y aplica cambios a esos datos. Los borradores pendientes no se serializan.

El formato 5 añade `enabled` a las etapas. Los proyectos anteriores mantienen todas sus etapas habilitadas al abrirse; la activación de los puntos es independiente. Una etapa deshabilitada se conserva completa en el proyecto y se omite de la presentación exportada.

La selección múltiple y sus pendientes son estado del editor y no se serializan. La visibilidad de la barra de presentación tampoco se guarda: cada apertura comienza con la barra oculta.

El formato 6 añade `paintDelay`. Los proyectos anteriores reciben desfase cero y conservan sus tiempos anteriores. Este desfase no retrasa la cámara ni el destacado, y no se suma a etapas visuales o deshabilitadas.

Los mapas de llegada no se guardan en el proyecto: se recalculan al reproducir o exportar.

## Presentación exportada

El HTML autónomo es un producto distinto. Incorpora imágenes preparadas, mapas temporales cuantizados, contribuciones tenues y el reproductor. No conserva las herramientas ni todos los datos necesarios para editar el proyecto. Sus mapas se empaquetan en `src/codec.js`; conserva siempre el JSON si necesitas continuar editando.
