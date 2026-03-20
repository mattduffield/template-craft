import { getProper, getSuffix, getProperSuffix } from '../utils/naming.js';
import { render } from '../template-engine.js';

/**
 * System fields handled by the meta_fields fragment.
 * These are skipped in form generation.
 */
const SYSTEM_FIELDS = new Set([
  '_id', 'created_by', 'created_date', 'modified_by', 'modified_date',
]);

/**
 * Name patterns that suggest a textarea instead of a single-line input.
 */
const TEXTAREA_NAMES = [
  'description', 'notes', 'comments', 'bio', 'summary',
  'message', 'body', 'content', 'remarks', 'details',
];

/**
 * ObjectId pattern used by LiteSpec for MongoDB references.
 */
const OBJECTID_PATTERN = '^$|^[a-fA-F0-9]{24}$';

/**
 * Threshold for enum values: <= this → radio buttons, > this → select dropdown.
 */
const RADIO_ENUM_THRESHOLD = 3;

/**
 * Infer the best Wave CSS control for a schema property.
 * Examines type, format, enum, pattern, and property name — no UI annotations needed.
 *
 * @param {Object} prop - Normalized property (has .name, .type, .format, .enum, etc.)
 * @param {string} prefix - Dot-delimited path prefix (e.g., "address")
 * @returns {{ templateName: string, context: Object } | null} Template + context, or null to skip
 */
export function inferControl(prop, prefix = '') {
  const name = prop.name;

  // System fields — handled by meta_fields include
  if (SYSTEM_FIELDS.has(name)) {
    return null;
  }

  const type = resolveType(prop);
  const format = resolveFormat(prop);
  const context = buildContext(prop, prefix);
  let templateName = null;

  // Hidden fields: UUID format or ObjectId pattern
  if (format === 'uuid' || prop.pattern === OBJECTID_PATTERN) {
    templateName = 'controls/input-hidden.njk';
    return { templateName, context };
  }

  // Boolean → checkbox toggle-switch
  if (type === 'boolean') {
    templateName = 'controls/wc-input-boolean.njk';
    return { templateName, context };
  }

  // Enum string → radio (small) or select (large)
  if (prop.enum && prop.enum.length > 0) {
    if (prop.enum.length <= RADIO_ENUM_THRESHOLD) {
      templateName = 'controls/wc-input-radio-enum.njk';
    } else {
      templateName = 'controls/wc-select-enum.njk';
    }
    context.enumValues = prop.enum;
    return { templateName, context };
  }

  // Email — by format or name
  if (format === 'email' || nameContains(name, 'email')) {
    templateName = 'controls/wc-input-email.njk';
    return { templateName, context };
  }

  // Date/DateTime
  if (format === 'date-time' || format === 'date') {
    templateName = 'controls/wc-input-date.njk';
    return { templateName, context };
  }

  // Phone/Tel — by name or pattern
  if (nameContains(name, 'phone') || nameContains(name, 'tel') || isPhonePattern(prop.pattern)) {
    templateName = 'controls/wc-input-tel.njk';
    return { templateName, context };
  }

  // Password — by name
  if (nameContains(name, 'password') || nameContains(name, 'pwd')) {
    templateName = 'controls/wc-input-string.njk';
    context.inputType = 'password';
    return { templateName, context };
  }

  // Textarea — by name
  if (TEXTAREA_NAMES.some(t => nameContains(name, t))) {
    templateName = 'controls/wc-textarea.njk';
    return { templateName, context };
  }

  // Array of strings → chip select with allow-dynamic
  if (type === 'array' && prop.items && prop.items.type === 'string') {
    templateName = 'controls/wc-select-multiple-dynamic.njk';
    return { templateName, context };
  }

  // Integer → number input
  if (type === 'integer') {
    templateName = 'controls/wc-input-integer.njk';
    context.min = prop.minimum != null ? prop.minimum : 0;
    context.max = prop.maximum != null ? prop.maximum : 999999;
    return { templateName, context };
  }

  // Number / Decimal128 → currency input
  if (type === 'number') {
    templateName = 'controls/wc-input-number.njk';
    context.min = prop.minimum != null ? prop.minimum : 0;
    context.max = prop.maximum != null ? prop.maximum : 999999;
    return { templateName, context };
  }

  // Fallback: plain text input for strings and unknowns
  if (type === 'string' || !type) {
    templateName = 'controls/wc-input-string.njk';
    return { templateName, context };
  }

  // Objects and arrays of objects are handled by edit-form, not here
  return null;
}

/**
 * Render the inferred control directly.
 *
 * @param {Object} prop - Normalized property
 * @param {string} prefix - Path prefix
 * @returns {string} Rendered HTML or empty string
 */
export function renderInferredControl(prop, prefix = '') {
  const result = inferControl(prop, prefix);
  if (!result) return '';
  return render(result.templateName, result.context);
}

/**
 * Check if a property is a system field.
 */
export function isSystemField(name) {
  return SYSTEM_FIELDS.has(name);
}

/**
 * Check if a property is an object with a $ref (nested object).
 */
export function isObjectRef(prop) {
  return prop.type === 'object' && (prop.$ref || (prop.properties && Object.keys(prop.properties).length > 0));
}

/**
 * Check if a property is an array of objects (via $ref).
 */
export function isArrayOfObjects(prop) {
  return prop.type === 'array' && prop.items && (prop.items.$ref || prop.items.properties);
}

/**
 * Check if a property is an array of primitives.
 */
export function isArrayOfPrimitives(prop) {
  return prop.type === 'array' && prop.items && !prop.items.$ref && !prop.items.properties;
}

// --- Internal helpers ---

function buildContext(prop, prefix) {
  const fullName = prefix ? `${prefix}.${prop.name}` : prop.name;
  return {
    fullName,
    proper: getProper(prop.name),
    suffix: getSuffix(prop.name),
    properSuffix: getProperSuffix(prop.name),
    record: 'Record',
    required: prop.required ? 'required=""' : '',
    enumValues: prop.enum || [],
    min: 0,
    max: 999999,
  };
}

/**
 * Resolve the effective type, handling anyOf patterns for nullable date-time.
 */
function resolveType(prop) {
  if (prop.type) return prop.type;
  // anyOf pattern: [{ type: "string", format: "date-time" }, { type: "string", maxLength: 0 }]
  if (prop.anyOf) {
    const typed = prop.anyOf.find(s => s.type && s.format);
    if (typed) return typed.type;
    const first = prop.anyOf.find(s => s.type);
    if (first) return first.type;
  }
  return null;
}

/**
 * Resolve the effective format, handling anyOf patterns.
 */
function resolveFormat(prop) {
  if (prop.format) return prop.format;
  if (prop.anyOf) {
    const withFormat = prop.anyOf.find(s => s.format);
    if (withFormat) return withFormat.format;
  }
  return null;
}

function nameContains(name, substring) {
  return name.toLowerCase().includes(substring.toLowerCase());
}

function isPhonePattern(pattern) {
  if (!pattern) return false;
  // Patterns with digit groups like \d{3} suggest phone numbers
  return /\\d\{3\}/.test(pattern);
}
