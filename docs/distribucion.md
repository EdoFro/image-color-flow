# Distribución: editor y paquete completo

[English](en/distribution.md) | **Español**

[Volver al proyecto](../README.es.md)

Se preparan dos ZIP por versión. Los archivos para descargar se adjuntan a una versión de [GitHub Releases](https://github.com/EdoFro/image-color-flow/releases); generar los ZIP localmente no publica una release ni los sube a GitHub.

## Editor portable

Archivo: `image-color-flow-editor-vX.Y.Z.zip`.

Descomprime el ZIP y abre `app/index.html` dentro de la carpeta extraída. Incluye scripts, estilos, cuatro idiomas, ejemplo introductorio incorporado, instrucciones en español e inglés, licencia y avisos sobre las imágenes del ejemplo. Basta conservar completa `app/` al trasladarla; funciona sin instalación, servidor ni conexión.

Las preferencias se guardan en el navegador. Puedes exportarlas/importarlas desde Preferencias para trasladarlas al cambiar de navegador o ubicación. Los proyectos editables y las presentaciones se descargan por separado.

## Paquete completo

Archivo: `image-color-flow-complete-vX.Y.Z.zip`.

Incluye exactamente la misma carpeta `app/` del paquete editor y añade:

- `automation/`: API local, CLI, MCP y renderizador.
- `schemas/animation.schema.json`: contrato de planes.
- `docs/para-ia.md` y `docs/en/for-ai.md`: guías que utiliza MCP.
- `package.json` de ejecución, licencia e instrucciones bilingües `README` y `AUTOMATION`.

Para el editor, abre `app/index.html`. Para automatizar, utiliza Node.js 22 o posterior; preparar/renderizar requiere Chrome, Edge o Chromium local. No hay paquetes npm externos que instalar. Conserva juntas las carpetas del paquete completo y ejecuta los comandos desde su raíz. Las guías incluidas usan tus propias imágenes en una carpeta de trabajo.

Los dos paquetes contienen archivos de ejecución e instrucciones. Vídeos, pruebas, fuentes adicionales de ejemplos, capturas de desarrollo y herramientas de empaquetado permanecen en el repositorio.

## Generar los dos ZIP

Desde la raíz del repositorio, con Node.js:

```sh
npm run package
```

También puedes ejecutar `node scripts/empaquetar.mjs`. Ambos generan en `dist/`:

```text
image-color-flow-editor-vX.Y.Z.zip
image-color-flow-complete-vX.Y.Z.zip
SHA256SUMS.txt
```

La versión procede de `package.json`. Cada ZIP contiene una única carpeta con su nombre y versión. Se usan rutas permitidas, compresión y fechas fijas; los mismos archivos y versión de Node.js producen los mismos ZIP. Los enlaces simbólicos se rechazan y la licencia de `app/` debe coincidir con la principal. La carpeta `dist/` está excluida de Git.

`node tests/distribution.test.mjs` comprueba ambos ZIP, recursos del editor, igualdad de `app/`, documentación incluida, reproducción exacta de los archivos, API/CLI y guía MCP después de extraerlos. Las pruebas de navegador del editor se ejecutan con los comandos de [arquitectura](arquitectura.md).

## Publicar una versión

1. Comprueba la versión y ejecuta las pruebas.
2. Genera los dos ZIP.
3. Crea la release de GitHub correspondiente y adjunta ambos ZIP y `SHA256SUMS.txt` desde `dist/`.

Las descargas se ofrecen desde Releases. El repositorio conserva el código y los archivos de desarrollo; `index.html` en su raíz redirige a `app/index.html` para mantener el acceso anterior.
