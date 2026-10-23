# Guía para asistentes que utilizan Tinta y color

[English](en/for-ai.md) | **Español**

[Volver al proyecto](../README.es.md)

Objetivo: transformar una imagen coloreada y el pedido del usuario en un proyecto editable y un HTML de animación autónomo. Necesitas capacidad de visión para interpretar el contenido. El motor revela colores existentes; no colorea una foto monocroma ni crea dibujos nuevos.

Antes de calcular, distingue **idea → borrador editable → revisión del usuario → entrega**. No renderices una entrega completa por defecto si sólo se pidió un borrador. Tras acordar la idea, crea pocas etapas, usa resolución reducida y llama a `colorflow_review` con `project`, `output: "editar.html"`, `open: true`. Devuelve el archivo/URL si no se puede abrir. El usuario continúa en ese editor; guardar permite elegir un archivo o descargar JSON según el navegador y recargar el HTML vuelve al borrador inicial. Esto no es conexión en vivo. Para esta fase no es obligatorio producir HTML de reproducción ni revisar toda la galería. Conserva validación estructural y originales.

1. Inspecciona la imagen con `colorflow_read_image`. Si ya hay proyecto, utiliza `colorflow_inspect` antes de modificarlo. No vuelques imágenes base64 dentro del texto del plan.
2. Prepara un plan explícito a partir del pedido: etapas en orden, puntos, zonas, recorridos, enfoque, destacado, pausas y parámetros. Usa nombres que permitan entender la secuencia. Para una primera prueba utiliza resolución 720.
3. Crea el proyecto con `colorflow_create`. Aporta una imagen inicial si existe; de lo contrario se genera tinta sobre papel según `baseGeneration`. Ejecuta `colorflow_prepare` y examina `base.png` con `colorflow_read_image`. Usa `baseGeneration.method: "protected"` (L, predeterminado en proyectos nuevos). Revisa letras, rayas, motivos de ropa, texturas y lavados de acuarela; ajusta los controles antes de calcular la animación. No sustituyas la base por un redibujo para corregir pérdida de trazos. No prometas una extracción perfecta de tinta.
4. Valida, corrige los campos señalados y renderiza en un directorio nuevo. La duración se calcula según la imagen, velocidades y emisores; excluye las pausas manuales. Si te piden una duración, compruébala en el informe y ajusta velocidades o permanencias. Preparar la base no calcula duración ni genera HTML.
5. Examina `plan.png` y `storyboard.png` con `colorflow_read_image`. Comprueba selección de zonas, posición de orígenes, orden y encuadres. Los fotogramas individuales permiten revisar con más detalle. Una validación correcta no demuestra que la IA haya seleccionado el objeto solicitado.
6. Si es necesario, aplica cambios con `colorflow_update` y vuelve a renderizar. En la entrega final, entrega `presentacion.html` y `proyecto.colorflow.json`, indicando las pausas y las limitaciones observadas.

## Hoja inicial sin dibujo

Para empezar desde una hoja vacía utiliza `"baseMode": "blank"` y `"baseGeneration": { "paper": "white" }` (blanco puro), `{ "paper": "matched" }` (tono uniforme estimado del papel final) o `{ "paper": "transparent" }` (alfa cero). Sólo se necesita la imagen coloreada. Se omiten extracción, igualación de trazos, ajustes de grises y alineación, sin modificar la imagen coloreada. Funciona con create/update/prepare/render/review en API, CLI y MCP, y con la vista previa del editor. Se guarda como formato 13; los formatos 1–12 siguen siendo legibles. La transparencia se revela por opacidad y no elimina el papel de la imagen final. Para ver el fondo de una página contenedora usa también `presentation.background: "transparent"`; el damero del editor no se exporta.


## Borrador con nombre y destino recomendado

Usa `plan.name` al crear el proyecto. Conserva el original, por ejemplo `windsurf-borrador.colorflow.json`. `review` acepta `name` opcional y `saveAs`, una ruta de archivo `.colorflow.json` dentro de la raíz autorizada. El destino recomendado no se crea ni se escribe; no autoriza al navegador. El resultado devuelve `name` y `saveSuggestion` con `fileName`, `directory` y `path`.

