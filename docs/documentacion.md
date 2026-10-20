# Documentación bilingüe

[English](en/documentation.md) | **Español**

[Volver al proyecto](../README.es.md)

La documentación se mantiene en español e inglés. La interfaz todavía está en español; el sistema de idiomas se incorporará en entregas posteriores. Las capturas y los ejemplos existentes pueden mostrar textos españoles.

## Correspondencias

| Español | English |
| --- | --- |
| [README.es.md](../README.es.md) | [README.md](../README.md) |
| [Guía de uso](guia-de-uso.md) | [User guide](en/user-guide.md) |
| [Automatización](automatizacion.md) | [Automation](en/automation.md) |
| [Guía para IA](para-ia.md) | [Assistant guide](en/for-ai.md) |
| [Arquitectura](arquitectura.md) | [Architecture](en/architecture.md) |
| [Formato del proyecto](formato-del-proyecto.md) | [Project format](en/project-format.md) |
| [Verificación](verificacion.md) | [Verification](en/verification.md) |
| [Licencia y recursos](licencia-y-recursos.md) | [License and resources](en/license-and-resources.md) |
| [Cambios](../CHANGELOG.es.md) | [Changelog](../CHANGELOG.md) |
| [Galería](../exampleVideos/README.es.md) | [Gallery](../exampleVideos/README.md) |
| Esta guía | [Documentation guide](en/documentation.md) |

## Al modificar una función

1. Actualiza las dos versiones de las guías afectadas y sus entradas de cambios en el mismo commit.
2. Mantén los enlaces de idioma y las referencias internas dentro del idioma correspondiente. Las rutas españolas existentes se conservan.
3. Conserva identificadores de API, nombres de campos JSON, comandos, rutas y códigos de error. Traduce las explicaciones y los valores de texto de ejemplo sólo cuando no cambien su significado.
4. Mientras la interfaz siga en español, indica sus etiquetas españolas junto a la explicación inglesa. No documentes como disponible una función de idioma que aún no está implementada.
5. Reutiliza capturas y direcciones de vídeo; no dupliques archivos grandes. Aclara el idioma de las capturas y las limitaciones de las grabaciones. Verifica ambas vistas previas de Markdown en GitHub.

La verificación registra pruebas históricas y sus limitaciones; traducirla no significa que se hayan vuelto a ejecutar esas pruebas. El texto legal de MIT se mantiene en el único archivo `LICENSE`.
