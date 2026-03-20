/**
 * TemplateCraft — Inference-based template generator for Go Kart
 *
 * Takes a clean JSON Schema (from LiteSpec, no UI annotations) and generates
 * complete _template_builder MongoDB documents by inferring the best Wave CSS
 * components, layout, and structure from schema types and constraints.
 *
 * Usage:
 *   const templates = templateCraft.generate(schema, { collectionName: 'client' });
 *   // templates is an array of _template_builder documents ready for MongoDB insert
 */

import './templates/register.js';
import { generateListContent } from './generators/list.js';
import { generateEditContent } from './generators/edit.js';
import { generateEditCode, generateListCode } from './generators/code-tab.js';
import { generateFieldRules, generateFieldRulesString } from './generators/field-rules.js';
import { generateEditForm } from './generators/edit-form.js';
import { getProper, getSuffix, toSlug, quoteStrings } from './utils/naming.js';
import { findProperty, findArrayTypes, getAllArrayFields, resolveRef, normalizeProperties, findArrayTypesFromSchema } from './utils/schema-helpers.js';
import { inferControl, renderInferredControl, inferLayout, inferListCol, generateListColumns } from './inference/index.js';

/**
 * Generate complete _template_builder documents from a JSON Schema.
 *
 * @param {Object} schema - Clean JSON Schema with properties, $defs, required, allOf, sort, breadcrumb
 * @param {Object} options
 * @param {string} [options.collectionName] - MongoDB collection name (defaults to schema.title slugified)
 * @param {string} [options.routePrefix='x'] - Route prefix ('x' for protected, 'v' for public)
 * @param {string} [options.templateType='tab-control'] - Layout type for edit template
 * @param {string} [options.functions=''] - Schema-level JavaScript functions
 * @param {boolean} [options.includeList=true] - Generate list template
 * @param {boolean} [options.includeEdit=true] - Generate edit template
 * @returns {Array} Array of _template_builder document objects
 */
function generate(schema, options = {}) {
  const {
    routePrefix = 'x',
    templateType = 'tab-control',
    functions = '',
    includeList = true,
    includeEdit = true,
  } = options;

  // Derive collection name from schema title or explicit option
  const collectionName = options.collectionName || (schema.title ? toSlug(schema.title) : null);
  if (!collectionName) {
    throw new Error('TemplateCraft: collectionName is required (pass in options or set schema.title)');
  }
  if (!schema || !schema.properties) {
    throw new Error('TemplateCraft: schema with properties is required');
  }

  const properName = getProper(collectionName);
  const editSlug = collectionName;
  const listSlug = `${collectionName}_list`;
  const schemaSlug = collectionName;
  const now = new Date().toISOString();
  const templates = [];

  // --- List Template ---
  if (includeList) {
    const listContent = generateListContent({
      collectionName,
      schema,
      functions,
    });

    const listCode = generateListCode();

    templates.push(createTemplateDocument({
      name: `${properName} List`,
      slug: listSlug,
      collectionName,
      schemaSlug,
      templateType: 'standard',
      routePrefix,
      routeNextTemplateSlug: editSlug,
      routePrevTemplateSlug: '',
      content: listContent,
      code: listCode,
      fieldRules: '',
      now,
    }));
  }

  // --- Edit Template ---
  if (includeEdit) {
    const editContent = generateEditContent({
      collectionName,
      templateSlug: editSlug,
      schema,
      templateType,
      functions,
    });

    const editCode = generateEditCode({
      collectionName,
      schemaSlug,
      schema,
    });

    // Generate field rules from allOf conditionals
    let fieldRulesStr = '';
    if (schema.allOf) {
      fieldRulesStr = generateFieldRulesString(schema);
    }

    templates.push(createTemplateDocument({
      name: properName,
      slug: editSlug,
      collectionName,
      schemaSlug,
      templateType: 'standard',
      routePrefix,
      routeNextTemplateSlug: '',
      routePrevTemplateSlug: listSlug,
      content: editContent,
      code: editCode,
      fieldRules: fieldRulesStr,
      now,
    }));
  }

  return templates;
}

/**
 * Create a complete _template_builder document with all required fields.
 */
function createTemplateDocument({
  name,
  slug,
  collectionName,
  schemaSlug,
  templateType,
  routePrefix,
  routeNextTemplateSlug,
  routePrevTemplateSlug,
  content,
  code,
  fieldRules,
  now,
}) {
  return {
    name,
    slug,
    collection_name: collectionName,
    schema: schemaSlug,
    schema_slug: schemaSlug,
    template_type: templateType,
    screen_type: templateType,
    route_prefix: routePrefix,
    route_record_id: 'true',
    route_next_template_slug: routeNextTemplateSlug,
    route_next_screen_slug: routeNextTemplateSlug,
    route_prev_template_slug: routePrevTemplateSlug,
    route_prev_screen_slug: routePrevTemplateSlug,
    depend_full_request: 'true',
    depend_partial_request: 'partial-base',
    depends: ['base', 'loader', 'partial-base'],
    collections: [],
    lookups: [],
    content,
    code,
    field_rules: fieldRules,
    reference_key: collectionName,
    record_status: 'Development',
    version_number: '0.01',
    is_base: false,
    is_core: false,
    is_active: true,
    preview_toggle: 'off',
    drag_toggle: 'off',
    created_by: '',
    created_date: now,
    modified_by: '',
    modified_date: now,
  };
}

// Export all public functions
export {
  generate,
  generateListContent,
  generateEditContent,
  generateEditCode,
  generateListCode,
  generateFieldRules,
  generateFieldRulesString,
  generateEditForm,
  getProper,
  getSuffix,
  toSlug,
  quoteStrings,
  findProperty,
  findArrayTypes,
  getAllArrayFields,
  resolveRef,
  normalizeProperties,
  findArrayTypesFromSchema,
  inferControl,
  renderInferredControl,
  inferLayout,
  inferListCol,
  generateListColumns,
};
