# Formato del proyecto

[English](en/project-format.md) | **Español**

[Volver al proyecto](../README.es.md)

El proyecto editable es un JSON con extensión `.colorflow.json`. Incluye las imágenes originales como datos base64. Puede trasladarse sin archivos de imagen adicionales.

El formato actual es **10**. Su número es independiente de la versión de la aplicación: reorganizar carpetas no cambia el formato.

## Estructura principal

| Campo | Contenido |
| --- | --- |
| `format` | Identificador fijo `tinta-y-color`. |
| `version` | Versión del formato: se guarda `10`; se leen formatos `1` a `10`. |
| `images.final` | Imagen coloreada obligatoria para preparar/reproducir/exportar; puede omitirse sólo en un borrador vacío del editor. Contiene `name` y `data` (URL de datos de imagen). |
| `images.initial` | Imagen inicial opcional, con la misma estructura. |
| `baseMode` | `uploaded` para preparar la inicial o `derived` para generarla desde la final. Sin inicial se utiliza `derived`. |
| `baseGeneration` | Método y parámetros globales para generar la base; sólo actúan en `derived`. |
| `resolution` | Lado mayor de trabajo: 720, 1080 o 1440 píxeles. |
| `alignment` | Desplazamiento `x`, `y`, escalas `sx`, `sy` y giro `angle`. |
| `presentation` | Fondo exportado: `background` (`hatch`, `color` o `transparent`) y `color` hexadecimal; valores iniciales `hatch` y `#e5e7e3`. |
| `initialView` | Enfoque, acercamiento y destacado de Inicio; no contiene emisores. |
| `stages` | Lista ordenada de 1 a 64 etapas. |

Las coordenadas `x` e `y` de puntos, zonas y rectángulos son fracciones de las dimensiones correspondientes de la imagen, entre 0 y 1. Los radios y velocidades se expresan respecto al **ancho**. El giro de alineación y la dirección del viento usan grados. Los tiempos usan segundos.

## Borradores sin imágenes y preferencias locales

Desde la aplicación 0.14.0, el editor puede guardar un borrador de formato 10 con `images: {}` y al menos una etapa. En ese estado no admite una imagen inicial aislada; se deshabilitan reproducción y exportación. El editor lo abre con `PaintProject.normalize(data, { allowEmpty: true })`. La normalización compartida sigue exigiendo una imagen coloreada por defecto, también en API/CLI/MCP; carga las imágenes en el editor antes de automatizar ese borrador. Los editores anteriores pueden rechazar los borradores sin imágenes.

Las preferencias no se incorporan al proyecto ni al HTML exportado: cada proyecto guarda los valores concretos que utiliza. El archivo separado de preferencias lleva `format: "tinta-y-color-preferences"`, `version: 1`, `startup`, `resolution`, `baseMode`, `baseGeneration`, `presentation`, `stage` y `point`. Sus campos y rangos/pasos se validan antes de importar. `stage` contiene parámetros sin geometría; `point` sólo activación, modo de inicio y demora. No contiene imágenes, nombres, rectángulos ni idioma.

Se guardan localmente con la clave `colorflow.preferences`; el idioma continúa usando su clave independiente. Las preferencias no cambian los valores predeterminados del motor, API, CLI o MCP, ni la normalización de archivos existentes. La opción `baseMode: "uploaded"` puede conservarse en un borrador vacío; con imágenes se mantienen las reglas de preparación anteriores.

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
| `highlightFrames` | Lista canónica de 0 a 64 rectángulos separados; se destaca su unión cuando `highlightLinked` es falso. |
| `highlightFrame` | Campo antiguo: al abrir se convierte en una lista de un elemento. Al guardar refleja el primer rectángulo o `null`. |
| `outside` | `show`, `blur`, `black`, `white`, `color` o `transparent`; predeterminado `blur`. |
| `outsideColor` | Color hexadecimal `#RRGGBB`; predeterminado `#202c29`. |
| `blur` | Desenfoque de 0 a 40, escalado a la resolución de trabajo; predeterminado 12. |

Sin rectángulo de destacado se utiliza la página completa. Los ajustes del exterior solo actúan cuando el destacado está habilitado.

