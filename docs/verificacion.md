# Verificación del proyecto

[English](en/verification.md) | **Español**

[Volver al proyecto](../README.es.md)

Este documento registra comprobaciones históricas y sus limitaciones. Su traducción no significa que se hayan repetido esas pruebas. Si un resultado antiguo difiere del comportamiento actual, consulta la versión más reciente correspondiente.

## v0.14.0 · Nuevo proyecto y preferencias

- 11 pruebas de preferencias sin DOM: valores de fábrica, independencia de objetos, rangos/pasos/tipos/colores/umbrales, JSON, almacenamiento dañado/bloqueado, nuevos proyectos/etapas, borradores vacíos con permiso explícito y motor/archivos existentes sin alterar.
- `node scripts/ejecutar-pruebas-vista.mjs --projects` ejecutado en Chrome para es/en/fr/de: ejemplo inicial, Nuevo vacío, guardar/reabrir sin imágenes, cancelar/descargar/confirmar reemplazo, pendientes inválidos protegidos, preferencias sin mutación del proyecto, idioma durante un borrador, importación/exportación y rechazo de archivos inválidos/importaciones tardías, nuevas etapas y puntos con radios heredados, protección de Abrir/ejemplo y conservación ante fallo de preparación.
- Revisión adicional Chrome headless sin conexión y `file://`: 192 casos (cuatro idiomas, doce ventanas, ejemplo/vacío/preferencias/advertencia), sin desbordamientos horizontales ni errores de página; Escape conserva el trabajo. Cambio de inicio a vacío, recarga, valores recordados, retorno al ejemplo con sus valores propios y almacenamiento bloqueado comprobados. Capturas alemanas revisadas. Esta matriz usa un arnés local de revisión, separado de los comandos del repositorio.
- Regresiones: 106/106 casos de motor/reproductor sin DOM, 29/29 de automatización, 461 claves completas por idioma; escenarios de idiomas/HTML autónomo, preparación de imágenes y destacados correctos. No se revisaron otros motores de navegador ni dispositivos físicos.

## v0.13.1 · Textos largos y distribución

- Revisión adicional en Chrome headless, apertura directa `file://` y contexto sin conexión: 384 casos, cuatro idiomas (es/en/fr/de), ocho pantallas por tamaño: etapa, Inicio, General, revisión de cambios, alineación, comparación generada, diálogo de exportación y HTML autónomo.
- Doce ventanas: 1920 × 1080, 1440 × 900, 1280 × 720, 1024 × 768, 920 × 700, 901 × 650, 768 × 1024, 600 × 800, 390 × 844, 320 × 568, 1024 × 390 y 844 × 390. Nombres extensos de etapa/archivo y texto continuo de 180 caracteres en la presentación. Sin desbordamiento horizontal, controles cortados, solapamiento de la ayuda de selección ni errores de página. Los dos lienzos de comparación mantienen posición vertical y altura coincidentes.
- Capturas revisadas de lienzo, comparación y controles exportados en alemán. Reinicio dentro de la ventana en todos los tamaños. Mostrar/ocultar los controles exportados mantiene las dimensiones y posición del lienzo.
- Regresiones del repositorio: `node tests/i18n.test.mjs`, `node scripts/ejecutar-pruebas-vista.mjs --i18n`, `--editor` y `--highlights` correctas; 106/106 pruebas sin DOM y 29/29 de automatización. Las pruebas de idioma incluyen etiquetas de herramientas visibles, texto completo de selector estrecho, ausencia de scripts duplicados y presentación con texto largo sin cambiar el tamaño de la imagen.
- La matriz adicional se ejecutó con un arnés local de revisión; no forma parte del comando de pruebas de idioma. No se revisaron otros motores de navegador ni dispositivos físicos.

## v0.13.0 · Francés y alemán

