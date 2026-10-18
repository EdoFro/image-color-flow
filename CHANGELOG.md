# Cambios

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
