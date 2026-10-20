# Bilingual documentation

**English** | [Español](../documentacion.md)

[Back to the project](../../README.md)

Documentation is maintained in English and Spanish. The interface is still in Spanish; interface language support will follow in later deliveries. Existing screenshots and examples may contain Spanish text.

## Document pairs

| English | Español |
| --- | --- |
| [README.md](../../README.md) | [README.es.md](../../README.es.md) |
| [User guide](user-guide.md) | [Guía de uso](../guia-de-uso.md) |
| [Automation](automation.md) | [Automatización](../automatizacion.md) |
| [Assistant guide](for-ai.md) | [Guía para IA](../para-ia.md) |
| [Architecture](architecture.md) | [Arquitectura](../arquitectura.md) |
| [Project format](project-format.md) | [Formato del proyecto](../formato-del-proyecto.md) |
| [Verification](verification.md) | [Verificación](../verificacion.md) |
| [License and resources](license-and-resources.md) | [Licencia y recursos](../licencia-y-recursos.md) |
| [Changelog](../../CHANGELOG.md) | [Cambios](../../CHANGELOG.es.md) |
| [Gallery](../../exampleVideos/README.md) | [Galería](../../exampleVideos/README.es.md) |
| This guide | [Guía de documentación](../documentacion.md) |

## When changing a feature

1. Update both language versions of the affected guides and their changelog entries in the same commit.
2. Keep language-switch links and internal references in the appropriate language. Existing Spanish guide paths remain available.
3. Preserve API identifiers, JSON field names, commands, paths and error codes. Translate explanations and example text values only where their meaning is unchanged.
4. While the interface is in Spanish, include its actual Spanish labels alongside English explanations. Do not describe planned language features as already available.
5. Reuse screenshots and video attachment URLs rather than duplicating large files. Explain screenshot language and recording limitations. Check both Markdown previews in GitHub.

The verification guide records historical checks and their limits; translating it does not mean those checks were rerun. The MIT legal text stays in the single `LICENSE` file.
