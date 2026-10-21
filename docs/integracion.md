# Borradores e integración en presentaciones

[English](en/embedding.md) | **Español**

[Volver al proyecto](../README.es.md)

Disponible desde 0.16.0; avance predeterminado actualizado en 0.17.0 y entrada exclusiva de la presentación en 0.18.0. Este flujo no conecta al asistente con una sesión abierta del editor: el usuario termina la edición y entrega la exportación al agente que integra la presentación.

## A. Abrir un borrador para corregirlo

Tras acordar la idea, el asistente crea un proyecto sencillo con `colorflow_create` y llama a:

```json
{"project":"borrador.colorflow.json","output":"editar.html","open":true}
```

Es el argumento de `colorflow_review`. Genera un HTML autocontenido con el editor de la instalación y el proyecto cargado; no necesita un servidor ni calcula la propagación. Las rutas siguen limitadas a la raíz autorizada. `open` solicita abrir una ventana del navegador local; si no puede iniciarse, el archivo se conserva y la respuesta incluye `editorUrl` y `openError`. `opened: true` indica que se lanzó el proceso, no que se haya comprobado visualmente la ventana. Algunos clientes necesitan reiniciar su conexión MCP para descubrir la octava herramienta.

Desde la CLI:

```sh
node automation/cli.mjs review --project borrador.colorflow.json --out editar.html --open
```

Sin `--open`, sólo genera el archivo. En la API: `api.review({project, output, open: true})`. No requiere Chrome headless, aunque abrir automáticamente sí requiere encontrar un navegador compatible. El HTML puede abrirse manualmente.

El usuario modifica puntos, radios y tiempos. **Guardar proyecto** descarga el editable actualizado. Recargar `editar.html` recupera el borrador incorporado, no las modificaciones posteriores: guarda el JSON para conservarlas. Los cambios no vuelven automáticamente al asistente.

## B. Exportar para integrar

En **Exportar HTML → Uso de la animación**, elige **Integrar en otra presentación**. Se descarga `animacion-integrada.zip` con:

- `animacion.html`: animación autónoma con control por etapas.
- `tinta-color-host.js`: controlador reutilizable del contenedor.
- `ejemplo.html`: cuatro láminas, tres animaciones y una explicación intermedia.
- `LEEME.txt`: instrucciones breves en español e inglés.

Descomprime todos los archivos antes de abrir el ejemplo. Entrega la carpeta al agente que prepara la presentación. No hace falta modificar el HTML de la animación. En API/CLI/MCP, usa `presentation: {mode: "integrated"}`; `render` entrega `presentacion.html` y los mismos auxiliares junto al informe y las vistas previas. Los objetos de un parche reemplazan el objeto completo: conserva el fondo y color que quieras mantener.

El modo integrado espera una orden por etapa habilitada, aunque `pauseAfter` sea falso. Conserva tiempos, puntos y geometrías. Al abrir ese HTML directamente mantiene clic, flechas, Espacio y el reinicio final por hover; no reproduce automáticamente. La presentación independiente conserva también sus controles habituales.

## Una sola entrada para toda la presentación

Desde 0.18.0, **`attach` conecta cada animación como superficie visual controlada por la presentación**. Desactiva los clics y el foco del iframe, y acuerda `interaction: "host"` con el reproductor para ocultar todos sus controles internos, incluido Reiniciar. Los clics sobre dibujo y márgenes alcanzan el documento principal. La presentación decide qué animación o lámina recibe la acción. No se reenvían gestos desde el iframe.

```html
<iframe id="imagen" src="animacion.html" title="Ilustración" allowfullscreen></iframe>
<button type="button" data-tinta-color-action="back">Retroceder</button>
<button type="button" data-tinta-color-action="restart">Reiniciar imagen</button>
<script src="tinta-color-host.js"></script>
<script>
const imagen = TintaColorHost.attach(document.getElementById('imagen'));
const secuencia = TintaColorHost.createSequence([
  imagen,
  { run: () => mostrarSiguienteElemento(), undo: () => ocultarElemento() }
]);
const entrada = TintaColorHost.bindInput({
  onAction: accion => secuencia.input(accion)
});
</script>
```

Sustituye las funciones de mostrar/ocultar por las de tu presentación. El ejemplo completo es ejecutable: una lámina introductoria, dos animaciones con explicación intermedia, una lámina normal y otra animación final. Todos los recursos usan el mismo controlador y la misma conexión de entrada. No hay que modificar sus HTML.

