# Arquitectura

[English](en/architecture.md) | **Español**

[Volver al proyecto](../README.es.md)

## Organización

La aplicación usa HTML, CSS y JavaScript clásico, sin dependencias externas ni compilación. Los scripts se cargan en orden desde el HTML. No se usan módulos del navegador ni peticiones para cargar las imágenes de ejemplo, para mantener la apertura directa desde archivos locales.

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura del editor, inspector y diálogo de imágenes. |
| `assets/styles.css` | Presentación del editor y adaptación al tamaño de pantalla. |
| `src/app.js` | Estado del proyecto, eventos del editor, herramientas del lienzo, archivos y coordinación con las APIs compartidas de cálculo y exportación. |
| `src/project.js` | Normalización compartida del formato editable y opciones de presentación. |
| `src/ink-lines.js` | Extracción K/L sin DOM: mediana local, recuperación gradual, protección fina y líneas coherentes en ocho direcciones. |
| `src/base-generation.js` | Transformación pura de píxeles, presets y normalización de la generación de base, sin DOM. |
| `src/presentation.js` | Constructor único del HTML autónomo, incluido el reinicio final. |
| `src/automation.js` | Preparación completa, cálculo en Web Worker, informe, fotogramas y hoja de secuencia sin montar el editor. |
| `automation/` | API de Node.js, CLI, servidor MCP stdio y renderizador mediante navegador local. |
| `schemas/animation.schema.json` | Contrato estricto de planes sin imágenes para agentes y clientes. |
| `src/preparation.js` | Decodificación de imágenes, preparación del papel, generación de base configurable y alineación. |
| `src/engine.js` | Normalización de parámetros y propagación, independiente del DOM. |
| `src/player.js` | Tiempo, pausas, navegación y mezcla de las etapas. |
| `src/view.js` | Cámara, destacado y tratamiento del exterior. |
| `src/general.js` | Catálogo, resumen, validación y aplicación de parámetros colectivos a toda la presentación o a un grupo de etapas, sin dependencia del DOM. |
| `src/codec.js` | Empaquetado y lectura de los mapas temporales y contribuciones tenues. |
| `examples/demo-data.js` | Imágenes del ejemplo incorporadas como datos locales; archivo generado. |
| `tests/` | Casos sintéticos compartidos y comprobaciones de píxeles en navegador. |
| `scripts/` | Herramientas opcionales de desarrollo para Node.js. |

## Flujo de datos

1. El editor carga el ejemplo incorporado o imágenes elegidas por el usuario.
2. La preparación genera una base y una referencia final del mismo tamaño. Los originales se conservan en el proyecto.
3. El editor mantiene las etapas y la vista Inicio con coordenadas normalizadas. La selección múltiple guarda referencias a objetos de etapa para conservar su identidad al reordenar; General y la selección tienen borradores independientes. Una modificación confirmada invalida los mapas calculados.
4. Las etapas deshabilitadas devuelven campos vacíos de duración cero y se excluyen del reproductor y la exportación. Al reproducir o exportar, se calculan las etapas en un Web Worker creado desde un Blob. Su código incorpora la fábrica del motor; no depende de una ruta de archivo del trabajador.
5. El reproductor mezcla la base con la imagen final y acumula el color revelado. La vista aplica el destacado y la cámara. Durante una transición interpola el rectángulo y combina los estilos en alfa premultiplicada, conservando la transparencia.
6. El guardado de proyecto conserva datos editables; la exportación incorpora imágenes preparadas, mapas y funciones necesarias en un único HTML.

El orden de carga del editor comienza con i18n y sus catálogos, seguidos por motor, generación de base, formato de proyecto, preparación, vista, reproductor, códec, parámetros generales, imágenes de ejemplo, exportación, automatización y aplicación. Las fábricas del motor, reproductor, vista y códec deben seguir siendo autocontenidas: sus funciones se incorporan al trabajador o al HTML exportado mediante `toString()`.

## Cómo se propaga el color

