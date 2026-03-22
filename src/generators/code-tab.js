import { findArrayTypesFromSchema } from '../utils/schema-helpers.js';
import { quoteStrings } from '../utils/naming.js';
import { render } from '../template-engine.js';

/**
 * Generate the Code tab JavaScript for an edit template or page.
 *
 * @param {Object} options
 * @param {string} options.collectionName - MongoDB collection name
 * @param {string} options.schemaSlug - Schema slug (usually same as collection)
 * @param {Object} options.schema - JSON Schema with properties, $defs
 * @param {string} [options.target='template'] - 'template' for rdx.AppData.Template, 'page' for rdx.AppData.Page
 * @returns {string} JavaScript code string
 */
export function generateEditCode({ collectionName, schemaSlug, schema, target = 'template' }) {
  const defs = schema.$defs || {};
  const { primitiveArrays, nonPrimitiveArrays } = findArrayTypesFromSchema(schema.properties || {}, defs);
  const mergedArrays = [...primitiveArrays, ...nonPrimitiveArrays];

  const primitiveStr = quoteStrings(primitiveArrays).join(', ');
  const mergedStr = quoteStrings(mergedArrays).join(', ');
  const appDataKey = target === 'page' ? 'Page' : 'Template';

  const now = new Date().toISOString();

  return render('generators/code-edit.njk', { primitiveStr, mergedStr, now, appDataKey });
}

/**
 * Generate the Code tab JavaScript for a list template or page.
 *
 * @param {Object} [options]
 * @param {string} [options.target='template'] - 'template' or 'page'
 * @returns {string} JavaScript code string
 */
export function generateListCode({ target = 'template' } = {}) {
  const now = new Date().toISOString();

  return render('generators/code-list.njk', { now });
}
