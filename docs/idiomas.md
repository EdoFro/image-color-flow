# Idiomas de la aplicación

[English](en/languages.md) | **Español**

[Volver al proyecto](../README.es.md)

## Elegir un idioma

El editor ofrece **Español** e **English** en la cabecera y en el diálogo Imágenes. Primero se usa una preferencia guardada; si no existe, se busca un idioma compatible entre los del navegador, incluidas variantes como `en-GB`. Si no hay coincidencia se usa español. La elección se recuerda en `localStorage` cuando el navegador lo permite; bloquear ese almacenamiento no impide usar el editor ni cambiar de idioma durante la sesión.

Cambiar de idioma conserva el proyecto, los nombres de etapas y archivos, la selección, los cambios pendientes, el encuadre de comparación y la reproducción. No modifica parámetros ni invalida el cálculo. Los nombres del ejemplo incluido también son contenido del proyecto y permanecen en español.

En Exportar HTML puedes elegir el idioma de la presentación sin cambiar el del editor. Cada apertura de ese diálogo propone el idioma actual del editor. El idioma de salida queda incorporado en el HTML autónomo; no se añade al formato del proyecto. Las exportaciones antiguas no se traducen retroactivamente. La automatización continúa exportando español por defecto.

Los cuadros de archivo y otros mensajes nativos del sistema dependen del navegador y del sistema operativo. Las etiquetas de selección de imagen dentro del editor sí se traducen.

## Catálogos y nuevos idiomas

`src/i18n.js` proporciona `PaintI18n`. Los catálogos son scripts locales independientes en `src/locales/`; no se descargan servicios de traducción ni archivos JSON mediante peticiones. Esto conserva la apertura directa y el funcionamiento sin conexión.

Para añadir un idioma:

1. Copia un catálogo, conserva sus claves y variables entre llaves, traduce los valores y cambia el código de `PaintI18n.register`. `_language_name` contiene el nombre nativo del idioma.
2. Carga el catálogo antes de `src/app.js` en `index.html` y antes del constructor de presentación en `automation/runner.html`.
3. Añade ese recurso a la lista permitida de `automation/browser.mjs` y a los archivos copiados por `scripts/ejecutar-pruebas-vista.mjs`. El servidor sigue exponiendo sólo archivos enumerados.
4. Amplía las comprobaciones de catálogos, detección y navegador. Los selectores se construyen a partir de los catálogos registrados, por lo que no necesitan nuevas opciones escritas a mano.
5. Revisa etiquetas, ayudas, accesibilidad, cuadros de diálogo y HTML exportado. Las traducciones que falten utilizan español; eso permite abrir la aplicación, pero no sustituye completar el catálogo.

Los textos estáticos se marcan con `data-i18n` y los atributos accesibles con `data-i18n-aria-label` o `data-i18n-title`. Los mensajes dinámicos usan `PaintI18n.t(clave, variables)`. Se asignan como texto; los nombres del usuario no se traducen ni se interpretan como HTML. Los códigos, claves JSON y campos de API conservan su contrato.

## Verificación

Con Node.js y Chrome/Edge locales:

```sh
node tests/i18n.test.mjs
node scripts/ejecutar-pruebas-vista.mjs --i18n
```

No se necesitan paquetes externos. Los resultados y los límites de la revisión están en [verificación](verificacion.md).
