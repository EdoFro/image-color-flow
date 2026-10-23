# Automatización e integración con IA

[English](en/automation.md) | **Español**

[Volver al proyecto](../README.es.md)

Tinta y color ofrece una API local para Node.js, comandos y un servidor MCP por `stdio`. Los tres utilizan el mismo formato, motor, preparación de imágenes y constructor de HTML que el editor. No incluyen un modelo de IA: un asistente con visión interpreta el pedido y utiliza estas operaciones para realizarlo.

El editor sigue funcionando sin instalar Node.js. El HTML exportado tampoco necesita la automatización para reproducirse.

Obtén el [paquete completo](distribucion.md#paquete-completo) para usar API, CLI o MCP. El ZIP del editor contiene únicamente la aplicación portable.

## Hoja inicial sin dibujo

Para empezar desde una hoja vacía utiliza `"baseMode": "blank"` y `"baseGeneration": { "paper": "white" }` (blanco puro) o `{ "paper": "matched" }` (tono uniforme estimado del papel final). Sólo se necesita la imagen coloreada. Se omiten extracción, igualación de trazos, ajustes de grises y alineación, sin modificar la imagen coloreada. Funciona con create/update/prepare/render/review en API, CLI y MCP, y con la vista previa del editor. Se guarda como formato 12; los formatos 1–11 siguen siendo legibles.


## Borrador con nombre y destino recomendado

Usa `plan.name` al crear el proyecto. Conserva el original, por ejemplo `windsurf-borrador.colorflow.json`. `review` acepta `name` opcional y `saveAs`, una ruta de archivo `.colorflow.json` dentro de la raíz autorizada. El destino recomendado no se crea ni se escribe; no autoriza al navegador. El resultado devuelve `name` y `saveSuggestion` con `fileName`, `directory` y `path`.

```sh
node automation/cli.mjs review --project windsurf-borrador.colorflow.json --out windsurf-editar.html --name "Historia del windsurf" --save-as animaciones/windsurf.colorflow.json --open
```

MCP: `colorflow_review` recibe los mismos campos `name` y `saveAs`. Sin `saveAs`, propone un nombre derivado del proyecto junto al borrador y evita coincidir con el archivo original. El nombre indicado en review se incorpora al borrador abierto, sin cambiar el archivo de origen. El editor permite guardar, guardar como y deshacer/rehacer; sus archivos JSON usan formato 12 (abre también 1–11). El historial vive sólo en el editor y no está disponible por MCP. No cambies archivos corregidos por el usuario sin leerlos antes. Sigue siendo intercambio por archivos, no conexión con la sesión abierta.


## Preparación

1. Para la automatización, instala **Node.js 22 o posterior**; se recomienda [Node.js 24 LTS](https://nodejs.org/en/about/previous-releases).
2. Para calcular y exportar, ten instalado Chrome, Edge o Chromium. Se buscan en ubicaciones habituales; una instalación diferente se indica con `--browser` y la ruta absoluta al ejecutable.
3. Guarda las imágenes dentro de la carpeta de trabajo. Los archivos adjuntos en una conversación deben ser accesibles allí para el cliente local.

No hace falta ejecutar `npm install`: no hay paquetes externos. Los comandos se ejecutan desde la raíz del repositorio o del paquete completo. Los ejemplos siguientes usan archivos adicionales del repositorio; el ZIP incluye `AUTOMATION.es.md` con instrucciones usando tus propias imágenes. El renderizador inicia un navegador sin ventana con un perfil temporal propio. Sólo sirve el trabajo en `127.0.0.1`, en un puerto efímero y una ruta aleatoria, y lo cierra al terminar. No modifica tu perfil habitual.

## Prueba con una sola imagen

```sh
node automation/cli.mjs create --image examples/images/samurai-final.png --plan examples/plans/recorrido-simple.json --out output/mi-proyecto.colorflow.json
node automation/cli.mjs validate --project output/mi-proyecto.colorflow.json
node automation/cli.mjs render --project output/mi-proyecto.colorflow.json --out output/mi-presentacion
```

El plan incluido contiene un acercamiento sin pintura, una etapa de color y un regreso a página completa. Al no proporcionar imagen inicial, se genera tinta sobre papel desde la final. Los pigmentos detectables pasan al papel; se conservan grises neutros intermedios y negros sólidos. La detección es aproximada y debe revisarse. Si sólo aportas una foto en blanco y negro, la herramienta no inventa los colores que faltan.

Con dos imágenes:

```sh
node automation/cli.mjs create --image examples/images/samurai-final.png --initial examples/images/samurai-inicial.jpg --plan examples/plans/recorrido-simple.json --out output/dos-imagenes.colorflow.json
node automation/cli.mjs render --project output/dos-imagenes.colorflow.json --out output/dos-imagenes --auto-align
```

`--auto-align` estima posición, escala y giro antes de calcular. El proyecto de salida conserva la alineación utilizada. Sin esa opción se usa la alineación guardada en el proyecto.

Cada renderizado entrega:

| Archivo | Contenido |
| --- | --- |
| `presentacion.html` | Presentación autónoma, sin recursos externos. |
| `proyecto.colorflow.json` | Proyecto completo para abrir y retocar en el editor. |
| `informe.json` | Duración calculada, tamaño, tiempos por etapa y avisos. Excluye pausas que esperan interacción. |
| `base.png` | Base completa preparada, sin aplicar la vista Inicio, enfoques ni destacados. |
| `plan.png` | Referencia coloreada con zonas, recorridos, enfoques y puntos numerados como etapa.punto. |
| `storyboard.png` | Inicio, mitad de cada etapa habilitada y final. |
| `inicio.png`, `final.png`, `etapa-NN.png` | Fotogramas individuales con cámara y destacado aplicados. |

![Generación local con vistas previas](images/vista-automatizacion.png)

## Preparar la base sin calcular la animación

El bloque `baseGeneration` del plan y del proyecto controla el tratamiento de pigmentos, grises y papel. Sus números son fracciones: `smoothness: 1` equivale al 100% del editor. Consulta los campos y límites en el [formato del proyecto](formato-del-proyecto.md).

```sh
node automation/cli.mjs create --image examples/images/samurai-final.png --plan examples/plans/base-tinta.json --out output/proyecto-base.colorflow.json
node automation/cli.mjs prepare --project output/proyecto-base.colorflow.json --out output/base
```

`prepare` decodifica las imágenes, aplica opcionalmente `--auto-align` a una inicial cargada y genera `base.png`, `referencia.png`, `comparacion.png`, `proyecto.colorflow.json` e `informe.json`. No calcula propagación ni produce un HTML. El informe indica `imageDecodingChecked: true` y `calculationChecked: false`.

Para probar otra transformación, utiliza `update` con un parche que incluya el objeto `baseGeneration` y vuelve a preparar en un directorio nuevo. El objeto del parche reemplaza la configuración completa; los campos omitidos de ese objeto reciben sus valores predeterminados. En proyectos antiguos, `method: "grayscale"` mantiene la desaturación anterior. Usa `baseGeneration: { "method": "protected" }` para seleccionar L; el ejemplo [base-lineas.json](../examples/plans/base-lineas.json) incluye sus valores recomendados. Los nuevos proyectos ya utilizan L; formato 7 conserva ink al abrirse.

La API ofrece la misma operación: `await api.prepare({ project, outputDir })`. En MCP se utiliza `colorflow_prepare`, seguido de `colorflow_read_image` sobre `base.png`. Los proyectos de salida son de formato 12, con todos los parámetros de generación guardados. El renderizado completo también incluye `base.png`.

## Comandos y errores

```sh
node automation/cli.mjs inspect --project output/mi-proyecto.colorflow.json
node automation/cli.mjs update --project output/mi-proyecto.colorflow.json --plan cambios.json --stage 1
node automation/cli.mjs schema
node automation/cli.mjs --help
```

`inspect` devuelve el plan completo y los nombres de imágenes, sin volcar sus grandes bloques base64. `update` aplica un parche a una etapa si se indica `--stage` (índice desde cero); sin él aplica un parche al proyecto. Los campos omitidos se conservan. Los objetos y listas incluidos reemplazan ese campo completo: por ejemplo, `stages` reemplaza toda la secuencia y `points` todos los puntos de esa etapa.

`update` modifica el mismo archivo por defecto. Usa `--out copia.colorflow.json` para conservar el original. `create`, `prepare` y `render` rechazan destinos existentes salvo que se indique `--force`. Preparar o renderizar de nuevo con `--force` reemplaza sus artefactos actuales; no elimina archivos adicionales de ese directorio.

Todas las rutas se resuelven respecto a `--root`, por defecto la carpeta actual. No se permiten rutas ni enlaces que conduzcan fuera de ella. Elige una carpeta de trabajo que contenga únicamente los archivos que quieras poner a disposición del asistente.

Las respuestas correctas salen en JSON por stdout. Los fallos salen en JSON por stderr y devuelven código 1. `validate` también devuelve código 1 si encuentra valores inválidos. Los detalles identifican el campo, por ejemplo `$.stages[0].points[0].x`. La validación estructural no decodifica imágenes ni calcula propagación; `render` realiza esos pasos y puede detectar errores adicionales.

El tiempo máximo de renderizado es 120 segundos; puede ajustarse de 1000 a 600000 ms con `--timeout`. Las imágenes de entrada están limitadas a 40 MB, los proyectos JSON a 150 MB y la respuesta del navegador a 256 MB. Siguen vigentes los límites de resolución y emisores del editor.

## Conectar un asistente por MCP

Para nuevas bases se recomienda `baseGeneration.method: "protected"` (L). La preparación analiza el original hasta 1600 px de lado mayor antes de reducir el resultado a la resolución de animación; el informe incluye `baseSourceSize`. No se necesitan bibliotecas adicionales ni un servicio de imágenes.

El servidor usa [MCP stdio](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports). Necesitas un cliente que pueda iniciar procesos locales y leer imágenes; no todos los asistentes web ofrecen esa conexión.

Configura el cliente con un bloque equivalente a éste, sustituyendo las dos rutas por rutas absolutas de tu equipo:

```json
{
  "mcpServers": {
    "tinta-y-color": {
      "command": "node",
      "args": [
        "/ruta/image-color-flow/automation/mcp.mjs",
        "--root",
        "/ruta/carpeta-de-trabajo"
      ]
    }
  }
}
```

En Windows puedes usar `C:/Users/tu-usuario/GitHub/image-color-flow/automation/mcp.mjs`. Si `node` no está en el PATH del cliente, escribe la ruta absoluta a `node.exe`. La estructura exacta de configuración depende del cliente; no se instala automáticamente en ningún asistente ni se cambian sus permisos.

Para un navegador en una ubicación distinta, añade `"--browser", "/ruta/al/ejecutable"` a `args`. La raíz de trabajo puede ser distinta a la del repositorio: las imágenes y los proyectos se leen de ella; los scripts se resuelven respecto a su propia instalación.

| Herramienta | Operación |
| --- | --- |
| `colorflow_create` | Crear proyecto desde imagen final, inicial opcional y plan. |
| `colorflow_inspect` | Obtener el plan editable y los nombres de imágenes. |
| `colorflow_update` | Cambiar parámetros o una etapa mediante `stageIndex`. |
| `colorflow_validate` | Revisar estructura, rangos y geometría. |
| `colorflow_prepare` | Generar y revisar la base sin calcular la animación. |
| `colorflow_render` | Generar HTML, proyecto, informe y vistas previas. |
| `colorflow_read_image` | Entregar una fuente o vista previa como imagen al modelo. |

El servidor también ofrece `colorflow://schema/plan` y `colorflow://guide` como recursos. Responde con contenido estructurado y errores de herramienta; admite cancelación de un renderizado y cierra sus trabajos si el cliente desconecta. Sólo implementa transporte local `stdio`, sin endpoint MCP remoto, cuentas ni claves de proveedores.

Las descripciones de herramientas MCP, los errores de automatización y el recurso de ejecución `colorflow://guide` siguen en español; la guía inglesa está en [for-ai.md](en/for-ai.md).

Un pedido de ejemplo, una vez conectado:

> Lee la guía de Tinta y color. Usa `imagen.png`, muestra primero toda la página, acerca al personaje central y revela el color desde su ropa hacia el fondo. Haz una pausa antes del cierre. Revisa las vistas previas y entrega el HTML y el proyecto editable en `output/resultado`.

La calidad al interpretar «personaje» o «ropa» depende del asistente con visión. El servidor no realiza segmentación semántica ni recibe lenguaje natural para decidir la animación: ejecuta el plan explícito que prepara la IA. La presentación resultante continúa funcionando sin conexión; el asistente elegido puede necesitarla durante la creación.

## API de Node.js y de navegador

```js
import { createAutomation } from './automation/api.mjs';

const api = await createAutomation({ root: '/ruta/carpeta-de-trabajo' });
await api.create({
  image: 'imagen.png', output: 'output/proyecto.colorflow.json',
  plan: { stages: [{ name: 'Color', points: [{ x: 0.5, y: 0.5 }], maxRadius: 1 }] }
});
const result = await api.render({
  project: 'output/proyecto.colorflow.json', outputDir: 'output/presentacion'
});
console.log(result.artifacts);
```

Los métodos son asíncronos. `render` acepta `signal` de un `AbortController`. Los errores tienen `code`, `message` y `details`. El contrato del plan está en [el esquema JSON](../schemas/animation.schema.json); imágenes, rutas de salida y opciones de ejecución son argumentos separados.

En un navegador que cargue `engine`, `ink-lines`, `base-generation`, `project`, `preparation`, `view`, `player`, `codec`, `presentation` y `automation`, `PaintAutomation.prepare(project)` devuelve proyecto normalizado, imágenes preparadas e informe sin propagación; `PaintAutomation.compile(project)` añade campos calculados y HTML. `previews(compiled)` genera fotogramas y `contactSheet(checkpoints)` la hoja de secuencia. No necesitan montar el editor ni simular clics. Preparar requiere Canvas; compilar también necesita Web Workers.

Las pruebas específicas se ejecutan con `node tests/automation.test.mjs`; `npm test` ejecuta además las pruebas del motor sin DOM. Las comprobaciones reales y sus límites se registran en [verificación](verificacion.md).

### Igualación de trazos

Igualar trazos después de L/K (`baseGeneration.inkMatch`, inicialmente `none`):

- `source-to-base`: cada píxel no blanco de la base recupera el RGBA de la imagen original en esa posición. Puede recuperar también color donde K había detectado tinta.
- `base-to-final`: esos píxeles de la base se copian a la imagen coloreada preparada para la animación. Puede cambiar ligeramente el aspecto final de los trazos.
- `darken` (M): mínimo por canal con la base, sin aclarar el original.
- `multiply` (N): producto por canal con la base / 255; suele oscurecer más.
- `none`: conserva la base generada y la imagen coloreada sin igualarlas.

Se aplica después de escalar a la resolución de animación y de los controles de K, incluidos los bordes suaves. «No blanco» significa un píxel más oscuro que el papel generado (también un gris 254 con papel blanco); con papel cálido se compara contra ese tono. La copia literal y source-to-base igualan píxeles; M/N componen colores y no garantizan inmovilidad de la tinta. Si eliges conservar pigmento en gris, esas áreas también entran en la igualación. La opción sólo actúa en L/K y base derivada. Los originales incrustados permanecen intactos: cada preparación vuelve a partir de ellos, por lo que cambiar o desactivar la opción no acumula cambios. El informe incluye `inkMatchPixels`; `referencia.png` muestra la copia coloreada que se usará al animar.

Ejemplo de plan: `"baseGeneration": { "method": "protected", "inkMatch": "source-to-base" }`. Se puede crear o actualizar desde la API, la CLI o MCP; no se necesita una operación nueva.

L es `method: "protected"`; K sigue siendo `"coherent"`. Los proyectos de formato 8 conservan K y su igualación anterior. La preparación API/CLI/MCP entrega imágenes completas mediante el motor común; la prioridad por encuadre es exclusiva de la vista previa del editor.

### Destacados múltiples

En una etapa o en `initialView` usa `highlightEnabled: true`, `highlightLinked: false` y `highlightFrames: [{"x":0.1,"y":0.15,"width":0.25,"height":0.3},{"x":0.6,"y":0.5,"width":0.25,"height":0.3}]`. El exterior común depende de `outside`, `outsideColor` y `blur`. La lista reemplaza completa la anterior en un parche; no se modifica con índices de rectángulo. Los rectángulos deben estar dentro de la imagen y hay un máximo de 64.

`frame` sigue siendo el enfoque. `highlightFrame` se acepta como campo antiguo; un parche de etapa que sólo incluya ese campo reemplaza la lista por un elemento (o la vacía si es null). Al aportar ambos campos, tiene prioridad `highlightFrames`. Editor, API, CLI y MCP comparten estas reglas. Ejemplo: [destacados-multiples.json](../examples/plans/destacados-multiples.json). El archivo editable actual es formato 12.

## Abrir el borrador y exportar para integrar

`colorflow_review` genera un editor autocontenido y solicita abrirlo (`open:true` por defecto). CLI: `review --project borrador.colorflow.json --out editar.html --open`. La creación no calcula propagación; `open:false` sólo entrega el archivo. Para la entrega integrada usa `presentation.mode: "integrated"`: `render` añade controlador y ejemplo. Consulta [borradores e integración](integracion.md).
