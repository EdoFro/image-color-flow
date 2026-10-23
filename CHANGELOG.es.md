# Cambios

[English](CHANGELOG.md) | **Español** · [Volver al proyecto](README.es.md)

## v0.21.1 · Vista de radios predeterminada

- Preferencias incorpora **Vista del editor → Mostrar todos los radios**. Se aplica al guardar y al abrir proyectos, sin modificar la animación. Se conservan las preferencias anteriores y se incluye en su importación/exportación.

## v0.21.0 · Imagen inicial como hoja vacía

- Nuevo modo Hoja en blanco, sin dibujo: blanco puro o tono uniforme estimado del papel. Vista previa automática, comparación sincronizada y descarga PNG.
- Omite extracción, alineación e igualación de trazos sin modificar la imagen coloreada. Compatible con preferencias, historial, guardado, exportación y API/CLI/MCP.
- Formato editable 12, con lectura de 1–11. Corregida la estimación de papel cálido uniforme para comparar la luminosidad en los mismos intervalos del histograma.
- Manuales bilingües, cuatro idiomas y pruebas de píxeles, reproducción y automatización actualizados.

## v0.20.0 · Zoom de edición y acciones por etapa

- Rueda con ampliación alrededor del puntero, porcentaje y botones 100 %, 200 %, ancho, alto e imagen completa. Mano y botón central desplazan; la vista se conserva al editar y cambiar de etapa.
- Navegación independiente del encuadre exportado y del historial, con las mismas coordenadas para imagen, puntos, radios y recorridos.
- Duplicar y eliminar en cada tarjeta; confirmación roja de dos clics y dos segundos para todos los botones de eliminar. Escape, clic fuera o pérdida de foco cancelan. Deshacer recupera las etapas.
- Manuales bilingües, controles en cuatro idiomas y pruebas de precisión, navegación, confirmación y límites actualizados.

## v0.19.0 · Proyectos con nombre, guardado local e historial

- Nombre de proyecto editable y persistente (formato 11; lectura compatible con 1–10). API, CLI y MCP review proponen nombre y destino, conservando el archivo original.
- Guardar y Guardar como con autorización de archivo cuando el navegador lo permite; alternativa por descarga con nombre y ruta recomendada claramente diferenciada del destino real.
- Deshacer/rehacer con Ctrl+Z y Ctrl+Y, hasta 80 pasos, arrastres agrupados y memoria de imágenes compartida. Conserva edición nativa en texto y protege guardados cancelados o fallidos.
- Manuales, contratos, guías bilingües, cuatro idiomas y comprobaciones de guardado, historial y automatización actualizados.

## v0.18.1 · Versión y enlaces en el editor

- Los enlaces de GitHub y del autor se sitúan a la derecha del título.
- La cabecera muestra la versión junto al nombre, un enlace al repositorio de GitHub y el crédito «by EdoFro» enlazado al perfil del autor.
- Los enlaces se abren en otra pestaña para conservar el trabajo en el editor. El empaquetado comprueba que la versión visible coincida con package.json.

## v0.18.0 · Entrada única de la presentación

- attach desactiva mouse y foco del iframe y negocia ocultar todos los controles internos, incluido Reiniciar. El HTML abierto directamente conserva su interacción.
- bindInput configura clic, teclado y botones una vez por presentación; respeta campos, enlaces y controles personalizados y evita acciones duplicadas.
- Ejemplo oficial con cuatro láminas, tres animaciones, explicación intermedia, retroceso y reinicios externos. activeAnimation permite habilitar controles según el contexto.
- Conservados avance durante pintura, salto y separación entre completar el último momento y continuar. Guías bilingües y pruebas de entrada/foco actualizadas.


## v0.17.0 · Avance predeterminado durante la pintura

- `advance` completa la etapa que se está animando e inicia la siguiente; en la última muestra el final sin avanzar también el contenedor. Flecha derecha y clic usan este comportamiento.
- `advanceWhenIdle()` / `advance-wait` conserva la alternativa que ignora avances mientras pinta. `skip` sigue mostrando un cierre sin iniciar la etapa siguiente.
- Controlador, ejemplo, guías bilingües y pruebas actualizados. Para presentaciones existentes se requiere reexportar HTML y reemplazar el controlador.


## v0.16.0 · Borrador en el editor e integración

- API/CLI/MCP `review` genera un editor autocontenido con el proyecto cargado y apertura opcional.
- Exportación integrada en ZIP con controlador, ejemplo de dos animaciones y láminas e instrucciones bilingües.
- Contrato v1: avanzar, saltar, retroceder, reiniciar, final, pausa y consulta; pausas por etapa y descarte de avances durante pintura.
- Reinicio final por hover notifica y recupera el turno en la secuencia; validación de origen, ventana y canal.
- Documentación y selector de exportación actualizados en los idiomas existentes.