- Cuatro catálogos completos con 429 claves cada uno. Las pruebas comparan los catálogos sin alternativa automática y verifican variables, atributos HTML, código exportado y detección de variantes regionales.
- `node scripts/ejecutar-pruebas-vista.mjs --i18n` ejecutado en Chrome por separado para es, en, fr y de. En los cuatro casos se conserva proyecto, revisión, selección múltiple, pendientes inválidos, encuadre de comparación y reproductor al cambiar de idioma, también durante el cálculo de la base.
- Cuatro HTML autónomos ejecutados en trabajos distintos: idioma de salida independiente del editor, controles, inicio, final y reinicio correctos.
- Apertura directa sin conexión comprobada en Chrome con fr-CA y de-AT: selecciona Français y Deutsch respectivamente. La selección manual del otro idioma se conserva al recargar; sin errores de página.
- 106/106 pruebas sin DOM y 29/29 de automatización. La documentación permanece en español e inglés. La revisión completa de textos largos y tamaños de pantalla se realizará en la siguiente entrega; estas pruebas verifican traducción e interacciones, no esa revisión estética completa.

## v0.12.0 · Español e inglés

- Catálogos y variables verificados con `node tests/i18n.test.mjs`: claves equivalentes, enlaces de texto HTML, detección regional, alternativa española, almacenamiento bloqueado, interpolación y fábrica/exportación autocontenidas.
- 106/106 pruebas sin DOM y 29/29 de automatización correctas. Se actualizó el contexto de pruebas del constructor para cargar su dependencia de traducción.
- Chrome real con `node scripts/ejecutar-pruebas-vista.mjs --i18n`: proyecto y revisión sin cambios, nombres literales conservados, selección múltiple, borradores numéricos inválidos, revisión abierta, cambio durante cálculo de base, zoom, reproductor pausado y exportación independiente. HTML inglés ejecutado en otro trabajo: inicio, controles, avance, final y reinicio traducidos.
- Regresión en Chrome de Imágenes y destacados múltiples: luz, cancelación, ajustes recientes, píxeles completos, originales intactos, unión, transparencia y HTML exportado correctos.
- Apertura directa `file://` comprobada en Chrome con el contexto sin conexión: detección inglesa, cambio a español y preferencia conservada al recargar. Revisión visual básica a 1440 × 1000 de cabecera y diálogo, sin errores de página ni desbordamiento de cabecera. No sustituye la revisión completa de textos largos prevista para una entrega posterior.

## v0.11.0 · Destacados múltiples

- 106/106 pruebas sin DOM y 28/29 de automatización: migración del rectángulo único, precedencia de la lista, persistencia en Inicio/etapas y codec, selección, asas, límites, tamaño mínimo, vínculo general, validación de listas y parche antiguo de API.
- Chrome real con Canvas: seis tratamientos exteriores, dos interiores intactos y espacio entre rectángulos tratado; solapamiento con alfa de fuente 0.5 sin acumulación; transiciones de cantidad/exterior con extremos correctos.
- Editor completo: dibujo normal, Ctrl para agregar incluso en otro rectángulo, selección desde lista, movimiento, tamaño, cancelación, reemplazo, enfoque intacto y lista conservada al alternar el vínculo. Suprimir y ×; último borrado deshabilita. También se comprobaron varios destacados en Inicio. Se corrigió el desplazamiento causado por focus() en lienzos pequeños.
- HTML autónomo generado y ejecutado en otro trabajo de Chrome: unión transparente de Inicio, unión de etapa con exterior negro y reinicio que recupera Inicio. El fixture permite sus scripts/estilos inline propios; los permisos del servidor de automatización de producción permanecen sin cambios.
- Exportación real por API con el samurái a 490 × 720: listas de Inicio/etapa conservadas en formato 10, dos interiores opacos y espacio intermedio transparente en inicio.png, exterior negro en final.png y HTML autocontenido. CLI y MCP también crean listas completas, verificadas al inspeccionar sus proyectos.
- Repetición: `npm test` y `npm run test:highlights` (requiere Chrome/Edge local). Las pruebas de navegador ejecutan los controles y verifican píxeles; no se hizo una revisión estética manual de cada tamaño de pantalla ni se repitió la apertura directa file://.

La entrada histórica anterior registra 28/29 pruebas de automatización, mientras que el historial de cambios registra 29 para esa versión. Una ejecución nueva durante la preparación de la documentación bilingüe confirmó **29/29 correctas** con `node tests/automation.test.mjs`, sin modificar código. Se conserva el resultado histórico para distinguir las dos comprobaciones.

