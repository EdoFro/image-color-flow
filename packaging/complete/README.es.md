# ImageColorFlow · Editor + automatización local

[English](README.md) | **Español**

Este paquete incluye el editor portable, ejemplo introductorio, API local de Node.js, CLI y servidor MCP.

- **Editor:** abre [app/index.html](app/index.html) en Chrome o Edge. No requiere instalación ni conexión. Conserva `app/` completa al copiarla por separado. Consulta las [instrucciones del editor](app/README.es.md).
- **Automatización:** Node.js 22 o posterior; Chrome/Edge/Chromium para preparar imágenes y renderizar. No necesitas `npm install`. Consulta la [configuración de API, CLI y MCP](AUTOMATION.es.md).
- **Asistentes con IA:** [guía de trabajo](docs/para-ia.md) y [esquema del plan](schemas/animation.schema.json).

Ejecuta los comandos de automatización desde la raíz de este paquete. Conserva juntas `automation/`, `schemas/`, `docs/`, `app/` y `package.json`. Las entradas y salidas deben estar dentro de la carpeta de trabajo elegida.

[Licencia MIT](LICENSE) · [Condiciones de las imágenes de ejemplo](app/NOTICE.md)

[Repositorio y documentación completa](https://github.com/EdoFro/image-color-flow)

Consulta [borradores e integración](docs/integracion.md) para abrir el editor con un proyecto y exportar animaciones controlables desde otra presentación.
