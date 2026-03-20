import { getProper } from '../utils/naming.js';
import { render } from '../template-engine.js';
import { renderInferredControl, isSystemField, isObjectRef, isArrayOfObjects, isArrayOfPrimitives } from '../inference/infer-control.js';
import { inferLayout } from '../inference/infer-layout.js';

/**
 * Generate edit form HTML from a JSON Schema.
 * Uses inference to determine controls and layout from schema types/constraints.
 *
 * @param {Array} properties - Normalized properties array (from normalizeProperties)
 * @param {Object} defs - $defs from the schema for resolving $ref
 * @param {string} prefix - Dot-delimited path prefix for nested fields
 * @returns {string} HTML markup
 */
export function generateEditForm(properties, defs = {}, prefix = '') {
  const groups = inferLayout(properties, defs);
  let html = '';

  for (const group of groups) {
    switch (group.type) {
      case 'row':
        html += renderRow(group.fields, prefix);
        break;

      case 'single':
        html += renderSingle(group.fields[0], prefix);
        break;

      case 'fieldset':
        html += renderFieldset(group.prop, group.subProperties, defs, prefix);
        break;

      case 'fieldset-card':
        html += renderFieldsetCard(group.prop, group.subProperties, defs, prefix);
        break;
    }
  }

  return html;
}

/**
 * Render a row of controls wrapped in a responsive grid.
 */
function renderRow(fields, prefix) {
  let innerHTML = '';
  for (const prop of fields) {
    innerHTML += renderControlUnwrapped(prop, prefix);
  }
  return `
        <div class="grid-1 sm:grid-2 md:grid-${Math.min(fields.length, 4)} gap-2">
          ${innerHTML}
        </div>
`;
}

/**
 * Render a single control in its own grid row.
 */
function renderSingle(prop, prefix) {
  // Arrays of primitives (tags) render as a control
  if (isArrayOfPrimitives(prop)) {
    return `
        <div class="grid-1 gap-2">
          ${renderControlUnwrapped(prop, prefix)}
        </div>
`;
  }

  return `
        <div class="grid-1 sm:grid-2 gap-2">
          ${renderControlUnwrapped(prop, prefix)}
        </div>
`;
}

/**
 * Render a fieldset for a nested object with its sub-properties.
 */
function renderFieldset(prop, subProperties, defs, prefix) {
  const proper = getProper(prop.name);
  const path = prefix ? `${prefix}.${prop.name}` : prop.name;

  // Recursively generate form for sub-properties
  const objectHTML = generateEditForm(subProperties, defs, path);

  return render('edit-form/fieldset.njk', { proper, objectHTML });
}

/**
 * Render a fieldset-card for an array of objects.
 * Each array item is a card with its fields and a delete button.
 */
function renderFieldsetCard(prop, subProperties, defs, prefix) {
  const proper = getProper(prop.name);
  const path = prefix ? `${prefix}.${prop.name}` : `${prop.name}.{%forloop.Counter0%}`;

  // Generate inner HTML for each sub-property
  let arrayHTML = '';
  for (const sub of subProperties) {
    let subHTML = renderControlUnwrapped(sub, path);
    subHTML = subHTML.replace(new RegExp(`Record\\.${escapeRegex(path)}`, 'g'), 'item');
    arrayHTML += subHTML;
  }

  return render('edit-form/fieldset-card.njk', {
    proper,
    propName: prop.name,
    arrayHTML,
  });
}

/**
 * Render a control and strip the row wrapper (if present).
 * The layout layer handles row grouping, so individual controls
 * should not include their own row wrapper div.
 */
function renderControlUnwrapped(prop, prefix) {
  let html = renderInferredControl(prop, prefix);
  // Strip outer <div class="row gap-4">...</div> wrapper from legacy templates
  html = html.replace(/^\s*<div class="row gap-4">\s*/, '');
  html = html.replace(/\s*<\/div>\s*$/, '');
  return html;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