## Sin publicar

- Documentación bilingüe español/inglés: portadas, manual, guías técnicas, galería y cambios, con navegación por idioma. La interfaz permaneció en español en ese primer commit documental.

- Código y documentación bajo licencia MIT, con archivo LICENSE y metadato en package.json. Las imágenes de ejemplo conservan sus condiciones por separado.
- Siete grabaciones MP4 de demostración: ejemplo 6 destacado en el README y galería de vídeos adicionales con navegación de ida y vuelta.

## v0.15.0

- `app/` autosuficiente con editor, idiomas, estilos, ejemplo incorporado, instrucciones bilingües, MIT y avisos de recursos. El acceso anterior redirige a `app/index.html`.
- Dos ZIP versionados: editor y completo (editor + API, CLI, MCP, esquema y guías), generados con `npm run package` o Node sin dependencias externas. Empaquetado reproducible, archivos permitidos y SHA256SUMS.txt; artefactos en `dist/`, excluidos de Git.
- Automatización, pruebas y generador de ejemplo actualizados para compartir `app/src/` y `app/demo/demo-data.js`. Documentación e instrucciones de descarga actualizadas en español e inglés.
- Ambos ZIP comprobados tras extraerlos: editor sin conexión en cuatro idiomas, Worker/base, reproducción, HTML autónomo y API/CLI/MCP reales desde el paquete completo.

## v0.14.0

- Nuevo proyecto limpia el lienzo, reproducción, selecciones y cálculos; crea Inicio y una etapa sin emisores con los predeterminados personalizados. Permite guardar/reabrir borradores sin imágenes; reproducir y exportar requieren una imagen coloreada.
- Advertencia compartida para Nuevo, Abrir y recargar el ejemplo. Cancelar conserva el trabajo; descargar mantiene abierto el diálogo para confirmar después. Se protegen pendientes colectivos y trazos incompletos. Archivos inválidos y fallos de preparación conservan el proyecto anterior.
- Preferencias locales de inicio, imágenes/base, propagación, puntos, enfoque/destacado, tiempos y fondo. Ejemplo por defecto, proyecto vacío opcional; guardar/cancelar, restauración de fábrica pendiente de confirmar e importación/exportación JSON. Los proyectos existentes, el ejemplo y la automatización conservan sus valores.
- Cuatro idiomas con 461 claves cada uno. Pruebas de preferencias, flujos de reemplazo y borradores; revisión sin conexión, almacenamiento bloqueado y 192 casos de diseño. Manual y referencias bilingües actualizados; tutorial explicativo conservado como idea futura.

## v0.13.1

- Revisión de diseño en español, inglés, francés y alemán: títulos, controles y diálogos adaptables, herramientas con texto en ventanas estrechas, lienzos de comparación alineados y valor completo debajo del selector cuando no cabe.
- Los paneles de escritorio se ajustan a la altura real de la cabecera; las ventanas pequeñas o bajas permiten desplazamiento. Los controles exportados admiten textos largos y desplazamiento sin cambiar el tamaño de la imagen.
- Eliminada la carga duplicada de scripts/catálogos y estilos de idioma. Pruebas de regresión para etiquetas, valores seleccionados, textos largos y tamaño estable del lienzo exportado.
- Revisión en Chrome sin conexión: 384 casos entre cuatro idiomas y doce tamaños de ventana, además de regresiones del editor, destacados, exportación y motor/automatización. Manual y registro de verificación actualizados en ambos idiomas.

## v0.13.0

- Francés y alemán en el editor y el HTML autónomo, con 429 mensajes completos por idioma: controles, ayudas, errores, accesibilidad, progreso y reproducción.
- Detección de variantes regionales como fr-CA y de-AT; selectores generados desde los cuatro catálogos locales. La documentación permanece en español e inglés.
- Pruebas de claves y variables para los cuatro idiomas; escenario completo de conservación de estado y HTML exportado ejecutado por idioma. La revisión completa de textos largos y tamaños de pantalla queda para la siguiente entrega.

## v0.12.0

- Editor español/inglés con catálogos locales, detección del navegador, preferencia recordada y cambio en vivo sin alterar proyecto, pendientes, cálculo de la base ni reproducción.
- Idioma de exportación independiente; el HTML autónomo incorpora controles y mensajes. Etiquetas de selección de archivo del editor traducidas.
- Fábrica de traducción compartida, alternativa española, comprobación de variables y pruebas reales en Chrome del editor y del HTML. Francés/alemán y revisión completa de textos largos quedan para entregas separadas.

## v0.11.0

