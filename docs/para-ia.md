# Guía para asistentes que utilizan Tinta y color

Objetivo: transformar una imagen coloreada y el pedido del usuario en un proyecto editable y un HTML de animación autónomo. Necesitas capacidad de visión para interpretar el contenido. El motor revela colores existentes; no colorea una foto monocroma ni crea dibujos nuevos.

1. Inspecciona la imagen con `colorflow_read_image`. Si ya hay proyecto, utiliza `colorflow_inspect` antes de modificarlo. No vuelques imágenes base64 dentro del texto del plan.
2. Prepara un plan explícito a partir del pedido: etapas en orden, puntos, zonas, recorridos, enfoque, destacado, pausas y parámetros. Usa nombres que permitan entender la secuencia. Para una primera prueba utiliza resolución 720.
3. Crea el proyecto con `colorflow_create`. Aporta una imagen inicial si existe; de lo contrario se deriva una base desaturada que conserva sombras. No prometas una extracción perfecta de tinta.
4. Valida, corrige los campos señalados y renderiza en un directorio nuevo. La duración se calcula según la imagen, velocidades y emisores; excluye las pausas manuales. Si te piden una duración, compruébala en el informe y ajusta velocidades o permanencias.
5. Examina `plan.png` y `storyboard.png` con `colorflow_read_image`. Comprueba selección de zonas, posición de orígenes, orden y encuadres. Los fotogramas individuales permiten revisar con más detalle. Una validación correcta no demuestra que la IA haya seleccionado el objeto solicitado.
6. Si es necesario, aplica cambios con `colorflow_update` y vuelve a renderizar. Entrega siempre `presentacion.html` y `proyecto.colorflow.json`, indicando las pausas y las limitaciones observadas.

## Unidades y comportamiento

- x/y: fracciones entre 0 y 1 de ancho y alto de la imagen final. Origen arriba a la izquierda; y crece hacia abajo. La preparación conserva su geometría y sólo cambia la resolución. Los rectángulos deben quedar dentro de la imagen, con ancho y alto mínimos 0.02.
- Radios y velocidades: fracciones del **ancho** de la imagen; no del alto ni píxeles. Duraciones en segundos y viento en grados: 0 derecha, 90 abajo.
- El radio de tinta indica hasta dónde puede atravesar negro. El radio máximo limita siempre y desvanece el color del 80% al 100%. Ambos se deforman con el viento. Las zonas son límites obligatorios.
- `points: []` y `path: []` crean una etapa visual. Si omites `points`, el motor añade un punto central. Indícalo explícitamente cuando sólo quieras cambiar enfoque o destacado.
- El primer punto activo y el pincel comienzan tras `paintDelay`; cámara y destacado comienzan al inicio de la etapa. Los puntos siguientes dependen del anterior activo, según `with`, `after` o `delay`. `pauseAfter` espera interacción del público; `hold` añade una permanencia automática.
- Cada etapa define su vista completa. Para mantener un enfoque entre dos etapas, repite `frame` y sus ajustes. Un frame omitido usa la página completa. `initialView` configura Inicio sin pintura.
- `highlightEnabled` está apagado por defecto. Para transparencia exterior, actívalo y define el rectángulo de destacado (vinculado a `frame` por defecto) con `outside: "transparent"`.
- En un parche de actualización se conservan los campos omitidos; los objetos y arrays incluidos se reemplazan completos. `stageIndex` comienza en cero. Los números mostrados en `plan.png` comienzan en uno: etapa.punto.

Consulta el esquema del plan para todos los límites. Los campos desconocidos o fuera de rango se rechazan. Un punto fuera de una zona no pinta; si todos los emisores quedan fuera, el cálculo puede fallar. No ignores los avisos del informe.

Todas las rutas pertenecen a la raíz configurada. El usuario debe facilitar los archivos allí; un adjunto remoto no implica que exista como archivo local. Evita sobrescribir fuentes y usa directorios nuevos para las revisiones. La conexión MCP es local por stdio; el HTML final no necesita Node.js ni MCP para presentarse.