## v0.10.0 · L, composición y editor progresivo

- 100/100 pruebas sin DOM y 26/26 de automatización. Cobertura nueva: L con masas pardas, exclusión de pigmento rojo, M/N sin aclarado, papel cálido, copia literal antigua, formato 9 y conservación de K al abrir formato 8.
- El motor por regiones es idéntico byte por byte al motor completo en las pruebas de bloques pequeños que cruzan trazos y bordes, con controles de suavidad, pigmento, umbrales y papel. El soporte conectado de L se calcula globalmente; margen local 12 px más margen de remuestreo.
- Worker Blob, OffscreenCanvas y Canvas reales en Chrome: igualdad exacta de base, final y recuento de igualación para samurái (1035 × 1520), Calvin anterior (1600 × 1153) y Calvin del pantalón (1229 × 1600). Se comprobaron L/M a 720 px, L/N con suavidad al máximo y papel cálido a 1080 px, K/copia literal y filtro ink. El cambio de encuadre reprioriza el siguiente bloque; cancelación y revisiones obsoletas comprobadas.
- Primer bloque en aproximadamente 0.07–0.33 s y cálculo completo de líneas en 3.6–4.4 s en esta sesión. Son mediciones locales con el renderizador de pruebas, no garantías de tiempo.
- L reproduce exactamente el PNG experimental del pantalón. En Calvin anterior difieren 41 píxeles y en samurái 71; diferencia máxima de un nivel de gris. No se afirma equivalencia con una referencia de tinta original inexistente.
- Diálogo real ejecutado en Chrome headless: carga de imagen, L/M/N, cambios rápidos de parámetros, encuadre conservado, Aplicar/Descargar bloqueados hasta el último resultado, aplicación idéntica al motor completo y originales intactos. Se probaron estados apagado/amarillo/verde pulsante/verde fijo/rojo, error simulado y reintento, cierre con trabajador pendiente. Navegación comprobada con Canvas y geometría reales: rueda, arrastre, miniatura y rectángulo.
- Preparación real de L/M: base.png y referencia.png idénticos entre API, CLI y MCP. Exportación real de L/N autocontenida, proyecto formato 9 y original incrustado intacto.
- No hubo una revisión manual de toda la interfaz ni una captura visual nueva del diálogo. Las pruebas ejecutan sus controles y verifican geometría/píxeles; no sustituyen una revisión estética de cada tamaño de pantalla. La apertura directa file:// no se repitió; se conservan scripts clásicos y Worker Blob sin peticiones externas.
- Repetición: `npm test`, `npm run test:preview`, `npm run test:editor`. Las dos últimas necesitan Chrome/Edge local; puede pasarse una imagen como argumento al script. No se incorporaron imágenes de Calvin ni dependencias de experimentación.

## v0.9.1 · Igualación de trazos

- 94/94 pruebas sin DOM y 26/26 de automatización. Casos nuevos: RGBA idéntico, píxel gris 254, fondo cálido y fraccionario, pigmento fuera de los trazos, opciones inactivas, buffers incompatibles, persistencia y contrato API/CLI/MCP.
- Preparación real de la acuarela del samurái a 490 × 720 con Chrome. Ambas igualaciones seleccionan 146659 píxeles y dejan libres 206141; comparación de todos los canales: sólo cambia el lado elegido y los píxeles seleccionados quedan idénticos entre ambas imágenes. Papel cálido selecciona la misma cantidad, sin convertir el fondo en tinta.
- Cambiar de opción y volver a none reproduce byte por byte los buffers anteriores; cada proyecto preparado mantiene intactos los bytes de la imagen original incrustada. La exportación HTML autónoma contiene exactamente los PNG igualados que se comprobaron en preparación.
- Sin revisión interactiva nueva del diálogo: las comprobaciones anteriores verifican preparación, contratos y exportación real, no cada interacción visual.

## v0.9.0 · Integración de K

