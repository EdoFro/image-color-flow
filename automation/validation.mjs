import { readFile } from 'node:fs/promises';

export const planSchema = JSON.parse(await readFile(new URL('../schemas/animation.schema.json', import.meta.url), 'utf8'));

// Validador del subconjunto de JSON Schema utilizado por nuestro contrato.
// El mismo esquema se publica para clientes que utilicen un validador completo.
export function check(value, schema = planSchema, path = '$', root = planSchema) {
  if (schema.$ref) return check(value, root.$defs[schema.$ref.split('/').pop()], path, root);
  if (schema.anyOf) {
    if (!schema.anyOf.some(s => check(value, s, path, root).length === 0)) return [{ path, message: 'Valor incompatible con las alternativas permitidas.' }];
    return [];
  }
  const errors = [], fail = message => errors.push({ path, message });
  if (schema.enum && !schema.enum.includes(value)) fail(`Valores permitidos: ${schema.enum.join(', ')}.`);
  if (schema.type) {
    const valid = schema.type === 'null' ? value === null : schema.type === 'array' ? Array.isArray(value) : schema.type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : schema.type === 'integer' ? Number.isInteger(value) : typeof value === schema.type;
    if (!valid) { fail(`Se esperaba ${schema.type}.`); return errors; }
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Se necesita un número finito.');
    if (schema.minimum !== undefined && value < schema.minimum) fail(`Mínimo: ${schema.minimum}.`);
    if (schema.maximum !== undefined && value > schema.maximum) fail(`Máximo: ${schema.maximum}.`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) fail('Texto vacío.');
    if (schema.maxLength !== undefined && value.length > schema.maxLength) fail(`Longitud máxima: ${schema.maxLength}.`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail('Formato de texto no válido.');
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(`Se necesitan al menos ${schema.minItems} elementos.`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(`Máximo: ${schema.maxItems} elementos.`);
    if (schema.items) value.forEach((v, i) => errors.push(...check(v, schema.items, `${path}[${i}]`, root)));
  } else if (value && typeof value === 'object') {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push({ path: `${path}.${key}`, message: 'Campo obligatorio.' });
    for (const [key, v] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties || {}, key)) errors.push(...check(v, schema.properties[key], `${path}.${key}`, root));
      else if (schema.additionalProperties === false) errors.push({ path: `${path}.${key}`, message: 'Campo desconocido.' });
    }
    if (schema === root.$defs?.frame && (value.x + value.width > 1.00000001 || value.y + value.height > 1.00000001)) fail('El rectángulo debe quedar dentro de la imagen.');
    if (schema === root.$defs?.baseGeneration) {
      const grayscale = value.method === 'grayscale', black = value.blackPoint ?? (grayscale ? 0 : .14), white = value.whitePoint ?? (grayscale ? 1 : .94);
      if (black >= white) fail('blackPoint debe ser menor que whitePoint.');
    }
  }
  return errors;
}

export class AutomationError extends Error {
  constructor(code, message, details = []) { super(message); this.code = code; this.details = details; }
}

export function assertPlan(plan, stageOnly = false) {
  const errors = check(plan, stageOnly ? planSchema.$defs.stage : planSchema);
  if (errors.length) throw new AutomationError('INVALID_PLAN', 'Revisa los campos del plan de animación.', errors);
  return plan;
}

export function errorData(error) {
  return { code: error.code || 'AUTOMATION_ERROR', message: error.message, details: error.details || [] };
}