## Compatibilidad y validación

La apertura normaliza los datos mediante `PaintProject.normalize` en `src/project.js` y las funciones de `src/engine.js`. El editor limita cantidades y rangos, valida las imágenes incorporadas y rechaza versiones desconocidas. No basta con cambiar `version` para convertir un formato futuro.

Los archivos de formato 2 conservan sus puntos, tiempos, radios, tono y encuadres. Al faltar los campos de formato 3 reciben Inicio de página completa, destacado desactivado, rectángulos vinculados y radios heredados. Los campos antiguos que falten, también en formato 1, reciben los valores del motor: por ejemplo, puntos activos simultáneos, resistencia al tono cero y radio máximo de 1,5 veces el ancho.

El formato 4 añade la permanencia y las opciones de fondo exportado. Al abrir formatos anteriores se asigna permanencia cero y fondo achurado. Las etapas sin emisores ahora se reproducen como etapas visuales, conservando sus opciones de cámara y pausa.

General no se almacena como etapa ni como conjunto de valores predeterminados: deriva el resumen de las etapas y puntos actuales y aplica cambios a esos datos. Los borradores pendientes no se serializan.

El formato 5 añade `enabled` a las etapas. Los proyectos anteriores mantienen todas sus etapas habilitadas al abrirse; la activación de los puntos es independiente. Una etapa deshabilitada se conserva completa en el proyecto y se omite de la presentación exportada.

La selección múltiple y sus pendientes son estado del editor y no se serializan. La visibilidad de la barra de presentación tampoco se guarda: cada apertura comienza con la barra oculta.

El formato 6 añade `paintDelay`. Los proyectos anteriores reciben desfase cero y conservan sus tiempos anteriores. Este desfase no retrasa la cámara ni el destacado, y no se suma a etapas visuales o deshabilitadas.

Los mapas de llegada no se guardan en el proyecto: se recalculan al reproducir o exportar.

El formato 7 añade `baseGeneration`. Al abrir formatos 1 a 6 se asigna `method: "grayscale"` para conservar exactamente la desaturación anterior. El formato 8 recomienda `method: "coherent"` (K) para nuevas bases. Los proyectos de formato 7 conservan `ink` y sus parámetros; incluso sin configuración explícita mantienen el filtro anterior. `ink` sigue disponible para retirar pigmentos y conservar grises intermedios según sus parámetros. El archivo inicial cargado no recibe esta transformación.

| Campo de `baseGeneration` | Rango y significado |
| --- | --- |
| `method` | `protected` (L, predeterminado en formato 9), `coherent` (K, predeterminado en formato 8), `ink` (filtro de formato 7) o `grayscale` (desaturación). |
| `colorToGray` | 0 a 1: desde papel hasta gris del pigmento; inicialmente 0. |
| `sensitivity` | 0 a 1, inicialmente 0.7. En K exige mayor contraste al aumentar, descartando detalles débiles; en ink detecta pigmentos más tenues. |
| `blackPoint` | 0 a 0.9; 0 en K y 0.14 en ink. Refuerzo posterior de grises oscuros. |
| `whitePoint` | 0.1 a 1; 1 en K y 0.94 en ink. Refuerzo posterior de grises claros. Debe ser mayor que `blackPoint`. |
| `smoothness` | 0 a 1; 0 en K (acabado sin suavizado extra), 0.08 en ink; el editor muestra de 0 a 100%. |
| `inkMatch` | `none` (predeterminado), `source-to-base`, `darken` (M), `multiply` (N) o `base-to-final` (copia literal antigua); sólo en L/K. |
| `paper` | `white` (inicial en K) para blanco puro o `matched` (inicial en ink) para el tono estimado del papel final. |

En `grayscale` sólo actúa la selección de papel; los demás controles se conservan pero no intervienen. Los puntos de partida del editor son configuraciones de estos campos, sin un nombre de preset adicional en el archivo. Los PNG se regeneran a partir de los originales y estos parámetros.

`protected` y `coherent` analizan el original hasta 1600 px de lado mayor antes de reducir la base a `resolution`. Los informes de preparación incluyen `baseSourceSize` con las dimensiones de análisis; es `null` en los métodos anteriores o al preparar una inicial cargada. El papel blanco y los umbrales 0/1 con suavidad 0 conservan el acabado de K; los otros controles permiten modificarlo explícitamente.