- Varios rectángulos de destacado separado por etapa y en Inicio. Ctrl + arrastrar agrega; dibujo en área libre reemplaza; selección, movimiento, ocho asas y lista con eliminación. Borrar el último deshabilita el destacado.
- Exterior aplicado a la unión, sin acumular alfa en solapamientos. El enfoque y la lista separada se conservan al vincular/desvincular; transiciones y HTML autónomo admiten todos los rectángulos.
- Formato 10 con lectura de 1–9; alias highlightFrame antiguo conservado. Schema, API, CLI, MCP y plan.png actualizados.
- 106 pruebas sin DOM, 29 de automatización y pruebas de Canvas/editor/HTML exportado en Chrome. Se evita el salto de página al enfocar el lienzo.

## v0.10.0

- L como método recomendado (`protected`), conservando K y los métodos anteriores. Formato 9: formatos 1–8 mantienen su apariencia al abrirse.
- Oscurecer (M) y Multiplicar (N) en la preparación de la copia coloreada; copia literal anterior conservada para proyectos existentes. Mismos parámetros en API, CLI y MCP.
- Comparación sincronizada, miniatura con rectángulo arrastrable, zoom compartido y conservación del encuadre al regenerar.
- Worker local y bloques con margen que priorizan el área visible, soporte global de L y descarte de revisiones obsoletas. Luz apagada/amarilla/verde con texto, rojo para errores; Aplicar/Descargar sólo con el último resultado completo.
- 100 pruebas sin DOM y 26 de automatización; Worker/Canvas y diálogo real comprobados en Chrome, con igualdad exacta frente al cálculo completo.

## v0.9.1

- Igualación opcional tras K: recuperar color original en cada píxel no blanco de la base, copiar esos píxeles a la imagen coloreada de animación o no hacer nada (predeterminado).
- Corrección después del escalado, incluidos bordes suaves y papel cálido. Originales guardados intactos y cambio reversible; vista previa y exportación comparten las mismas imágenes preparadas.
- Opción inkMatch compartida por editor, API, CLI y MCP, sin alterar proyectos anteriores. 94 pruebas sin DOM y 26 de automatización.

## v0.9.0

- Tinta y líneas (K) como método recomendado para nuevas bases: fondo mediano, grises graduales, protección de trazos finos y recuperación direccional. JavaScript local sin dependencias.
- Mismo algoritmo en editor, API, CLI y MCP; métodos ink y grayscale conservados. Controles de pigmento a gris, sensibilidad, umbrales, suavizado opcional y papel.
- Formato editable 8: lectura de 1–7 sin cambiar el método anterior. Ejemplo de plan K, esquema y guías actualizados. Vista previa hasta 400%.
- 88 pruebas sin DOM y 24 de automatización. Comparación nativa con Calvin y samurái: diferencia máxima de un nivel de gris respecto al prototipo. Preparación real con Chrome: PNG idéntico entre API, CLI y MCP, y exportación HTML autónoma.

## v0.8.0

- Generación configurable de la imagen inicial: tinta sobre papel, tinta con grises suaves y desaturación anterior.
- Comparación explícita en Imágenes, ampliación al 100%/200%, vista previa antes de aplicar y descarga de la base PNG; cierre sin aplicar conserva el proyecto.
- Controles para destino del pigmento, sensibilidad, umbrales de grises y papel. Suavidad ampliada de 0 a 100%.
- Transformación compartida por editor y automatización; proyectos de formato 7 con lectura de formatos 1 a 6 sin cambiar la desaturación anterior.
- Operación API/CLI `prepare` y herramienta MCP `colorflow_prepare`, sin calcular propagación; base completa, referencia, comparación e informe. El renderizado incluye `base.png` sin cámara.
- Esquema, guías, plan de ejemplo y captura actualizados. 80 pruebas sin DOM, 88 en Chrome y 24 de automatización.

## v0.7.0

- API local y CLI para crear, inspeccionar, actualizar, validar y renderizar proyectos desde imágenes y planes JSON.
- Servidor MCP stdio con seis herramientas, recursos de esquema y guía, resultados estructurados y cancelación de renderizados.
- Contrato JSON Schema con validación estricta por campo; rutas limitadas a la raíz configurada y protección de destinos existentes.
- Preparación, cálculo y exportación compartidos con el editor, conservando el formato editable 6 y el HTML sin conexión.
- Renderizado en navegador local con perfil temporal; informe de duraciones, plan con geometría y fotogramas por etapa.
- Guías de integración, plan de ejemplo y configuración MCP de referencia.
- 21 pruebas nuevas de automatización; 71 pruebas del motor sin DOM y 79 en Chrome.

## v0.6.1

- Botón «↻ Reiniciar» al terminar la presentación, visible al pasar el mouse sobre la imagen y accesible con Tab y Enter.
- Fondo oscuro sólido, texto blanco y doble borde claro/oscuro para distinguirlo del dibujo; foco de teclado resaltado.
- Reinicio a Inicio sin reproducción automática; en pantallas sin hover permanece visible al terminar.
- Presentación de ejemplo, guía y captura actualizadas; 79 pruebas correctas en Chrome.