Se calculan mapas de llegada independientes mediante caminos de coste mínimo sobre ocho vecinos (Dijkstra). Cada píxel tiene resistencia según la luminosidad de la **imagen final**; la tinta y los cambios de tono añaden demora. Los tiempos se calculan en un Web Worker. La reproducción mezcla la base con la imagen final según esos tiempos y conserva las contribuciones tenues del borde.

- **Velocidad base** y **velocidad del pincel**: fracciones del ancho de la imagen por segundo. La resolución no multiplica el tiempo de animación, aunque el muestreo y el grosor de las líneas pueden cambiar ligeramente el resultado.
- **Impulso en colores claros**: velocidad multiplicada por `1 + claridad × luminosidad / 255`.
- **Demora de tinta**: resistencia multiplicada por `1 + demora` en píxeles bajo el umbral de negro.
- **Resistencia al cambio de tono**: demora las transiciones entre tonos de píxeles vecinos. Usa distancia circular de tono para que dos rojos a ambos lados de 0°/360° sigan siendo parecidos. Disminuye su influencia cerca de tonos neutros y negros; no es una barrera infranqueable.
- **Radio para atravesar tinta**: fracción del ancho; dentro se permite atravesar negro con demora. Fuera, la tinta bloquea el avance. No detiene el color en zonas claras.
- **Radio máximo**: límite obligatorio alrededor de cada emisor. Hasta el 80% puede aparecer color completo; del 80% al 100% pierde intensidad suavemente; fuera no pinta. No reduce la velocidad y el color depositado no desaparece.
- **Viento**: la velocidad y ambos radios se multiplican por `exp(fuerza × cos(ángulo respecto al viento))`. Con fuerza cero conservan su comportamiento radial. 0° apunta a la derecha; 90°, hacia abajo.
- **Varios emisores**: cada uno respeta sus propios radios, inicio y barreras; un punto futuro no habilita el paso a uno anterior. Se conserva la contribución más intensa que haya llegado, sin sumar ni oscurecer los solapamientos.
- **Pincel**: cada posición muestreada del trazo emite al pasar el pincel y tiene su propio radio máximo. La huella final forma una franja alrededor de todo el recorrido, deformada por el viento; el radio no se mide desde el comienzo del trazo.
- **Zonas**: siempre son límites obligatorios. No se cruza diagonalmente por una esquina cerrada.
- **Desfase inicial de pintura**: desplaza los tiempos absolutos del primer punto activo y de todas las muestras del pincel, sin alterar sus velocidades, huellas ni duraciones propias. Los siguientes puntos conservan sus relaciones con el anterior activo. La cámara y el destacado mantienen su inicio en 0 s.
- **Duración**: el final más tardío entre todos los emisores y la transición de cámara. A ese máximo se añade la permanencia de la etapa. La duración total suma todas las etapas y excluye pausas que esperan interacción. Las etapas visuales usan transición más permanencia y conservan los mapas de color vacíos.
- **Solapamiento**: el color ya revelado por una etapa anterior se conserva, incluida su intensidad parcial en los bordes.

Los tiempos exportados se cuantizan a 16 bits por etapa; su precisión es la duración de la etapa dividida por 65 534. Las contribuciones tenues se guardan con intensidad de 8 bits. La vista previa y la exportación usan el mismo reproductor.

## Desarrollo y comprobaciones

No hace falta instalar paquetes. Abre [las pruebas](../tests/index.html) en Chrome o Edge para ejecutar los casos compartidos y las comprobaciones que necesitan el lienzo real del navegador.

Opcionalmente, con Node.js 22 o posterior, desde la raíz:

```sh
node scripts/ejecutar-pruebas.mjs
node scripts/generar-demo.mjs
```

El primer comando ejecuta los casos sin DOM y termina con error si alguno falla. El segundo regenera exclusivamente `examples/demo-data.js` desde las dos imágenes de `examples/images/`; no reexporta el proyecto ni la presentación. Ambos scripts resuelven rutas respecto a su propio archivo. Las pruebas de automatización se ejecutan con `node tests/automation.test.mjs`.

Si se cambian las imágenes o la configuración del ejemplo, guarda un nuevo proyecto y exporta de nuevo la presentación desde el editor. Conserva los resultados en `examples/ejemplo.colorflow.json` y `examples/presentacion-ejemplo.html`.

