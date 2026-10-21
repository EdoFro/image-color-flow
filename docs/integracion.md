# Borradores e integración en presentaciones

[English](en/embedding.md) | **Español**

[Volver al proyecto](../README.es.md)

Disponible desde 0.16.0; avance predeterminado actualizado en 0.17.0. Este flujo no conecta al asistente con una sesión abierta del editor: el usuario termina la edición y entrega la exportación al agente que integra la presentación.

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
- `ejemplo.html`: dos animaciones, explicación intermedia y segunda lámina.
- `LEEME.txt`: instrucciones breves en español e inglés.

Descomprime todos los archivos antes de abrir el ejemplo. Entrega la carpeta al agente que prepara la presentación. No hace falta modificar el HTML de la animación. En API/CLI/MCP, usa `presentation: {mode: "integrated"}`; `render` entrega `presentacion.html` y los mismos auxiliares junto al informe y las vistas previas. Los objetos de un parche reemplazan el objeto completo: conserva el fondo y color que quieras mantener.

El modo independiente conserva su reproducción habitual. El integrado espera una orden en cada etapa habilitada, aunque `pauseAfter` sea falso. No altera los tiempos, puntos ni el proyecto de autoría; fuerza las pausas sólo en el reproductor exportado. Los controles habituales se ocultan, pero permanece el reinicio final. Si se abre por sí solo, clic/→/Espacio avanzan una etapa; Shift+→ salta, ← retrocede, Inicio reinicia y Fin termina. No hay reproducción automática.

## Controlador de la presentación principal

```html
<iframe id="imagen" src="animacion.html" title="Ilustración" allowfullscreen></iframe>
<script src="tinta-color-host.js"></script>
<script>
let sequence;
const imagen = TintaColorHost.attach(document.getElementById('imagen'), {
  onInput: action => sequence.input(action),
  onError: error => console.error(error)
});
sequence = TintaColorHost.createSequence([
  imagen,
  { run: () => mostrarSiguienteElemento(), undo: () => ocultarElemento() }
]);
document.addEventListener('keydown', event => sequence.handleKey(event), true);
</script>
```

Las funciones de mostrar/ocultar son las de tu presentación; sustituye ese paso por su comportamiento real. El ejemplo incluido es ejecutable y muestra también el cambio de lámina. Cada animación necesita su propio `attach`. La lista puede intercalar animaciones y pasos `{run, undo}`; `run` se ejecuta con un avance, `undo` es opcional para retroceder. Se puede crear una secuencia por lámina o una global. Si hay varias, el contenedor debe enviar la entrada sólo a la activa.

**Un único responsable del avance:** conecta o retira los manejadores anteriores del contenedor. Este controlador no puede impedir que otro manejador ya ejecutado cambie una lámina. `handleKey` consume las teclas reconocidas; evita repetición automática y no toma controles de texto. Los botones del ejemplo ofrecen las mismas acciones. Con foco dentro del iframe, el reproductor envía la entrada al contenedor mediante mensajes.

`attach` recarga el iframe para establecer un canal nuevo. `connection.ready`, `connection.state`, `connection.busy` y `connection.error` permiten consultar su estado. `onState`, `onInput`, `onRestart` y `onError` notifican cambios. `connection.subscribe` devuelve una función para dejar de observar; `destroy` libera escuchas y solicitudes. La secuencia también tiene `destroy`.

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

Al terminar una animación, su botón ↻ Reiniciar aparece al pasar el mouse y permite acceso por teclado. Ese clic vuelve a Inicio, avisa al contenedor y recupera el lugar de esa imagen en la secuencia sin empezar a pintar. Si otra imagen está pintando, el retorno queda para cuando termine su momento; no se inician dos a la vez. La secuencia puede repetir después sus elementos posteriores, por lo que sus funciones `run` deberían poder ejecutarse nuevamente sin duplicaciones.

## Contrato de mensajes v1

El controlador utiliza `postMessage`, comprueba la ventana exacta, el origen y un canal aleatorio por iframe. El canal y el origen del padre se pasan en el fragmento de la URL; se mantiene apertura `file://` mediante comprobación de ventana y canal, sin confiar sólo en el origen `null`. No se admiten instrucciones de código arbitrario.

Los mensajes llevan `protocol: "tinta-color"`, `version: 1`, `channel` y `kind`. `connect` establece conexión; `command` lleva `id` y uno de `advance`, `advance-wait`, `skip`, `back`, `restart`, `finish`, `pause`, `state`. `reply` devuelve el resultado y el mismo `id`. `event` informa `loading`, `ready`, `state`, `restart`, `error`. `input` comunica la acción del usuario al contenedor. El controlador recomendado administra este protocolo; no hace falta construir mensajes a mano.

El estado contiene `index` (índice original desde cero), `position` (posición entre etapas habilitadas), `stageCount`, `name`, `phase` (`initial`, `playing`, `waiting`, `paused`, `completed`), `time`, `elapsed`, `total`, `atStart`, `playing`, `waiting`, `ended`, `empty` y vista. Los avisos de estado se envían al cambiar fase o etapa, no en cada fotograma; consulta `state` para el tiempo actual. En el propio HTML, `window.TintaColorPlayer` expone `command` y `getState`; el contenedor debe usar el controlador para no depender del acceso directo entre archivos locales.

Mantén el ejemplo y animaciones bajo el mismo esquema: todos locales o servidos por HTTP. Si el contenedor utiliza `sandbox`, debe permitir scripts; la política del anfitrión puede imponer más restricciones. No es una conexión con el editor, ni requiere MCP durante la presentación.

## Comprobación antes de integrar

Para actualizar una presentación existente, vuelve a exportar las animaciones y reemplaza también `tinta-color-host.js`; los HTML antiguos conservan su reproductor incorporado. Mantén un único controlador actualizado si compartes el archivo entre varias imágenes. Si la presentación real tiene un bloqueo propio durante la pintura, el agente debe retirarlo para este avance; los controles de versiones anteriores podían ignorar la orden antes de enviarla.

Prueba dos animaciones con un texto intermedio y otra lámina: avance durante la pintura, alternativa de espera, salto explícito, retroceso, final, reinicio por hover y teclado dentro/fuera del iframe. Comprueba una apertura local sin conexión. La integración con tu presentación real debe conectar su sistema de avance y ensayarse por separado.