- 88/88 pruebas sin DOM: referencia sintética independiente del prototipo Python, rayas sobre rojo, textura débil, negros sólidos, dimensiones, controles y compatibilidad de formatos. 24/24 pruebas API/CLI/MCP.
- A resolución nativa, Calvin (1600 × 1153) difiere en 42 píxeles y samurái (1035 × 1520) en 72 píxeles respecto al PNG experimental K. La diferencia máxima es de un nivel de gris; diferencia media menor de 0.00005 niveles. El método ink reproduce exactamente sus PNG anteriores.
- Aproximadamente 3.3 s y 2.8 s respectivamente en Node de esta sesión; son mediciones locales, no garantías de tiempo. K analiza el original con un lado mayor de hasta 1600 px y reduce después la base a la resolución de animación (720, 1080 o 1440). Así la detección no cambia de escala al elegir una animación más pequeña.
- Preparación real del samurái a 720 px con Chrome: base de 490 × 720, archivo PNG idéntico en API, CLI y MCP; exportación real autocontenida y proyecto editable de formato 8.
- El Edge instalado se cerró antes de entregar el trabajo headless. La selección automática en Windows prioriza ahora Chrome cuando está disponible; también se puede indicar browser/--browser. La preparación y exportación se comprobaron con la selección automática de Chrome. El editor conserva su apertura directa en navegador.
- No se hizo una nueva revisión interactiva del editor en navegador desde esta sesión. Las pruebas sin DOM y las operaciones reales de preparación/exportación no equivalen a comprobar cada interacción visual.
- Las copias experimentales y el comparador se mantuvieron separados y sin modificaciones. No se incorporaron imágenes de Calvin ni dependencias Python/sharp a la aplicación.

## v0.8.0 · Base de tinta configurable

Fecha: 18 de octubre de 2026.

- 80 pruebas sin DOM y 88 correctas en Chrome. Los casos nuevos comprueban pigmentos claros/oscuros hacia papel, conservación de negro y gris neutro, mezcla hacia gris, acuarela tenue, umbrales, suavidad hasta 100%, tono de papel y compatibilidad con la desaturación anterior.
- 24 pruebas de automatización correctas: contrato de base, umbrales ordenados, persistencia, preparación sin HTML ni cálculo y llamadas CLI/MCP. Se ejecutaron como procesos con el Node.js 24.21.0 incluido en VS Code, mediante ELECTRON_RUN_AS_NODE; no se instaló software.
- Diálogo comprobado con la imagen real: generación explícita, comparación, presets, controles deshabilitados en desaturación, ampliación al 200% y suavidad al 100%. Cerrar y volver a abrir conserva uploaded y los valores originales; Aplicar sin vista previa la genera primero y mantiene el diálogo abierto para revisión.
- Aplicación posterior guarda base derived a 720 px. Proyecto descargado revisado: formato 7, método ink y smoothness 1. El PNG descargado por el editor coincide byte por byte con base.png de la preparación API, para los mismos valores.
- Prepare real ejecutado en Chrome con un emisor fuera de su zona: genera base, referencia, comparación, proyecto e informe sin calcular propagación. imageDecodingChecked es true y calculationChecked false. El informe conserva los ajustes de generación.
- Proyecto de ejemplo anterior exportado nuevamente con el renderer compartido: 16,891 s y HTML idéntico al ejemplo existente. No fue necesario regenerar los grandes archivos del ejemplo.
- Comparación y controles capturados en images/vista-base.png; sin errores ni advertencias de consola. Se mantiene la limitación de las herramientas para navegar a file:// y no se cambió ningún permiso del navegador. No se probó una conexión a un cliente MCP externo ni el arranque headless real; se usó el mismo trabajo y runner abriendo su URL desde el navegador de pruebas.

## v0.7.0 · API, comandos y MCP

Fecha: 18 de octubre de 2026.