## Presentación exportada

El HTML autónomo es un producto distinto. Incorpora imágenes preparadas, mapas temporales cuantizados, contribuciones tenues y el reproductor. No conserva las herramientas ni todos los datos necesarios para editar el proyecto. Sus mapas se empaquetan en `src/codec.js`; conserva siempre el JSON si necesitas continuar editando.

## Planes para automatización

Un plan de automatización es un JSON pequeño con los parámetros de proyecto y etapas, sin imágenes ni campos `format`/`version`. Se valida con [animation.schema.json](../schemas/animation.schema.json). Puede incluir `baseGeneration`. La API incorpora los archivos de imagen y genera un proyecto autocontenido de formato 10, compatible con el editor. El plan y el proyecto editable son productos distintos; no basta con renombrar un plan como `.colorflow.json`.

### Igualación opcional (formatos 8 y 9)

Igualar trazos después de L/K (`baseGeneration.inkMatch`, inicialmente `none`):

- `source-to-base`: cada píxel no blanco de la base recupera el RGBA de la imagen original en esa posición. Puede recuperar también color donde K había detectado tinta.
- `base-to-final`: esos píxeles de la base se copian a la imagen coloreada preparada para la animación. Puede cambiar ligeramente el aspecto final de los trazos.
- `darken`: mínimo por canal entre original y base, sólo en los trazos.
- `multiply`: producto por canal dividido por 255 y redondeado, sólo en los trazos.
- `none`: conserva la base generada y la imagen coloreada sin igualarlas.

Se aplica después de escalar a la resolución de animación y de los controles de K, incluidos los bordes suaves. «No blanco» significa un píxel más oscuro que el papel generado (también un gris 254 con papel blanco); con papel cálido se compara contra ese tono. source-to-base y la copia literal igualan los píxeles. M/N componen colores; el tono puede cambiar durante la animación. Si eliges conservar pigmento en gris, esas áreas también entran en la igualación. La opción sólo actúa en L/K y base derivada. Los originales incrustados permanecen intactos: cada preparación vuelve a partir de ellos, por lo que cambiar o desactivar la opción no acumula cambios. El informe incluye `inkMatchPixels`; `referencia.png` muestra la copia coloreada que se usará al animar.

### Formato 9 y compatibilidad

Los nuevos proyectos reciben `method: "protected"` (L). El formato 8 recibe `coherent` si omitía el método; los campos explícitos, incluido `base-to-final`, se conservan. Formato 7 recibe ink; 1–6 reciben grayscale. Guardar actualiza el contenedor a 10 sin cambiar el algoritmo de los proyectos anteriores. `darken` y `multiply` componen después de reducir a la resolución de animación. El fondo cálido se excluye comparando contra el tono de papel generado; ninguno de los modos altera el original incrustado.

El encuadre de comparación, el progreso parcial y el trabajador son estados transitorios del editor: no se guardan en el plan ni en el proyecto.

### Formato 10: destacados múltiples

`highlightFrames` puede aparecer en cada etapa y en `initialView`. Cada elemento tiene `x`, `y`, `width`, `height` normalizados, con el mismo mínimo de 0.02 y límites que `frame`. La lista tiene prioridad sobre el campo antiguo `highlightFrame`; al guardar, éste refleja el primero. Una lista vacía con destacado separado no oculta toda la imagen: usa la página completa. El editor desactiva el destacado al borrar su último elemento.

`highlightLinked: true` utiliza únicamente el enfoque, sin borrar la lista separada. `highlightEnabled: false` deja los ajustes y la lista guardados pero no aplica el efecto. No se guarda selección de rectángulo ni gesto transitorio. Los archivos de formatos 1–9 conservan su único rectángulo y los algoritmos de imagen anteriores.

Listas de igual cantidad interpolan los rectángulos por índice durante `cameraDuration`; cantidades distintas funden las dos máscaras. La unión se recorta en un único dibujo para no acumular alfa en solapamientos. El codec, reproductor y HTML autónomo conservan la lista completa.
