/**
 * TemplateCraft — Inference-based template generator for Go Kart
 *
 * Takes a clean JSON Schema (from LiteSpec, no UI annotations) and generates
 * complete _template_builder or _page MongoDB documents by inferring the best
 * Wave CSS components, layout, and structure from schema types and constraints.
 *
 * Usage:
 *   // Generate _template_builder documents
 *   const templates = templateCraft.generate(schema, { collectionName: 'client' });
 *
 *   // Generate _page documents
 *   const pages = templateCraft.generatePages(schema, { collectionName: 'client' });
 */

import './templates/register.js';
import { generateListContent } from './generators/list.js';
import { generateEditContent } from './generators/edit.js';
import { generateEditCode, generateListCode } from './generators/code-tab.js';
import { generateFieldRules, generateFieldRulesString } from './generators/field-rules.js';
import { generateEditForm } from './generators/edit-form.js';
import { generateEditPageLayout, generateListPageLayout } from './generators/page-layout.js';
import { getProper, getSuffix, toSlug, quoteStrings } from './utils/naming.js';
import { findProperty, findArrayTypes, getAllArrayFields, resolveRef, normalizeProperties, findArrayTypesFromSchema } from './utils/schema-helpers.js';
import { inferControl, renderInferredControl, inferLayout, inferListCol, generateListColumns } from './inference/index.js';

// --- Shared helpers ---

/**
 * Derive collection name and validate schema.
 */
function resolveOptions(schema, options) {
  const collectionName = options.collectionName || (schema.title ? toSlug(schema.title) : null);
  if (!collectionName) {
    throw new Error('TemplateCraft: collectionName is required (pass in options or set schema.title)');
  }
  if (!schema || !schema.properties) {
    throw new Error('TemplateCraft: schema with properties is required');
  }
  return {
    collectionName,
    properName: getProper(collectionName),
    editSlug: collectionName,
    listSlug: `${collectionName}_list`,
    schemaSlug: collectionName,
    now: new Date().toISOString(),
  };
}

// --- _template_builder generation ---

/**
 * Generate complete _template_builder documents from a JSON Schema.
 *
 * @param {Object} schema - Clean JSON Schema
 * @param {Object} options
 * @param {string} [options.collectionName] - MongoDB collection name
 * @param {string} [options.routePrefix='x'] - Route prefix ('x' or 'v')
 * @param {string} [options.templateType='tab-control'] - Layout type for edit
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

  const { collectionName, properName, editSlug, listSlug, schemaSlug, now } = resolveOptions(schema, options);
  const templates = [];

  if (includeList) {
    const listContent = generateListContent({ collectionName, schema, functions });
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

  if (includeEdit) {
    const editContent = generateEditContent({ collectionName, templateSlug: editSlug, schema, templateType, functions });
    const editCode = generateEditCode({ collectionName, schemaSlug, schema });
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
 * Create a complete _template_builder document.
 */
function createTemplateDocument({
  name, slug, collectionName, schemaSlug, templateType, routePrefix,
  routeNextTemplateSlug, routePrevTemplateSlug, content, code, fieldRules, now,
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

// --- _page generation ---

/**
 * Generate complete _page documents from a JSON Schema.
 *
 * @param {Object} schema - Clean JSON Schema
 * @param {Object} options
 * @param {string} [options.collectionName] - MongoDB collection name
 * @param {string} [options.routePrefix='x'] - Route prefix ('x' or 'v')
 * @param {boolean} [options.includeList=true] - Generate list page
 * @param {boolean} [options.includeEdit=true] - Generate edit page
 * @returns {Array} Array of _page document objects
 */
function generatePages(schema, options = {}) {
  const {
    routePrefix = 'x',
    includeList = true,
    includeEdit = true,
  } = options;

  const { collectionName, properName, editSlug, listSlug, schemaSlug, now } = resolveOptions(schema, options);
  const jsonSchemaStr = JSON.stringify(schema, null, 2);
  const pages = [];

  if (includeList) {
    const listLayout = generateListPageLayout(schema, collectionName, routePrefix);
    const listCode = generateListCode();

    pages.push(createPageDocument({
      name: `${properName} List`,
      slug: listSlug,
      collectionName,
      schemaSlug,
      pageType: 'standard',
      routePrefix,
      routeNextPageSlug: editSlug,
      routePrevPageSlug: '',
      routeRecordID: '',
      code: listCode,
      content: '',
      fieldRules: '',
      jsonSchema: jsonSchemaStr,
      jsonLayout: JSON.stringify(listLayout, null, 2),
      depends: ['page_base', 'loader', 'page_partial_base'],
      collections: [collectionName],
      lookups: [],
      now,
    }));
  }

  if (includeEdit) {
    const editLayout = generateEditPageLayout(schema, collectionName, routePrefix, listSlug);
    const editCode = generateEditCode({ collectionName, schemaSlug, schema });
    let fieldRulesStr = '';
    if (schema.allOf) {
      fieldRulesStr = generateFieldRulesString(schema);
    }

    pages.push(createPageDocument({
      name: properName,
      slug: editSlug,
      collectionName,
      schemaSlug,
      pageType: 'standard',
      routePrefix,
      routeNextPageSlug: '',
      routePrevPageSlug: listSlug,
      routeRecordID: 'true',
      code: editCode,
      content: '',
      fieldRules: fieldRulesStr,
      jsonSchema: jsonSchemaStr,
      jsonLayout: JSON.stringify(editLayout, null, 2),
      depends: ['page_base', 'loader', 'page_partial_base'],
      collections: [collectionName],
      lookups: [],
      now,
    }));
  }

  return pages;
}

/**
 * Create a complete _page document.
 */
function createPageDocument({
  name, slug, collectionName, schemaSlug, pageType, routePrefix,
  routeNextPageSlug, routePrevPageSlug, routeRecordID,
  code, content, fieldRules, jsonSchema, jsonLayout,
  depends, collections, lookups, now,
}) {
  return {
    name,
    slug,
    collection_name: collectionName,
    schema: schemaSlug,
    page_type: pageType,
    route_prefix: routePrefix,
    route_record_id: routeRecordID || 'true',
    route_next_page_slug: routeNextPageSlug || '',
    route_prev_page_slug: routePrevPageSlug || '',
    depend_full_request: 'page_base',
    depend_partial_request: 'page_partial_base',
    depends: depends || ['page_base', 'loader', 'page_partial_base'],
    collections: collections || [],
    lookups: lookups || [],
    code,
    content: content || '',
    field_rules: fieldRules || '',
    json_schema: jsonSchema || '',
    json_layout: jsonLayout || '',
    reference_key: collectionName,
    record_status: 'Active',
    version_number: '0.01',
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
  generatePages,
  createTemplateDocument,
  createPageDocument,
  generateListContent,
  generateEditContent,
  generateEditCode,
  generateListCode,
  generateFieldRules,
  generateFieldRulesString,
  generateEditForm,
  generateEditPageLayout,
  generateListPageLayout,
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