Si tu presentación ya administra las láminas, conserva esa lógica: usa `onAction` para decidir entre enviar la orden a su secuencia activa o navegar. No hace falta adoptar `createSequence`; también puedes utilizar directamente las operaciones de cada conexión. Una secuencia puede intercalar animaciones y pasos `{run, undo}`, o puedes tener una por lámina. Sólo la activa recibe las acciones.

**Configura `bindInput` una sola vez**, después de sustituir o conectar los manejadores anteriores. El controlador no puede deshacer una acción que otro manejador ya ejecutó. No combines `bindInput` con otro listener que invoque `sequence.handleKey`, ni con `onclick` en los botones que ya delegas al controlador. La función devuelve `destroy()`; vincular de nuevo la misma raíz sustituye la vinculación anterior sin duplicarla.

### Clics, teclado y controles

- Un clic principal en imagen, márgenes o fondo emite `advance`.
- → y Espacio emiten `advance`; Shift+→ salta; ← retrocede; Inicio reinicia la imagen activa; Fin muestra su final. Mantener una tecla no acumula avances.
- Un botón con `data-tinta-color-action` emite sólo su acción, aunque se pulse su icono o texto interior. Acciones: `advance`, `advance-wait`, `skip`, `back`, `restart`, `finish`, `pause`, `restart-sequence`.
- Botones normales, enlaces, campos, controles editables y otros controles nativos mantienen su función sin provocar además avance. Enter/Espacio conservan la activación nativa de botones; las flechas siguen funcionando tras usar la barra. En campos y controles que utilizan flechas, éstas no navegan la presentación.
- Para un control personalizado usa `data-tinta-color-ignore` en él o en su contenedor. `ignoreSelector` permite elegir otro selector. Las teclas con modificadores Ctrl/Alt/Meta, la composición de texto y los clics modificados conservan su función.
- `root` permite limitar la entrada a un elemento; por defecto es `document`, recomendado para mantener el teclado de toda la presentación. `onError` recibe los fallos del manejador.

La interfaz externa pertenece a la presentación. `sequence.activeAnimation` indica la conexión de la etapa actual o `null` en un paso normal; usa su propiedad `ready` para habilitar Reiniciar/Final cuando corresponda. El ejemplo incluye esa lógica. No quedan botones internos visibles pero sin uso. El reinicio de imagen vuelve a Inicio sin reproducir; el de toda la presentación es una acción diferente.

### Conexión y limpieza

Cada imagen requiere su `attach`, pero ninguna configuración individual de entrada. La conexión expone `ready`, `state`, `busy`, `error`, `onState`, `onRestart`, `onError` y `subscribe`. `onInput` permanece aceptado por compatibilidad, pero no se utiliza en el modo de entrada exclusiva. `sequence.handleKey` sigue disponible para integraciones anteriores; no se combina con `bindInput`.

`attach` recarga el iframe para establecer un canal nuevo. La negociación confirma que el reproductor oculta sus controles; si el HTML es anterior, se informa `HOST_INPUT_UNSUPPORTED` y es necesario reexportarlo. Una conexión no se declara disponible hasta confirmarlo.

`connection.destroy()` libera escuchas y solicitudes, devuelve al recuadro sus atributos previos de foco y mouse y solicita al reproductor restaurar su interacción. Conectar de nuevo el mismo iframe reemplaza la conexión anterior. `sequence.destroy()` deja de observar sus conexiones; la presentación decide cuándo liberar éstas.

| Operación de la conexión | Resultado |
| --- | --- |
| `advance()` | Predeterminado: inicia una etapa; si está pintándose, completa su cierre e inicia la siguiente. Durante la última, muestra el final y queda detenido. Si está pausada manualmente, la reanuda. |
| `advanceWhenIdle()` | Alternativa: inicia o reanuda una etapa; mientras pinta, descarta la orden (`reason: "busy"`). |
| `advance(true)` | Durante una etapa, muestra su cierre; esperando en un cierre, muestra el cierre siguiente. |
| `back()` | Muestra detenido el cierre anterior; desde la primera etapa vuelve a Inicio. |
| `restart()` | Vuelve a Inicio sin reproducción automática. |
| `finish()` | Muestra el cierre de la última etapa habilitada. |
| `pause()` | Pausa la etapa actual. `advance()` la reanuda. |
| `command('state')` | Consulta explícita, sin modificar reproducción. |