```sh
node automation/cli.mjs review --project windsurf-borrador.colorflow.json --out windsurf-editar.html --name "Historia del windsurf" --save-as animaciones/windsurf.colorflow.json --open
```

MCP: `colorflow_review` recibe los mismos campos `name` y `saveAs`. Sin `saveAs`, propone un nombre derivado del proyecto junto al borrador y evita coincidir con el archivo original. El nombre indicado en review se incorpora al borrador abierto, sin cambiar el archivo de origen. El editor permite guardar, guardar como y deshacer/rehacer; sus archivos JSON usan formato 13 (abre también 1–12). El historial vive sólo en el editor y no está disponible por MCP. No cambies archivos corregidos por el usuario sin leerlos antes. Sigue siendo intercambio por archivos, no conexión con la sesión abierta.


## Unidades y comportamiento

- x/y: fracciones entre 0 y 1 de ancho y alto de la imagen final. Origen arriba a la izquierda; y crece hacia abajo. La preparación conserva su geometría y sólo cambia la resolución. Los rectángulos deben quedar dentro de la imagen, con ancho y alto mínimos 0.02.
- Radios y velocidades: fracciones del **ancho** de la imagen; no del alto ni píxeles. Duraciones en segundos y viento en grados: 0 derecha, 90 abajo.
- El radio de tinta indica hasta dónde puede atravesar negro. El radio máximo limita siempre y desvanece el color del 80% al 100%. Ambos se deforman con el viento. Las zonas son límites obligatorios.
- `points: []` y `path: []` crean una etapa visual. Si omites `points`, el motor añade un punto central. Indícalo explícitamente cuando sólo quieras cambiar enfoque o destacado.
- El primer punto activo y el pincel comienzan tras `paintDelay`; cámara y destacado comienzan al inicio de la etapa. Los puntos siguientes dependen del anterior activo, según `with`, `after` o `delay`. `pauseAfter` espera interacción del público; `hold` añade una permanencia automática.
- Cada etapa define su vista completa. Para mantener un enfoque entre dos etapas, repite `frame` y sus ajustes. Un frame omitido usa la página completa. `initialView` configura Inicio sin pintura.
- `highlightEnabled` está apagado por defecto. Para transparencia exterior, actívalo y define el rectángulo de destacado (vinculado a `frame` por defecto) con `outside: "transparent"`.
- `baseGeneration` es global: configura la extracción en `derived`; en `blank` sólo se usa `paper`. `paper: "transparent"` sólo crea transparencia en `blank`; los otros modos lo interpretan como `matched`. `method: "coherent"` usa K; `ink` conserva el filtro anterior y retira pigmentos; `colorToGray: 0` los lleva al papel y `1` conserva su gris. `sensitivity` controla la detección, `blackPoint`/`whitePoint` los grises y `smoothness` va de 0 a 1 (0–100% en el editor). Los proyectos de formatos 1–6 reciben `method: "grayscale"` al abrirse para mantener su aspecto: cambia explícitamente a `protected` para usar L o a `coherent` para usar K. Los archivos de formato 7 conservan ink y sus parámetros. K usa papel blanco, sensitivity .7, blackPoint 0, whitePoint 1 y smoothness 0; es el método ensayado con Calvin y acuarela. Mayor sensibilidad exige más contraste; smoothness añade un suavizado de acabado opcional, con posible pérdida de nitidez. Los métodos son aproximados: no garantizan separar tinta y pigmento oscuro.
- `base.png` no tiene cámara ni destacado; `inicio.png` representa la vista Inicio y puede estar recortado o tener transparencia exterior. Revisa la base completa antes de atribuir un defecto a los encuadres. `prepare` entrega además `referencia.png`, `comparacion.png`, informe y proyecto actualizado.
- En un parche de actualización se conservan los campos omitidos; los objetos y arrays incluidos se reemplazan completos. `stageIndex` comienza en cero. Los números mostrados en `plan.png` comienzan en uno: etapa.punto.

