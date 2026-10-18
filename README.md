# Tinta y color

Editor local para animar la aparición del color en dibujos con tinta, acuarela y otras técnicas. Parte de una imagen inicial y otra coloreada; permite dirigir la propagación y exportar una presentación web que funciona sin conexión.

![Editor con puntos de inicio y radios de propagación](docs/images/vista-editor.png)

## Empezar

1. Descarga o copia el proyecto completo, conservando sus carpetas.
2. Abre [index.html](index.html) en Chrome o Edge. No requiere instalación, servidor ni conexión.
3. Prueba el ejemplo incluido o carga tus imágenes desde **Imágenes**.
4. Define etapas, zonas, puntos y recorridos; ajusta la propagación y reproduce.
5. Usa **Guardar proyecto** para seguir editando y **Exportar HTML** para presentar.

El editor prepara y alinea las imágenes. También puede obtener una base desaturada desde la versión coloreada. Los puntos admiten orden, activación, demoras y radios propios. Las etapas pueden pintar o cambiar únicamente el enfoque y el destacado, con transiciones graduales y permanencia. **General** permite revisar y unificar parámetros de toda la presentación antes de aplicarlos. Puedes deshabilitar etapas y usar Ctrl + clic para editar un grupo de ellas. La exportación ofrece fondo achurado, liso o transparente, sin marco ni sombra alrededor del dibujo. Sus controles comienzan ocultos y se muestran con el logo o la tecla H.

## Documentación y ejemplos

- [Guía de uso](docs/guia-de-uso.md): herramientas, tiempos, radios, cámara, destacado y presentación.
- [Arquitectura y desarrollo](docs/arquitectura.md): responsabilidades, algoritmo y comandos opcionales.
- [Formato del proyecto](docs/formato-del-proyecto.md): datos guardados y compatibilidad.
- [Verificación](docs/verificacion.md): comprobaciones realizadas y límites.
- [Cambios por versión](CHANGELOG.md).
- [Proyecto editable de ejemplo](examples/ejemplo.colorflow.json): ábrelo desde **Abrir proyecto**.
- [Presentación de ejemplo](examples/presentacion-ejemplo.html): un único HTML con las imágenes y el reproductor incorporados.

## Estructura

```text
index.html       Entrada del editor
src/             Código JavaScript
assets/          Estilos del editor
examples/        Imágenes, datos incorporados, proyecto y presentación
tests/           Pruebas que se abren en el navegador
docs/            Guías, referencias, capturas y prompt de coloreado
scripts/         Utilidades opcionales para desarrollo
```

No se usan bibliotecas externas ni pasos de compilación. Abre [tests/index.html](tests/index.html) para ejecutar las pruebas del navegador. Con Node.js 18 o posterior también puedes ejecutar los casos sin DOM:

```sh
node scripts/ejecutar-pruebas.mjs
```

## Licencia y recursos

La licencia del código está pendiente de elección. Las imágenes de ejemplo tienen su procedencia documentada por separado en [licencia y recursos](docs/licencia-y-recursos.md).
