# Arquitectura

[Volver al proyecto](../README.md)

## Organización

La aplicación usa HTML, CSS y JavaScript clásico, sin dependencias externas ni compilación. Los scripts se cargan en orden desde el HTML. No se usan módulos del navegador ni peticiones para cargar las imágenes de ejemplo, para mantener la apertura directa desde archivos locales.

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura del editor, inspector y diálogo de imágenes. |
| `assets/styles.css` | Presentación del editor y adaptación al tamaño de pantalla. |
| `src/app.js` | Estado del proyecto, eventos del editor, herramientas del lienzo, archivos y coordinación con las APIs compartidas de cálculo y exportación. |
| `src/project.js` | Normalización compartida del formato editable y opciones de presentación. |
| `src/presentation.js` | Constructor único del HTML autónomo, incluido el reinicio final. |
| `src/automation.js` | Preparación completa, cálculo en Web Worker, informe, fotogramas y hoja de secuencia sin montar el editor. |
| `automation/` | API de Node.js, CLI, servidor MCP stdio y renderizador mediante navegador local. |
| `schemas/animation.schema.json` | Contrato estricto de planes sin imágenes para agentes y clientes. |
| `src/preparation.js` | Decodificación de imágenes, preparación del papel, base desaturada y alineación. |
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

El orden de carga del editor es motor, formato de proyecto, preparación, vista, reproductor, códec, parámetros generales, imágenes de ejemplo, exportación, automatización y aplicación. Las fábricas del motor, reproductor, vista y códec deben seguir siendo autocontenidas: sus funciones se incorporan al trabajador o al HTML exportado mediante `toString()`.

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

No hace falta instalar paquetes. Abre [las pruebas](../tests/index.html) en Chrome o Edge para ejecutar 79 casos, incluidos ocho que necesitan el lienzo real del navegador.

Opcionalmente, con Node.js 22 o posterior, desde la raíz:

```sh
node scripts/ejecutar-pruebas.mjs
node scripts/generar-demo.mjs
```

El primer comando ejecuta los 71 casos sin DOM y termina con error si alguno falla. El segundo regenera exclusivamente `examples/demo-data.js` desde las dos imágenes de `examples/images/`; no reexporta el proyecto ni la presentación. Ambos scripts resuelven rutas respecto a su propio archivo.

Si se cambian las imágenes o la configuración del ejemplo, guarda un nuevo proyecto y exporta de nuevo la presentación desde el editor. Conserva los resultados en `examples/ejemplo.colorflow.json` y `examples/presentacion-ejemplo.html`.

También se puede usar cualquier servidor estático local para desarrollo. El servidor no es necesario para el uso normal. Las comprobaciones realizadas y sus límites están en [verificación](verificacion.md).

## Automatización opcional

La API de Node.js usa el mismo normalizador que el editor, junto con un contrato estricto de planes que rechaza errores antes de aplicar valores predeterminados. Conserva el formato editable 6. Los comandos y MCP son adaptadores de esta API; no duplican la propagación ni el constructor HTML.

Canvas, decodificación, alineación, Web Worker y fotogramas se ejecutan en Chrome/Edge/Chromium sin ventana con un perfil temporal aislado. El proceso de Node sirve exclusivamente recursos enumerados y el trabajo actual en loopback, mediante una ruta aleatoria. El resultado regresa por HTTP local; el servidor, navegador y perfil se cierran al finalizar, cancelar o fallar. El renderizador admite una sesión de navegador externa para las pruebas visuales del mismo trabajo.

MCP utiliza JSON-RPC por stdio, sin dependencias, con descubrimiento de seis herramientas, esquema y guía como recursos, resultados estructurados y cancelación. La raíz de archivos se limita tanto léxicamente como al resolver enlaces. La validación de estructura no pretende garantizar la interpretación visual del pedido. La IA debe revisar plan y fotogramas; consulta la [guía de integración](automatizacion.md).
