import { getProper } from '../utils/naming.js';
import { normalizeProperties } from '../utils/schema-helpers.js';
import { generateListColumns } from '../inference/infer-list-col.js';
import { render } from '../template-engine.js';

/**
 * Generate the Content tab HTML for a list template.
 * Accepts a clean JSON Schema and infers column types from property types.
 *
 * @param {Object} options
 * @param {string} options.collectionName - MongoDB collection name
 * @param {Object} options.schema - JSON Schema with properties, sort
 * @param {string} options.functions - Optional schema-level JavaScript functions
 * @returns {string} HTML template markup
 */
export function generateListContent({ collectionName, schema, functions = '' }) {
  const properCollection = getProper(collectionName);

  // Build sort string from schema
  let sortStr = '[ ';
  if (schema.sort && schema.sort.length > 0) {
    sortStr += schema.sort.map(s => `{"column":"${s.name}","dir":"${s.dir}"}`).join(',');
  }
  sortStr += ' ]';

  // Generate list columns from normalized properties
  const properties = normalizeProperties(schema);
  const listHTML = generateListColumns(properties);

  return render('generators/list-content.njk', {
    properCollection,
    collectionName,
    sortStr,
    listHTML,
    functions,
  });
}
