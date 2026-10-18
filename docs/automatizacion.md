# Automatización e integración con IA

[Volver al proyecto](../README.md)

Tinta y color ofrece una API local para Node.js, comandos y un servidor MCP por `stdio`. Los tres utilizan el mismo formato, motor, preparación de imágenes y constructor de HTML que el editor. No incluyen un modelo de IA: un asistente con visión interpreta el pedido y utiliza estas operaciones para realizarlo.

El editor sigue funcionando sin instalar Node.js. El HTML exportado tampoco necesita la automatización para reproducirse.

## Preparación

1. Para la automatización, instala **Node.js 22 o posterior**; se recomienda [Node.js 24 LTS](https://nodejs.org/en/about/previous-releases).
2. Para calcular y exportar, ten instalado Chrome, Edge o Chromium. Se buscan en ubicaciones habituales; una instalación diferente se indica con `--browser` y la ruta absoluta al ejecutable.
3. Guarda las imágenes dentro de la carpeta de trabajo. Los archivos adjuntos en una conversación deben ser accesibles allí para el cliente local.

No hace falta ejecutar `npm install`: no hay paquetes externos. Los comandos siguientes se ejecutan desde la raíz del repositorio. El renderizador inicia un navegador sin ventana con un perfil temporal propio. Sólo sirve el trabajo en `127.0.0.1`, en un puerto efímero y una ruta aleatoria, y lo cierra al terminar. No modifica tu perfil habitual.

## Prueba con una sola imagen

```sh
node automation/cli.mjs create --image examples/images/samurai-final.png --plan examples/plans/recorrido-simple.json --out output/mi-proyecto.colorflow.json
node automation/cli.mjs validate --project output/mi-proyecto.colorflow.json
node automation/cli.mjs render --project output/mi-proyecto.colorflow.json --out output/mi-presentacion
```

El plan incluido contiene un acercamiento sin pintura, una etapa de color y un regreso a página completa. Al no proporcionar imagen inicial, se deriva una base desaturada de la final. Esa base conserva sombras y aguadas; no reconstruye un dibujo original de tinta. Si sólo aportas una foto en blanco y negro, la herramienta no inventa los colores que faltan.

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
| `plan.png` | Referencia coloreada con zonas, recorridos, enfoques y puntos numerados como etapa.punto. |
| `storyboard.png` | Inicio, mitad de cada etapa habilitada y final. |
| `inicio.png`, `final.png`, `etapa-NN.png` | Fotogramas individuales con cámara y destacado aplicados. |

![Generación local con vistas previas](images/vista-automatizacion.png)

## Comandos y errores

```sh
node automation/cli.mjs inspect --project output/mi-proyecto.colorflow.json
node automation/cli.mjs update --project output/mi-proyecto.colorflow.json --plan cambios.json --stage 1
node automation/cli.mjs schema
node automation/cli.mjs --help
```

`inspect` devuelve el plan completo y los nombres de imágenes, sin volcar sus grandes bloques base64. `update` aplica un parche a una etapa si se indica `--stage` (índice desde cero); sin él aplica un parche al proyecto. Los campos omitidos se conservan. Los objetos y listas incluidos reemplazan ese campo completo: por ejemplo, `stages` reemplaza toda la secuencia y `points` todos los puntos de esa etapa.

`update` modifica el mismo archivo por defecto. Usa `--out copia.colorflow.json` para conservar el original. `create` y `render` rechazan destinos existentes salvo que se indique `--force`. Renderizar de nuevo con `--force` reemplaza sus artefactos actuales; no elimina archivos adicionales de ese directorio.

Todas las rutas se resuelven respecto a `--root`, por defecto la carpeta actual. No se permiten rutas ni enlaces que conduzcan fuera de ella. Elige una carpeta de trabajo que contenga únicamente los archivos que quieras poner a disposición del asistente.

Las respuestas correctas salen en JSON por stdout. Los fallos salen en JSON por stderr y devuelven código 1. `validate` también devuelve código 1 si encuentra valores inválidos. Los detalles identifican el campo, por ejemplo `$.stages[0].points[0].x`. La validación estructural no decodifica imágenes ni calcula propagación; `render` realiza esos pasos y puede detectar errores adicionales.

El tiempo máximo de renderizado es 120 segundos; puede ajustarse de 1000 a 600000 ms con `--timeout`. Las imágenes de entrada están limitadas a 40 MB, los proyectos JSON a 150 MB y la respuesta del navegador a 256 MB. Siguen vigentes los límites de resolución y emisores del editor.

## Conectar un asistente por MCP

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
| `colorflow_render` | Generar HTML, proyecto, informe y vistas previas. |
| `colorflow_read_image` | Entregar una fuente o vista previa como imagen al modelo. |

El servidor también ofrece `colorflow://schema/plan` y `colorflow://guide` como recursos. Responde con contenido estructurado y errores de herramienta; admite cancelación de un renderizado y cierra sus trabajos si el cliente desconecta. Sólo implementa transporte local `stdio`, sin endpoint MCP remoto, cuentas ni claves de proveedores.

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

En un navegador que cargue `engine`, `project`, `preparation`, `view`, `player`, `codec`, `presentation` y `automation`, `PaintAutomation.compile(project)` devuelve los datos preparados, campos calculados, informe y HTML. `previews(compiled)` genera fotogramas y `contactSheet(checkpoints)` la hoja de secuencia. No necesitan montar el editor ni simular clics. Compilar requiere un contexto donde estén permitidos Canvas y Web Workers.

Las pruebas específicas se ejecutan con `node tests/automation.test.mjs`; `npm test` ejecuta además las pruebas del motor sin DOM. Las comprobaciones reales y sus límites se registran en [verificación](verificacion.md).