- 21 pruebas de automatización correctas: contrato, coordenadas y geometría, creación, actualizaciones aisladas, compatibilidad anterior, errores sin modificar archivos, raíz de trabajo y enlaces, artefactos, CLI, negociación MCP, recursos, llamadas, cancelación y transporte stdio fragmentado con Unicode. También verifican timeout y cierre de proceso, servidor y perfil con un lanzador simulado.
- 71 pruebas existentes del motor sin DOM y 79 pruebas correctas en Chrome. Cálculo y exportación comprobados en el editor después de extraer formato, trabajador y constructor HTML. Sin errores ni advertencias de consola.
- Proyecto de ejemplo procesado por la API con navegador real: cuatro etapas, 735 × 1080 px y 16,891 s, sin pausas manuales. Generó HTML, proyecto editable, informe, plan con geometría y fotogramas. El HTML coincide byte por byte con el ejemplo v0.6.1; la nueva descarga del editor también coincide. No fue necesario modificar los ejemplos grandes.
- CLI create ejecutado mediante su función principal con la imagen coloreada real y el plan incluido: proyecto de tres etapas y base derivada. Una llamada MCP renderizó ese proyecto en Chrome y devolvió artefactos e informe correctos: 490 × 720 px, 5,846 s y aviso de base desaturada.
- Presentación generada abierta en Chrome y avanzada por clic hasta la segunda etapa, con controles ocultos. Captura del trabajo real guardada en images/vista-automatizacion.png.
- Los trabajos visuales utilizaron el mismo servidor y runner del modo automático, abriendo sus URLs mediante el navegador de pruebas. El ejecutable node no está disponible en el PATH de este equipo: no se ejecutó el CLI como proceso independiente ni se inició Chrome/Edge desde el lanzador headless real. Ese arranque y la conexión a un cliente MCP concreto quedan por verificar en una instalación con Node.js.
- La política del navegador de pruebas impidió navegar a file://. No se modificaron permisos ni se intentó eludirla; la apertura directa desde archivo queda sin repetir en esta versión. El editor conserva scripts clásicos locales, sin nuevas peticiones ni dependencias externas. Los servidores temporales de pruebas se cerraron al finalizar.

## v0.6.1 · Reinicio visible al terminar

Fecha: 18 de octubre de 2026.

- 79 pruebas correctas en Chrome. Cambio limitado a la interfaz exportada; se conserva el formato editable 6.
- HTML generado mediante el editor y abierto en Chrome. Botón ausente en Inicio y durante la reproducción; al terminar queda oculto con el mouse fuera de la imagen y visible al entrar en ella.
- Fondo oscuro opaco, texto blanco y borde doble comprobados visualmente sobre la presentación con transparencia. Captura guardada en `images/vista-reinicio.png`.
- Clic en «Reiniciar» restaura Inicio, tiempo cero y estado detenido. El siguiente clic sobre el lienzo inicia la primera etapa.
- Tab revela y enfoca el botón final con contorno destacado; Enter reinicia y devuelve el foco al lienzo. Sin errores ni advertencias de consola.

## v0.6.0 · Desfase de pintura y avance por clic

Fecha: 18 de octubre de 2026.

- 71 pruebas sin DOM y 79 pruebas correctas en Chrome. Los casos nuevos cubren normalización, desplazamiento de llegadas, duración propia, primer activo, dependencias, muestras del pincel, enfoque antes de pintar, permanencia, etapas visuales y deshabilitadas, edición colectiva, empaquetado y navegación desde pausas.
- Control individual comprobado: modifica el desfase y muestra el valor actualizado. General detecta diferencias; una aplicación confirmada a dos etapas modifica únicamente sus desfases.
- Proyecto descargado de formato 6 revisado: conserva el desfase por etapa. Proyecto de formato 5 normalizado a 6 con desfase cero en todas las etapas.
- HTML exportado probado con clic real sobre el lienzo: el primero inicia, el segundo avanza reproduciendo y, después de pausar con Espacio, otro clic avanza conservando la pausa. En la última etapa termina y un clic adicional conserva el final sin reiniciar.
- Barra oculta conservada durante los clics y ausencia de errores de consola comprobadas. La navegación desde una pausa intermedia se verifica con reloj simulado en las pruebas compartidas.
- Ejemplos regenerados con primera transición de 0,8 s y desfase de 1,2 s. Captura del nuevo control y vista de presentación actualizadas.

