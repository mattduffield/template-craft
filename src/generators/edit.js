import { getProper } from '../utils/naming.js';
import { getWrapper } from '../layouts/wrappers.js';
import { generateEditForm } from './edit-form.js';
import { normalizeProperties } from '../utils/schema-helpers.js';
import { render } from '../template-engine.js';

/**
 * Generate the Content tab HTML for an edit template.
 * Accepts a clean JSON Schema and infers controls and layout.
 *
 * @param {Object} options
 * @param {string} options.collectionName - MongoDB collection name
 * @param {string} options.templateSlug - Template slug (usually same as collection)
 * @param {Object} options.schema - JSON Schema with properties, $defs, sort, breadcrumb
 * @param {string} options.templateType - Layout type: 'tab-control' or 'card'
 * @param {string} options.functions - Optional schema-level JavaScript functions
 * @returns {string} HTML template markup
 */
export function generateEditContent({
  collectionName,
  templateSlug,
  schema,
  templateType = 'tab-control',
  functions = '',
}) {
  const properTemplateSlug = getProper(templateSlug);

  // Build breadcrumb string from schema
  let breadcrumbStr = '';
  if (schema.breadcrumb && schema.breadcrumb.length > 0) {
    breadcrumbStr = schema.breadcrumb
      .map(item => `{{Record.${item.name}}}${item.suffix || ''}`)
      .join('');
  }

  // Get layout wrapper
  const { prefix: wrapperPrefix, suffix: wrapperSuffix } = getWrapper(templateType);

  // Normalize and generate form HTML
  const properties = normalizeProperties(schema);
  const defs = schema.$defs || {};
  const formHTML = generateEditForm(properties, defs);

  return render('generators/edit-content.njk', {
    properTemplateSlug,
    breadcrumbStr,
    wrapperPrefix,
    wrapperSuffix,
    formHTML,
    templateSlug,
    collectionName,
    functions,
  });
}
