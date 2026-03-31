import { findArrayTypesFromSchema } from '../utils/schema-helpers.js';
import { quoteStrings } from '../utils/naming.js';
import { render } from '../template-engine.js';

/**
 * Generate the Code tab JavaScript for an edit template.
 *
 * @param {Object} options
 * @param {string} options.collectionName - MongoDB collection name
 * @param {string} options.schemaSlug - Schema slug (usually same as collection)
 * @param {Object} options.schema - JSON Schema with properties, $defs
 * @returns {string} JavaScript code string
 */
export function generateEditCode({ collectionName, schemaSlug, schema }) {
  const defs = schema.$defs || {};
  const { primitiveArrays, nonPrimitiveArrays } = findArrayTypesFromSchema(schema.properties || {}, defs);
  const mergedArrays = [...primitiveArrays, ...nonPrimitiveArrays];

  const primitiveStr = quoteStrings(primitiveArrays).join(', ');
  const mergedStr = quoteStrings(mergedArrays).join(', ');
  const appDataKey = 'Template';

  const now = new Date().toISOString();

  return render('generators/code-edit.njk', { primitiveStr, mergedStr, now, appDataKey });
}

/**
 * Generate the Code tab JavaScript for a list template.
 *
 * @returns {string} JavaScript code string
 */
export function generateListCode() {
  const now = new Date().toISOString();

  return render('generators/code-list.njk', { now });
}