## v0.6.0

- Desfase inicial de pintura por etapa, de 0 a 60 segundos y predeterminado cero, disponible en General y selección múltiple.
- Primer punto activo y recorrido completo del pincel retrasados sin posponer cámara ni destacado; dependencias entre puntos conservadas.
- Duración y exportación ajustadas al desfase, sin añadir espera a etapas visuales o deshabilitadas.
- Clic del HTML exportado equivalente a flecha derecha: inicia o avanza, conserva las pausas manuales y no reinicia al terminar.
- Proyectos de formato 6 con lectura de formatos 1 a 5; ejemplo con enfoque de 0,8 s y desfase de 1,2 s en la primera etapa.
- 71 pruebas sin DOM y 79 pruebas en Chrome.

## v0.5.0

- Habilitación individual de etapas, conservando sus datos y omitiendo pintado, cámara y tiempos al deshabilitarlas.
- Selección múltiple con Ctrl + clic e inspector colectivo limitado al grupo, con revisión y confirmación.
- Borradores separados de General y de la selección; identidad del grupo conservada al reordenar y preparar imágenes.
- Presentación con barra inicialmente oculta, logo accesible y tecla H para alternarla sin cambiar el tamaño del lienzo.
- Vista Inicio conservada cuando no hay etapas habilitadas.
- Proyectos de formato 5 compatibles con la lectura de formatos 1 a 4.
- 61 pruebas sin DOM y 69 pruebas en Chrome; ejemplos y capturas actualizados.

## v0.4.0

- Panel General anterior a Inicio, con valores uniformes en negro y variados en morado, incluidos los radios efectivos de puntos.
- Cambios colectivos pendientes, revisión por parámetro y confirmación explícita antes de aplicar; restauración de herencia de radios.
- Etapas visuales sin emisores, con permanencia adicional y pausas manuales.
- Transiciones graduales del destacado, su rectángulo, tratamiento exterior y transparencia.
- Exportación con fondo achurado predeterminado, color liso o transparente, sin marco ni sombra del lienzo.
- Proyectos de formato 4 con lectura de formatos 1 a 3; ejemplos y capturas actualizados.
- 54 pruebas sin DOM y 62 pruebas en Chrome.

## v0.3.1

- Reorganización del código, estilos, ejemplos, pruebas y documentación en carpetas separadas.
- README breve con captura, inicio rápido y enlaces a las guías.
- Documentación de arquitectura, formato editable y procedencia de recursos.
- Generador del ejemplo incorporado y ejecutor de pruebas sin DOM para Node.js, ambos opcionales y sin dependencias.
- Rutas actualizadas manteniendo la apertura directa del editor y la presentación autónoma.
- Formato editable 3 conservado, sin cambios de comportamiento de la animación.

## v0.3.0

- Renombrado de etapas mediante doble clic, lápiz o inspector; Enter guarda y Escape cancela.
- Vista Inicio configurable, sin pintado, con espera manual y restauración al reiniciar.
- Acercamiento ajustable independientemente del rectángulo de enfoque.
- Destacado opcional, desactivado por defecto, con rectángulo vinculado o independiente.
- Exterior normal, desenfocado, negro, blanco, personalizado o transparente con alfa real.
- Radios con halos de contraste, colores diferenciados, selección y vista de todos los radios.
- Asas para arrastrar ambos radios con viento y valores propios por punto; herencia de la etapa por defecto.
- Proyectos de formato 3 compatibles con la lectura de formatos 1 y 2; exportación autónoma actualizada.
- 50 pruebas en Chrome, incluidas seis comprobaciones de píxeles para los modos de destacado.

## v0.2.0

- Eliminar un punto del lienzo con doble clic cuando está activa la herramienta Puntos.
- Lista de puntos con activación, orden mediante flechas, modo de inicio y demora.
- Dependencias respecto al anterior activo, con primer activo en 0 segundos e indicación de tiempos calculados.
- Etapas sin emisores activos omitidas automáticamente.
- Resistencia al cambio de tono entre vecinos, reducida para colores neutros.
- Radio máximo por emisor con desvanecimiento en el último 20%, deformación por viento y aplicación a todo el recorrido del pincel.
- Mezcla por máxima contribución llegada, conservando bordes tenues entre etapas.
- Encuadre por etapa, vista previa, transición suave durante el pintado y retorno a página completa.
- Presentación HTML autónoma actualizada y proyectos de formato 2 compatibles con la lectura del formato 1.
- Pruebas ampliadas para secuencias, radios, tono, cámara y exportación.

## v0.1.0

Primera versión funcional: preparación de imágenes, zonas, puntos simultáneos, recorrido de pincel, propagación por claridad y tinta, viento, pausas, guardado de proyectos y exportación HTML sin conexión.