Las operaciones devuelven promesas con `state`. Avanzar después del final devuelve `consumed:false, completed:true`; la secuencia utiliza esa misma pulsación para el siguiente elemento. Flecha derecha y clic usan `advance()`: permiten adelantar al momento siguiente sin esperar a que termine el actual. La pulsación que completa la última etapa no avanza también la lámina; otra pulsación continúa la secuencia. `advanceWhenIdle()` conserva el comportamiento anterior de ignorar avances durante la pintura. La repetición automática de una tecla mantenida sigue deshabilitada. Una orden antes de estar disponible devuelve `NOT_READY` y no queda pendiente. El cierre incluye pintura acumulada, enfoque y destacado finales, también para etapas de duración cero. Retroceder no reproduce al revés.

`sequence.advanceWhenIdle()` aplica la alternativa de espera a la secuencia; `sequence.input('advance-wait')` es su equivalente por acción. `sequence.advance(true)` salta el momento; `sequence.back()` retrocede; `sequence.input('restart')` reinicia la imagen actual y `sequence.input('finish')` la lleva al final. **`sequence.restart()` reinicia el ejemplo o secuencia completa**, deshaciendo los pasos con `undo`; es distinto del reinicio de una imagen.

Abierta directamente, la animación conserva su botón ↻ Reiniciar al terminar. **Conectada a la presentación, ese botón queda oculto**: Reiniciar se solicita desde los controles externos o la API. La conexión sigue notificando reinicios para coordinar su lugar en la secuencia. Si otro recurso está pintando, un reinicio externo de una imagen anterior no empieza a reproducir ambas. Las acciones `run` deberían ser repetibles, ya que un retroceso puede ejecutarlas nuevamente.

## Contrato de mensajes v1

El controlador utiliza `postMessage`, comprueba la ventana exacta, el origen y un canal aleatorio por iframe. El canal y el origen del padre se pasan en el fragmento de la URL; se mantiene apertura `file://` mediante comprobación de ventana y canal, sin confiar sólo en el origen `null`. No se admiten instrucciones de código arbitrario.

Los mensajes llevan `protocol: "tinta-color"`, `version: 1`, `channel` y `kind`. `connect` establece conexión con `interaction: "host"`; el reproductor confirma ese campo en sus avisos. `disconnect` restaura su interacción; `command` lleva `id` y uno de `advance`, `advance-wait`, `skip`, `back`, `restart`, `finish`, `pause`, `state`. `reply` devuelve el resultado y el mismo `id`. `event` informa `loading`, `ready`, `state`, `restart`, `error`. `input` es legado y se ignora en la conexión de entrada exclusiva; los gestos los recibe el documento principal. El controlador recomendado administra este protocolo; no hace falta construir mensajes a mano.

El estado contiene `index` (índice original desde cero), `position` (posición entre etapas habilitadas), `stageCount`, `name`, `phase` (`initial`, `playing`, `waiting`, `paused`, `completed`), `time`, `elapsed`, `total`, `atStart`, `playing`, `waiting`, `ended`, `empty` y vista. Los avisos de estado se envían al cambiar fase o etapa, no en cada fotograma; consulta `state` para el tiempo actual. En el propio HTML, `window.TintaColorPlayer` expone `command` y `getState`; el contenedor debe usar el controlador para no depender del acceso directo entre archivos locales.

Mantén el ejemplo y animaciones bajo el mismo esquema: todos locales o servidos por HTTP. Si el contenedor utiliza `sandbox`, debe permitir scripts; la política del anfitrión puede imponer más restricciones. No es una conexión con el editor, ni requiere MCP durante la presentación.

## Comprobación antes de integrar

Para actualizar una presentación existente, vuelve a exportar las animaciones y reemplaza también `tinta-color-host.js`; los HTML antiguos conservan su reproductor incorporado. Carga un único controlador actualizado para todas las imágenes y establece una sola entrada con `bindInput`. No parches los HTML exportados ni añadas excepciones por imagen. Si la presentación real tiene un bloqueo propio durante la pintura, el agente debe retirarlo para este avance; los controles de versiones anteriores podían ignorar la orden antes de enviarla.

Prueba varias animaciones, texto intermedio y láminas normales: clics en dibujo y márgenes, avance durante pintura, salto, retroceso entre láminas, reinicio externo y botones sin doble acción. Comprueba que Tab no entra en recuadros, que escribir no avanza y que la apertura independiente conserva el reinicio por hover. Comprueba una apertura local sin conexión. La integración con tu presentación real debe conectar su sistema de avance y ensayarse por separado.
