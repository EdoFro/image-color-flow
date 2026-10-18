/* Parámetros colectivos. General deriva sus valores del proyecto; no es una etapa. */
(function (root) {
  'use strict';
  function createPaintGeneral() {
    const numeric = (key, label, group, min, max, step, scale = 1, unit = '', scope = 'stage') => ({ key, label, group, min, max, step, scale, unit, scope, type: 'number' });
    const choice = (key, label, group, options, scope = 'stage') => ({ key, label, group, options, scope, type: 'select' });
    const parameters = [
      numeric('radius', 'Radio de tinta', 'Propagación', 1, 150, 1, 100, '%', 'radius'),
      numeric('maxRadius', 'Radio máximo', 'Propagación', 1, 150, 1, 100, '%', 'radius'),
      numeric('speed', 'Velocidad base', 'Propagación', 1, 60, 1, 100, '% / s'),
      numeric('clarity', 'Impulso en colores claros', 'Propagación', 0, 8, .1),
      numeric('ink', 'Demora al atravesar negro', 'Propagación', 0, 30, .5),
      numeric('hueResistance', 'Resistencia al cambio de tono', 'Propagación', 0, 30, .5),
      numeric('fade', 'Aparición de cada píxel', 'Propagación', .05, 2, .05, 1, 's'),
      numeric('blackThreshold', 'Umbral de negro', 'Propagación', 5, 160, 1),
      numeric('windStrength', 'Fuerza del viento', 'Viento y pincel', 0, 2, .05),
      numeric('windAngle', 'Dirección del viento', 'Viento y pincel', 0, 359, 1, 1, '°'),
      numeric('pathSpeed', 'Velocidad del pincel', 'Viento y pincel', 1, 100, 1, 100, '% / s'),
      choice('enabled', 'Activación de puntos', 'Puntos', [[true, 'Activos'], [false, 'Desactivados']], 'point'),
      choice('startMode', 'Modo de inicio de puntos', 'Puntos', [['with', 'Junto al anterior activo'], ['after', 'Al terminar el anterior activo'], ['delay', 'Con demora desde el anterior activo']], 'point'),
      numeric('delay', 'Demora de los puntos', 'Puntos', 0, 3600, .1, 1, 's', 'point'),
      numeric('zoom', 'Acercamiento al enfoque', 'Enfoque y destacado', 0, 100, 1, 100, '%', 'view'),
      choice('highlightEnabled', 'Habilitar destacado', 'Enfoque y destacado', [[true, 'Sí'], [false, 'No']], 'view'),
      choice('highlightLinked', 'Vincular enfoque y destacado', 'Enfoque y destacado', [[true, 'Sí'], [false, 'No']], 'view'),
      choice('outside', 'Fuera del destacado', 'Enfoque y destacado', [['show', 'Mostrar'], ['blur', 'Desenfocar'], ['black', 'Negro'], ['white', 'Blanco'], ['color', 'Color personalizado'], ['transparent', 'Transparente']], 'view'),
      { key: 'outsideColor', label: 'Color exterior', group: 'Enfoque y destacado', type: 'color', scope: 'view' },
      numeric('blur', 'Intensidad de desenfoque', 'Enfoque y destacado', 0, 40, 1, 1, 'px', 'view'),
      numeric('cameraDuration', 'Transición de cámara y destacado', 'Tiempos', 0, 5, .1, 1, 's'),
      numeric('paintDelay', 'Desfase inicial de pintura', 'Tiempos', 0, 60, .1, 1, 's'),
      numeric('hold', 'Permanencia adicional', 'Tiempos', 0, 60, .1, 1, 's'),
      choice('pauseAfter', 'Esperar al terminar', 'Tiempos', [[true, 'Clic o tecla'], [false, 'Continuar automáticamente']])
    ];
    function targets(project, parameter, includeInitial = false) {
      const stages = project.stages;
      if (parameter.scope === 'point') return stages.flatMap(s => s.points);
      return parameter.scope === 'view' && includeInitial ? [...stages, project.initialView] : stages;
    }
    function values(project, parameter, includeInitial = false) {
      const result = targets(project, parameter, includeInitial).map(target => target[parameter.key]);
      if (parameter.scope === 'radius') for (const stage of project.stages) for (const point of stage.points) result.push(point.inheritRadii === false ? point[parameter.key] : stage[parameter.key]);
      return result;
    }
    function summary(project, parameter, includeInitial = false) {
      const list = values(project, parameter, includeInitial), mixed = list.some(value => value !== list[0]);
      return { count: list.length, mixed, value: mixed ? undefined : list[0], min: Math.min(...list), max: Math.max(...list) };
    }
    function format(parameter, value) {
      if (parameter.type === 'number') return `${+(value * parameter.scale).toFixed(3)}${parameter.unit ? ' ' + parameter.unit : ''}`;
      return parameter.options?.find(option => option[0] === value)?.[1] || String(value);
    }
    function validate(changes) {
      const result = {};
      for (const [key, value] of Object.entries(changes)) {
        const parameter = parameters.find(item => item.key === key);
        if (!parameter) throw new Error('Parámetro general desconocido.');
        if (parameter.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || value * parameter.scale < parameter.min - 1e-8 || value * parameter.scale > parameter.max + 1e-8)) throw new Error(`Revisa ${parameter.label}.`);
        if (parameter.type === 'select' && !parameter.options.some(option => option[0] === value)) throw new Error(`Revisa ${parameter.label}.`);
        if (parameter.type === 'color' && !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Revisa el color exterior.');
        result[key] = value;
      }
      return result;
    }
    function apply(project, changes, includeInitial = false) {
      const validated = validate(changes);
      for (const [key, value] of Object.entries(validated)) {
        const parameter = parameters.find(item => item.key === key);
        for (const target of targets(project, parameter, includeInitial)) target[key] = value;
      }
      if ('radius' in validated || 'maxRadius' in validated) for (const stage of project.stages) for (const point of stage.points) {
        point.inheritRadii = true; point.radius = stage.radius; point.maxRadius = stage.maxRadius;
      }
    }
    function scope(project, stages) {
      if (!stages.length || new Set(stages).size !== stages.length || stages.some(stage => !project.stages.includes(stage))) throw new Error('La selección de etapas no es válida.');
      return { stages: [...stages], initialView: project.initialView };
    }
    return { parameters, targets, summary, format, validate, apply, scope };
  }
  root.createPaintGeneral = createPaintGeneral; root.PaintGeneral = createPaintGeneral();
})(typeof window === 'undefined' ? globalThis : window);