## v0.5.0 · Selección de etapas y controles ocultos

Fecha: 18 de octubre de 2026.

- 61 pruebas sin DOM y 69 pruebas correctas en Chrome. Los casos nuevos verifican habilitación por defecto, exclusión de etapas, cámara y navegación entre etapas habilitadas, Inicio cuando todas están deshabilitadas, resumen del grupo y aplicación aislada de sus radios.
- Ctrl + clic comprobado en la interfaz: selecciona varias etapas, permite quitar miembros y mantiene al menos una. La casilla de habilitación no cambia el grupo.
- Aplicación a dos etapas, una deshabilitada, revisada y confirmada: modifica sus seis puntos y deja intacto el radio de una tercera etapa. La selección conserva sus destinos al reordenar.
- Borradores independientes de General y de la selección comprobados. La preparación de imágenes conserva el grupo y sus pendientes.
- Proyecto descargado de formato 5 revisado: conserva habilitación por etapa y valores aplicados solo al grupo. Compatibilidad con formato 4 comprobada: las etapas sin el campo nuevo se habilitan por defecto.
- Secuencia con todas las etapas deshabilitadas comprobada en editor y HTML exportado: conserva Inicio, no consume tiempo y no reproduce pintura.
- Barra exportada oculta al abrir y logo accesible comprobados; clic y H alternan su visibilidad. El tamaño del lienzo permanece idéntico al mostrarla u ocultarla.
- Reproducción, pausa y cambio de etapa mediante teclado comprobados con la barra oculta. Borde, contorno de foco y sombra del lienzo ausentes.
- Ejemplos editable y autónomo regenerados, con capturas de edición, General, selección múltiple y presentación.

## v0.4.0 · General y etapas visuales

Fecha: 18 de octubre de 2026.

- 54 pruebas sin DOM y 62 pruebas correctas en Chrome. Los nuevos casos cubren etapas visuales, permanencia, pausas de duración cero, color acumulado, resumen de radios efectivos, aplicación colectiva, validación del lote y alcance opcional de Inicio.
- Transiciones comprobadas con píxeles reales: mezcla de negro a blanco con alfa opaco y paso gradual desde imagen opaca a exterior transparente.
- General comprobado en la interfaz: valores uniformes y variados, cambio pendiente, revisión de destinos, cancelación sin aplicar, conservación al navegar y confirmación que unifica el valor. Un valor fuera de rango bloquea la aplicación.
- Proyecto descargado de formato 4 revisado: conserva fondo exportado, permanencia y radios heredados. Un proyecto anterior de formato 3 se normaliza a 4 conservando sus encuadres, con permanencia cero y fondo achurado.
- Secuencia con todos los puntos desactivados reproducida como etapas visuales hasta la primera pausa, sin descartarlas.
- Presentación exportada comprobada en Chrome: fondo achurado real, borde y sombra del lienzo ausentes, última etapa visual conserva el color y deja ver el patrón a través del exterior transparente; sin errores de consola.
- Los fondos achurado, liso personalizado y transparente se comprobaron en la salida del constructor real de la presentación. Sintaxis del script incorporado correcta y sin recursos externos.
- Ejemplos editable y autónomo regenerados con una cuarta etapa exclusivamente visual. Capturas del editor, General y presentación actualizadas.

## v0.3.1 · Reorganización

Fecha: 18 de octubre de 2026.

- 44 pruebas sin DOM ejecutadas con `scripts/ejecutar-pruebas.mjs` y 50 pruebas correctas en Chrome desde `tests/index.html`.
- Editor cargado desde la raíz con scripts en `src/`, estilos en `assets/` y ejemplo en `examples/`; recursos servidos correctamente desde las nuevas rutas.
- Ejemplo calculado en el trabajador y reproducido hasta la primera pausa, con duración total de 14,1 segundos y sin errores de consola.
- Presentación existente abierta desde `examples/presentacion-ejemplo.html`, con Inicio listo y sin errores de consola. Su contenido autónomo y el proyecto editable se conservan sin cambios.
- Generador del ejemplo comprobado: datos de ambas imágenes idénticos a los incorporados antes de reorganizar y salida reproducible.
- Referencias locales del README, documentación y archivos HTML comprobadas; sin destinos ausentes.
- Sintaxis del código reubicado y del script de la presentación comprobada. La captura del editor se actualizó en `docs/images/`.
- Se mantiene el formato editable 3. La reorganización no introduce dependencias ni compilación.