También se puede usar cualquier servidor estático local para desarrollo. El servidor no es necesario para el uso normal. Las comprobaciones realizadas y sus límites están en [verificación](verificacion.md).

## Automatización opcional

La API de Node.js usa el mismo normalizador que el editor, junto con un contrato estricto de planes que rechaza errores antes de aplicar valores predeterminados. Utiliza el formato editable 10. Lee formatos 1 a 9: los formatos 1 a 6 conservan su desaturación anterior, el formato 7 conserva su filtro de tinta y parámetros, y el formato 8 conserva K. Los campos explícitos de los formatos anteriores se mantienen. Los comandos y MCP son adaptadores de esta API; no duplican la propagación ni el constructor HTML.

Canvas, decodificación, alineación, Web Worker y fotogramas se ejecutan en Chrome/Edge/Chromium sin ventana con un perfil temporal aislado. El proceso de Node sirve exclusivamente recursos enumerados y el trabajo actual en loopback, mediante una ruta aleatoria. El resultado regresa por HTTP local; el servidor, navegador y perfil se cierran al finalizar, cancelar o fallar. El renderizador admite una sesión de navegador externa para las pruebas visuales del mismo trabajo.

MCP utiliza JSON-RPC por stdio, sin dependencias, con descubrimiento de siete herramientas, esquema y guía como recursos, resultados estructurados y cancelación. `prepare` ejecuta decodificación y preparación sin instanciar el trabajador de propagación. Produce la base completa y una comparación; `render` añade cálculo y presentación. La raíz de archivos se limita tanto léxicamente como al resolver enlaces. La validación de estructura no pretende garantizar la interpretación visual del pedido. La IA debe revisar base, plan y fotogramas; consulta la [guía de integración](automatizacion.md).

`src/base-preview.js` construye un Worker Blob con las fábricas del motor, sin importaciones externas. Mantiene soporte global de L, revisiones y cola de bloques de 192 px; espera confirmación entre bloques para atender cancelaciones/encuadres. `PaintBase.region` conserva 12 px de margen; el Worker agrega margen de remuestreo y conserva la geometría completa al reducir con OffscreenCanvas. `src/image-comparison.js` gestiona un único encuadre para ambas vistas y la miniatura. El formato 9 añade L/M/N; los estados parciales nunca se exportan ni se guardan.

`highlightFrames` es la lista canónica del formato 10; `highlightFrame` es el alias del primero. `src/highlight-editor.js` contiene selección y transformaciones sin DOM. `PaintView.highlights` resuelve la geometría activa; el renderizador usa una ruta de recorte común para la unión, conservando el dibujo anterior para un único rectángulo. Las transiciones interpolan listas de igual longitud o funden máscaras de cantidades distintas. El codec incluye la lista completa en cada campo exportado.

## Idiomas de la documentación

El README inglés es la portada del repositorio; `README.es.md` es su equivalente español. Las guías españolas conservan sus rutas, con versiones inglesas en `docs/en/`. Los archivos de documentación no intervienen en el cálculo de la animación. Consulta el [mantenimiento de documentación](documentacion.md) para las actualizaciones por pares y la navegación de idioma.

## Idiomas de la interfaz

`src/i18n.js` expone una fábrica autocontenida y la instancia `PaintI18n`; los catálogos `src/locales/es.js` y `en.js` se cargan antes del editor mediante scripts clásicos. Los textos estáticos usan atributos `data-i18n`; los dinámicos usan claves y variables. La traducción de metadatos y errores ocurre en la interfaz: el motor, los campos JSON y los nombres del usuario conservan su significado. No se emplean observadores que traduzcan texto arbitrario del lienzo.

El cambio de idioma refresca controles conservando los borradores inválidos y la selección; no llama a invalidate ni reinicia el reproductor o el Worker. La preferencia es local al navegador, fuera del proyecto. Exportar incorpora únicamente las claves necesarias y la fábrica de traducción en el HTML. La automatización sin idioma explícito conserva el español. Consulta [idiomas](idiomas.md).
