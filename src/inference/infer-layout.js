import { isSystemField, isObjectRef, isArrayOfObjects, isArrayOfPrimitives } from './infer-control.js';

/**
 * Known field pairs that should be grouped in the same row.
 * Each entry is an array of field names that belong together.
 */
const FIELD_PAIRS = [
  ['first_name', 'last_name'],
  ['first_name', 'middle_initial', 'last_name'],
  ['first_name', 'middle_initial', 'last_name', 'suffix'],
  ['email', 'phone_number'],
  ['email', 'phone'],
  ['email', 'tel'],
  ['start_date', 'end_date'],
  ['effective_date', 'expiration_date'],
  ['city', 'state'],
  ['city', 'state', 'postal_code'],
  ['city', 'state', 'zip'],
  ['city', 'state', 'zip_code'],
  ['street', 'city', 'state', 'postal_code'],
  ['street', 'city', 'state', 'zip'],
  ['street', 'city', 'state', 'zip_code'],
  ['min', 'max'],
  ['minimum', 'maximum'],
  ['latitude', 'longitude'],
  ['lat', 'lng'],
];

/**
 * Infer the layout grouping for a set of schema properties.
 * Groups related fields into rows, identifies fieldsets and fieldset-cards,
 * and excludes system fields.
 *
 * @param {Array} properties - Normalized properties array (from normalizeProperties)
 * @param {Object} defs - $defs from the schema for resolving $ref
 * @returns {Array} Layout groups
 *   - { type: 'row', fields: [prop, prop, ...] }
 *   - { type: 'single', fields: [prop] }
 *   - { type: 'fieldset', prop, subProperties: [...] }
 *   - { type: 'fieldset-card', prop, subProperties: [...] }
 *   - { type: 'separator' }
 */
export function inferLayout(properties, defs = {}) {
  // Filter out system fields
  const visible = properties.filter(p => !isSystemField(p.name));

  // Separate into scalars, objects, and arrays
  const scalars = [];
  const objects = [];
  const arrays = [];

  for (const prop of visible) {
    if (isObjectRef(prop)) {
      objects.push(prop);
    } else if (isArrayOfObjects(prop)) {
      arrays.push(prop);
    } else {
      scalars.push(prop);
    }
  }

  const groups = [];
  const consumed = new Set();

  // First pass: match known field pairs among scalars
  for (const pair of FIELD_PAIRS) {
    const matched = pair.filter(name =>
      scalars.some(p => p.name === name && !consumed.has(name))
    );
    if (matched.length >= 2 && matched.length === pair.length) {
      const fields = matched.map(name => scalars.find(p => p.name === name));
      groups.push({ type: 'row', fields });
      matched.forEach(name => consumed.add(name));
    }
  }

  // Second pass: group remaining scalars by common prefix
  const remaining = scalars.filter(p => !consumed.has(p.name));
  const prefixGroups = groupByPrefix(remaining);

  for (const [prefix, fields] of Object.entries(prefixGroups)) {
    if (fields.length >= 2 && prefix) {
      groups.push({ type: 'row', fields });
      fields.forEach(p => consumed.add(p.name));
    }
  }

  // Third pass: remaining ungrouped scalars as singles
  const singles = scalars.filter(p => !consumed.has(p.name));
  for (const prop of singles) {
    groups.push({ type: 'single', fields: [prop] });
  }

  // Objects → fieldsets
  for (const prop of objects) {
    const resolved = resolveObjectProperties(prop, defs);
    groups.push({
      type: 'fieldset',
      prop,
      subProperties: resolved,
    });
  }

  // Arrays of objects → fieldset-cards
  for (const prop of arrays) {
    const resolved = resolveArrayItemProperties(prop, defs);
    groups.push({
      type: 'fieldset-card',
      prop,
      subProperties: resolved,
    });
  }

  return groups;
}

/**
 * Resolve an object property's sub-properties from $defs.
 */
function resolveObjectProperties(prop, defs) {
  if (prop.$ref) {
    const defName = prop.$ref.replace('#/$defs/', '');
    const def = defs[defName];
    if (def && def.properties) {
      return normalizeSubProperties(def);
    }
  }
  if (prop.properties) {
    return normalizeSubProperties(prop);
  }
  return [];
}

/**
 * Resolve an array item's sub-properties from $defs.
 */
function resolveArrayItemProperties(prop, defs) {
  if (prop.items && prop.items.$ref) {
    const defName = prop.items.$ref.replace('#/$defs/', '');
    const def = defs[defName];
    if (def && def.properties) {
      return normalizeSubProperties(def);
    }
  }
  if (prop.items && prop.items.properties) {
    return normalizeSubProperties(prop.items);
  }
  return [];
}

/**
 * Convert a schema object's properties into a normalized array.
 */
function normalizeSubProperties(schema) {
  const required = new Set(schema.required || []);
  return Object.entries(schema.properties || {}).map(([name, propSchema]) => ({
    name,
    ...propSchema,
    required: required.has(name),
  }));
}

/**
 * Group fields by common underscore prefix.
 * e.g., billing_street, billing_city → prefix "billing"
 */
function groupByPrefix(fields) {
  const groups = {};
  for (const field of fields) {
    const parts = field.name.split('_');
    if (parts.length >= 2) {
      const prefix = parts[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(field);
    }
  }
  return groups;
}
