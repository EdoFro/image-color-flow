# Tinta y color

[English](README.md) | **Español**

Editor local para animar la aparición del color en dibujos con tinta, acuarela y otras técnicas. Parte de una imagen inicial y otra coloreada; permite dirigir la propagación y exportar una presentación web que funciona sin conexión.

## Ver una animación

https://github.com/user-attachments/assets/471e49d0-e96d-4b8b-8240-7e7ae76120ce

[Ver más ejemplos de animaciones](exampleVideos/README.es.md)

Los vídeos se grabaron en ventanas pequeñas para reducir su peso; su resolución y detalle no muestran toda la calidad de las presentaciones generadas.

![Editor con puntos de inicio y radios de propagación](docs/images/vista-editor.png)

## Elegir paquete

- **[Editor portable](docs/distribucion.md#editor-portable):** sólo `app/`, con ejemplo e instrucciones; abre `app/index.html`.
- **[Editor + API, CLI y MCP](docs/distribucion.md#paquete-completo):** añade automatización local, esquemas y guías bilingües.

Los ZIP de cada versión se publican en [GitHub Releases](https://github.com/EdoFro/image-color-flow/releases). También puedes [generar ambos localmente](docs/distribucion.md#generar-los-dos-zip). Crear los paquetes no los publica automáticamente.

## Empezar

También puedes comenzar desde una **hoja vacía**, blanca o con el tono del papel: elige **Imágenes → Imagen inicial utilizada → Hoja en blanco, sin dibujo**. Consulta [esta opción](docs/guia-de-uso.md#comenzar-con-una-hoja-vacía).

El lienzo admite zoom con la rueda, ajustes al ancho/alto y desplazamiento con Mano o botón central. Cada tarjeta de etapa permite duplicar y eliminar, con confirmación de dos clics y recuperación mediante Deshacer. Consulta [zoom y acciones por etapa](docs/guia-de-uso.md#zoom-y-desplazamiento-del-lienzo).

La interfaz está disponible en **español, inglés, francés y alemán**. Elige el idioma en la cabecera o en Imágenes; se recuerda localmente. La primera vez se utiliza un idioma compatible del navegador, con español como alternativa. Cambiarlo conserva el proyecto y la reproducción. Consulta los [idiomas de la aplicación](docs/idiomas.md).

1. Descarga el ZIP del editor o copia completa la carpeta `app/`.
2. Abre [app/index.html](app/index.html) en Chrome o Edge. No requiere instalación, servidor ni conexión.
3. Prueba el ejemplo incluido o pulsa **Nuevo proyecto** y **Cargar imágenes** para empezar desde cero.
4. Define etapas, zonas, puntos y recorridos; ajusta la propagación y reproduce.
5. Usa **Guardar proyecto** para seguir editando y **Exportar HTML** para presentar.

Puedes dar nombre al proyecto, usar **Guardar como…** y deshacer/rehacer con **Ctrl+Z / Ctrl+Y**. En navegadores compatibles se elige un archivo local y Guardar lo actualiza durante la sesión; en los demás se descarga el JSON. Los borradores de agentes pueden incluir un nombre y una ubicación recomendada. Consulta [guardado e historial](docs/guia-de-uso.md#nombre-destino-y-guardado).

El editor prepara y alinea las imágenes. También puede generar una base desde la versión coloreada con **Tinta y líneas (L)**, que combina fondo robusto, protección de trazos finos y recuperación de líneas, con controles para retirar pigmentos, ajustar grises y comparar el resultado antes de aplicarlo. Los puntos admiten orden, activación, demoras y radios propios. Las etapas pueden pintar o cambiar únicamente el enfoque y el destacado, con transiciones graduales, desfase inicial de pintura y permanencia. **General** permite revisar y unificar parámetros de toda la presentación antes de aplicarlos. Puedes deshabilitar etapas y usar Ctrl + clic para editar un grupo de ellas. La exportación ofrece fondo achurado, liso o transparente, sin marco ni sombra alrededor del dibujo. Sus controles comienzan ocultos y se muestran con el logo o la tecla H. Un clic en el dibujo inicia o avanza la presentación; Espacio permite pausar y continuar. Al terminar, un botón de reinicio con alto contraste permite regresar a Inicio.

El editor abre el ejemplo por defecto. **Preferencias** permite elegir el inicio, personalizar los parámetros de proyectos/etapas nuevos y exportar/importar esos valores. **Nuevo proyecto** protege los cambios sin guardar y permite guardar borradores todavía sin imágenes. Consulta [nuevo proyecto y preferencias](docs/guia-de-uso.md#nuevo-proyecto-y-preferencias).

## Uso desde una IA

La automatización opcional ofrece una API local, comandos y un servidor MCP con ocho herramientas. Un asistente con visión puede crear proyectos desde imágenes y planes JSON, preparar y revisar la base sin calcular la animación, y exportar el HTML. Requiere Node.js 22 o posterior y Chrome/Edge/Chromium para preparar o renderizar; no usa paquetes externos. El editor conserva su apertura directa sin instalación.

Consulta la [guía de automatización y conexión MCP](docs/automatizacion.md), el [contrato del plan](schemas/animation.schema.json) y la [guía para asistentes](docs/para-ia.md).

## Documentación y ejemplos

- [Guía de uso](docs/guia-de-uso.md): herramientas, tiempos, radios, cámara, destacado y presentación.
- [Distribución y los dos ZIP](docs/distribucion.md).
- [Arquitectura y desarrollo](docs/arquitectura.md): responsabilidades, algoritmo y comandos opcionales.
- [Formato del proyecto](docs/formato-del-proyecto.md): datos guardados y compatibilidad.
- [Verificación](docs/verificacion.md): comprobaciones realizadas y límites.
- [Cómo mantener la documentación bilingüe](docs/documentacion.md).
- [Cambios por versión](CHANGELOG.es.md).
- [Ideas y tareas pendientes](docs/pendientes.md).
- [Proyecto editable de ejemplo](examples/ejemplo.colorflow.json): ábrelo desde **Abrir proyecto**.
- [Presentación de ejemplo](examples/presentacion-ejemplo.html): un único HTML con las imágenes y el reproductor incorporados.

## Estructura

```text
app/             Editor portable completo: index.html, src/, assets/ y demo/
automation/      API local, CLI, MCP y renderizador; reutilizan app/src/
schemas/         Contrato de planes para automatización
packaging/       Instrucciones incluidas en el paquete completo
docs/            Guías españolas, referencias y capturas
docs/en/         Guías y referencias inglesas
examples/        Imágenes fuente, proyectos y presentaciones adicionales
exampleVideos/   Grabaciones y galería bilingüe
tests/           Pruebas del navegador y de automatización
scripts/         Pruebas, generación de ejemplo y empaquetado de desarrollo
dist/            ZIP generados y SHA256SUMS.txt; no se versionan
index.html       Acceso de compatibilidad que redirige a app/index.html
```

No se usan bibliotecas externas ni pasos de compilación. Abre [tests/index.html](tests/index.html) para ejecutar las pruebas del navegador. Con Node.js 22 o posterior también puedes ejecutar los casos sin DOM:

```sh
node scripts/ejecutar-pruebas.mjs
```

## Licencia y recursos

El código y la documentación se distribuyen bajo la [licencia MIT](LICENSE). Las imágenes de ejemplo y las que aparecen en las grabaciones no están cubiertas por esta licencia. El titular del proyecto no posee sus derechos; incluirlas como ejemplos no concede permiso para reutilizarlas. Su procedencia y alcance se documentan por separado en [licencia y recursos](docs/licencia-y-recursos.md).

La preparación de imágenes ofrece Oscurecer (M) y Multiplicar (N), comparación con zoom/posición compartidos, miniatura navegable y recálculo por bloques que prioriza el detalle visible. Una luz con texto indica cuándo el detalle o toda la imagen están actualizados. Los proyectos anteriores conservan su método.

El destacado separado permite varios rectángulos por etapa o en Inicio: Ctrl + arrastrar agrega otro; la lista y las asas permiten editarlo. El exterior de su unión recibe el tratamiento elegido. El enfoque permanece independiente y el HTML autónomo conserva todos los rectángulos.

## Borrador editable e integración

El asistente puede generar y abrir un borrador en el editor mediante `colorflow_review`. Después puedes corregirlo por tu cuenta. Para una presentación web, elige **Exportar HTML → Integrar en otra presentación**: el ZIP incluye animación, controlador y ejemplo con varias imágenes y láminas. Permite avanzar, saltar, retroceder, reiniciar y mostrar el final. Consulta [borradores e integración](docs/integracion.md).

Desde **0.18.0**, la presentación administra toda la entrada con una sola llamada a `TintaColorHost.bindInput`. Las animaciones conectadas dejan pasar los clics al contenedor, no capturan foco y ocultan todos sus controles internos. Abiertas por separado conservan su interacción. Consulta la [integración reutilizable](docs/integracion.md).