## v0.3.0 · Funcionalidad

Fecha: 18 de octubre de 2026.

- Sintaxis JavaScript comprobada en los archivos del editor, motor, preparación, reproductor y pruebas.
- 44 pruebas sintéticas correctas en JavaScript y 50 dentro de Chrome. Las seis adicionales comprueban píxeles reales de los modos mostrar, desenfocar, negro, blanco, color y transparente. Incluyen las comprobaciones originales y nuevos casos de secuencias, primer activo, desactivación, reordenamiento, tono, radio máximo, pincel, borde tenue persistente, cámara, etapas omitidas y codificación de la exportación.
- Ejemplo con las dos imágenes proporcionadas calculado en un Web Worker y reproducido en Chrome. Pausas intermedias observadas; sin errores de consola durante la prueba.
- Herramientas de rectángulo, polígono cerrado con Enter y recorrido comprobadas mediante interacción con el lienzo.
- Preparación alternativa desde la imagen final aplicada en el diálogo y base desaturada comprobada visualmente.
- Guardado de proyecto descargado y contenido validado con las funciones reales del editor; se conservan imágenes, etapas y alineación. Archivo inválido rechazado por el validador.
- Exportación HTML descargada, sintaxis del script incorporado validada y mapas de tiempos revisados. Incluye dos imágenes PNG, tres mapas y el reproductor; no referencia recursos externos.
- Presentación exportada abierta y reproducida en Chrome, con pausa manual y desplazamiento al final de la secuencia.
- Doble clic sobre un punto comprobado: se elimina y se renumera la lista.
- Activación y reordenamiento de puntos comprobados en la interfaz; se conservan modo y demora. Una etapa vacía se omite y no consume su pausa.
- Encuadre arrastrado en el lienzo, vista previa comprobada y acercamiento observado en la presentación autónoma.
- Pincel probado sobre las imágenes de ejemplo con todos los puntos desactivados y radio máximo del 10%: colorea una franja y conserva el resto de la página como base.
- Proyecto descargado de formato 2 revisado: contiene activación, modos, demoras, ambos radios, tono y encuadres.

- Inicio, enfoque y destacado independientes comprobados en el editor: zoom al 0%, desenfoque y transparencia con damero.
- Renombrado con doble clic y lápiz comprobado; Enter guarda y Escape conserva el nombre anterior.
- Arrastre del asa de tinta comprobado: cambia de 22% a 30% solo en el punto, desactiva la herencia y conserva el 22% de la etapa. La casilla restaura la herencia.
- Presentación exportada con Inicio transparente y destacado independiente abierta en Chrome; conserva el canal alfa, comienza desde la base y restaura Inicio al reiniciar.
- Pruebas del motor para radios propios y heredados, límite por punto, inversión del viento, normalización de vista, zoom independiente y metadatos de destacado en el códec.
- Ejemplos editable y autónomo regenerados con formato 3 y los valores predeterminados acordados.

## Límites de la comprobación

La automatización del navegador solo permite direcciones HTTP/HTTPS. La revisión visual se hizo mediante un servidor temporal enlazado únicamente a `127.0.0.1`, limitado a los archivos de esta aplicación. El editor y la exportación usan scripts locales y datos incorporados, sin peticiones de red, pero la apertura directa mediante `file://` no pudo automatizarse.

La extensión de Chrome no tiene el permiso de acceso a archivos requerido para automatizar su selector. Se verificaron la descarga y el contenido del proyecto; no se completó la reapertura mediante el selector del navegador ni la carga de imágenes nuevas por ese selector. No se modificaron los permisos de la extensión.

La alineación se comprobó con las imágenes proporcionadas; otros pares pueden requerir ajustes manuales. No se han realizado pruebas en otros navegadores ni en dispositivos móviles.