Consulta el esquema del plan para todos los límites. Los campos desconocidos o fuera de rango se rechazan. Un punto fuera de una zona no pinta; si todos los emisores quedan fuera, el cálculo puede fallar. No ignores los avisos del informe.

Todas las rutas pertenecen a la raíz configurada. El usuario debe facilitar los archivos allí; un adjunto remoto no implica que exista como archivo local. Evita sobrescribir fuentes y usa directorios nuevos para las revisiones. La conexión MCP es local por stdio; el HTML final no necesita Node.js ni MCP para presentarse.

Para recuperar el color original en la base usa `baseGeneration.inkMatch: "source-to-base"`. Para componer la base con la copia coloreada usa `"darken"` (M) o `"multiply"` (N). El valor inicial es `"none"`. Actúan tras L/K y la reducción a resolución de animación; revisa siempre base.png y referencia.png. Los originales incrustados permanecen intactos.

L añade a K protección de superficies oscuras; `protected` recomienda L, `coherent` conserva K y el formato 8. Para aplicar la base a la imagen coloreada elige `inkMatch: "darken"` (M) o `"multiply"` (N), con `none` como valor inicial. `base-to-final` es la copia literal antigua: puede crear halos claros y se conserva por compatibilidad. Revisa base.png y referencia.png. M/N no aclaran el original, pero pueden oscurecer o cambiar tonos y no aseguran tinta inmóvil durante la transición. No se sobrescriben los originales.

Para destacar varios lugares simultáneamente, usa `highlightFrames` en la etapa o en `initialView`, con `highlightEnabled: true` y `highlightLinked: false`. El exterior de la unión recibe `outside`; no crees un rectángulo envolvente que deje visible el espacio intermedio. `frame` define el enfoque y es independiente. Coordenadas 0–1, tamaño mínimo .02, hasta 64 rectángulos dentro de la imagen. La lista de un parche reemplaza toda la anterior; revisa `plan.png` y `storyboard.png`. Un destacado antiguo `highlightFrame` sigue siendo válido.

## Integrar en una presentación web

El usuario puede terminar el borrador y exportar un ZIP en modo integrado. Descomprime juntos HTML, `tinta-color-host.js`, ejemplo e instrucciones. Para generar directamente con MCP usa `presentation.mode: "integrated"`. Desde 0.18.0, usa `TintaColorHost.attach` por imagen y una sola llamada `bindInput({onAction})` por presentación. El contenedor decide entre la secuencia activa (`createSequence` opcional) y la navegación propia. Sustituye los manejadores anteriores; no añadas listeners/onclick por recurso ni parches de HTML. attach desactiva mouse y foco del iframe y negocia ocultar todos sus controles, incluido Reiniciar. Botones `data-tinta-color-action` ejecutan sólo su acción; campos/enlaces se respetan y controles personalizados usan `data-tinta-color-ignore`. Una etapa habilitada es un momento. Desde 0.17.0, flecha derecha y clic usan `advance`: si está pintándose una etapa, la completan e inician la siguiente; durante la última, muestran el final y esperan otra pulsación para continuar la presentación. `advanceWhenIdle()` / comando `advance-wait` conserva el avance que ignora órdenes durante pintura; salto explícito (`skip`) sólo completa el momento. Al actualizar una presentación, reexporta sus HTML y reemplaza el controlador; elimina cualquier bloqueo de avance durante pintura que el contenedor hubiera añadido. Usa `back`, `restart`, `finish` para los otros controles. Gestiona el reinicio desde la presentación mediante API; `sequence.activeAnimation` permite habilitarlo sólo cuando corresponde. El hover interno se conserva únicamente al abrir la animación por separado. Ensaya clics en imagen/márgenes, Tab sin entrar en iframes, botones sin avance extra, láminas intermedias, retroceso y apertura sin conexión. Véase [contrato y ejemplo](integracion.md). La integración real se valida aparte del borrador.
