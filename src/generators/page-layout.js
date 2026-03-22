import { getProper } from '../utils/naming.js';
import { normalizeProperties, resolveRef } from '../utils/schema-helpers.js';
import { isSystemField, isObjectRef, isArrayOfObjects, isArrayOfPrimitives } from '../inference/infer-control.js';
import { inferLayout } from '../inference/infer-layout.js';
import { inferListCol } from '../inference/infer-list-col.js';

/**
 * Generate a unique data-id for a layout element.
 */
function uid() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 5);
}

// --- Control type inference for page designer element types ---

/**
 * Infer the wc-page-designer element type for a schema property.
 * Returns the type string used in json_layout (e.g., 'wc-input', 'wc-input-email').
 */
function inferPageControlType(prop) {
  const type = resolveType(prop);
  const format = resolveFormat(prop);
  const name = prop.name;

  if (format === 'uuid' || prop.pattern === '^$|^[a-fA-F0-9]{24}$') return null;
  if (type === 'boolean') return 'wc-input-checkbox';
  if (prop.enum && prop.enum.length > 0) return 'wc-select';
  if (format === 'email' || nameContains(name, 'email')) return 'wc-input-email';
  if (format === 'date-time' || format === 'date') return 'wc-input-date';
  if (nameContains(name, 'phone') || nameContains(name, 'tel')) return 'wc-input-tel';
  if (['description', 'notes', 'comments', 'bio', 'summary', 'message', 'body', 'content', 'remarks', 'details']
    .some(t => nameContains(name, t))) return 'wc-textarea';
  if (type === 'integer') return 'wc-input-number';
  if (type === 'number') return 'wc-input-currency';
  if (type === 'string') return 'wc-input';
  return 'wc-input';
}

/**
 * Build a json_layout element node for a form control.
 */
function buildControlNode(prop, scopePrefix) {
  const controlType = inferPageControlType(prop);
  if (!controlType) return null;

  const scope = scopePrefix
    ? `#/$defs/${scopePrefix}/${prop.name}`
    : `#/properties/${prop.name}`;

  const node = {
    'data-id': uid(),
    type: controlType,
    label: getProper(prop.name),
    scope,
    css: 'col-1',
    required: prop.required || false,
    rules: [],
    elements: [],
  };

  // Add type-specific properties
  switch (controlType) {
    case 'wc-input':
    case 'wc-input-email':
    case 'wc-input-tel':
      node.minlength = '';
      node.maxlength = '';
      node.placeholder = '';
      node.is_readonly = false;
      node.is_disabled = false;
      node.is_required = prop.required || false;
      break;

    case 'wc-input-date':
      node.min = '';
      node.max = '';
      node.is_readonly = false;
      node.is_disabled = false;
      node.is_required = prop.required || false;
      break;

    case 'wc-input-number':
    case 'wc-input-currency':
      node.min = prop.minimum != null ? String(prop.minimum) : '';
      node.max = prop.maximum != null ? String(prop.maximum) : '';
      node.step = controlType === 'wc-input-number' ? '1' : '';
      node.is_readonly = false;
      node.is_disabled = false;
      node.is_required = prop.required || false;
      break;

    case 'wc-input-checkbox':
      node.css = 'col';
      node.is_toggle = true;
      node.is_readonly = false;
      node.is_disabled = false;
      node.is_required = prop.required || false;
      break;

    case 'wc-select':
      node.is_readonly = false;
      node.is_disabled = false;
      node.is_required = prop.required || false;
      // Add enum options as wc-option children
      if (prop.enum && prop.enum.length > 0) {
        node.elements = prop.enum.map(val => ({
          'data-id': uid(),
          type: 'wc-option',
          label: getProper(val),
          scope: '',
          css: '',
          required: false,
          rules: [],
          elements: [],
          value: val,
        }));
      }
      break;

    case 'wc-textarea':
      node.placeholder = '';
      node.rows = 5;
      node.is_readonly = false;
      node.is_disabled = false;
      node.is_required = prop.required || false;
      break;
  }

  return node;
}

/**
 * Build a json_layout element for a primitive array (tags) → wc-select-multiple.
 */
function buildPrimitiveArrayNode(prop) {
  return {
    'data-id': uid(),
    type: 'wc-select-multiple',
    label: getProper(prop.name),
    scope: `#/properties/${prop.name}`,
    css: 'col-1',
    required: prop.required || false,
    rules: [],
    elements: [],
    mode: 'chip',
    is_readonly: false,
    is_disabled: false,
    is_required: prop.required || false,
    allow_dynamic: true,
  };
}

// --- Edit Layout Generation ---

/**
 * Generate a json_layout array for an edit page.
 *
 * @param {Object} schema - Clean JSON Schema
 * @param {string} collectionName - Collection name
 * @param {string} routePrefix - 'v' or 'x'
 * @param {string} listSlug - Slug of the list page for breadcrumb back-link
 * @returns {Array} json_layout array
 */
export function generateEditPageLayout(schema, collectionName, routePrefix, listSlug) {
  const properName = getProper(collectionName);
  const properties = normalizeProperties(schema);
  const defs = schema.$defs || {};

  // Build breadcrumb label from schema.breadcrumb
  let breadcrumbLabel = `{{Record.${collectionName}}}`;
  if (schema.breadcrumb && schema.breadcrumb.length > 0) {
    breadcrumbLabel = schema.breadcrumb
      .map(item => `{{Record.${item.name}}}${item.suffix || ''}`)
      .join('');
  }

  // Build form controls from layout groups
  const formElements = buildEditFormElements(properties, defs);

  return [
    {
      'data-id': uid(),
      type: 'column',
      label: '',
      scope: '',
      css: 'flex-1 px-10 py-2',
      required: false,
      rules: [],
      elements: [
        // Breadcrumb
        {
          'data-id': uid(),
          type: 'wc-breadcrumb',
          label: 'wc-breadcrumb',
          scope: '',
          css: '',
          required: false,
          rules: [],
          elements: [
            {
              'data-id': uid(),
              type: 'wc-breadcrumb-item',
              label: '',
              scope: '',
              css: '',
              required: false,
              rules: [],
              elements: [],
              link: `/p${routePrefix}/home`,
            },
            {
              'data-id': uid(),
              type: 'wc-breadcrumb-item',
              label: properName,
              scope: '',
              css: '',
              required: false,
              rules: [],
              elements: [],
              link: `/p${routePrefix}/${listSlug}/list`,
            },
            {
              'data-id': uid(),
              type: 'wc-breadcrumb-item',
              label: breadcrumbLabel,
              scope: '',
              css: '',
              required: false,
              rules: [],
              elements: [],
            },
          ],
        },
        // Tab control
        {
          type: 'wc-tab',
          'data-id': uid(),
          label: '',
          scope: '',
          css: 'col-1 mt-2 mb-4',
          required: false,
          elements: [
            // General tab
            {
              type: 'wc-tab-item',
              label: 'General',
              'data-id': uid(),
              scope: '',
              css: 'active p-4',
              required: false,
              elements: [
                {
                  type: 'column',
                  'data-id': uid(),
                  elements: formElements,
                },
              ],
            },
            // Change Log tab
            {
              type: 'wc-tab-item',
              label: 'Change Log',
              'data-id': uid(),
              scope: '',
              css: 'p-4',
              required: false,
              elements: [],
            },
          ],
        },
      ],
    },
  ];
}

/**
 * Build form element nodes from inferred layout groups.
 */
function buildEditFormElements(properties, defs) {
  const groups = inferLayout(properties, defs);
  const elements = [];

  for (const group of groups) {
    switch (group.type) {
      case 'row': {
        const rowElements = [];
        for (const prop of group.fields) {
          if (isArrayOfPrimitives(prop)) {
            rowElements.push(buildPrimitiveArrayNode(prop));
          } else {
            const node = buildControlNode(prop, '');
            if (node) rowElements.push(node);
          }
        }
        if (rowElements.length > 0) {
          elements.push({
            type: 'row',
            'data-id': uid(),
            css: '',
            elements: rowElements,
          });
        }
        break;
      }

      case 'single': {
        const prop = group.fields[0];
        let node;
        if (isArrayOfPrimitives(prop)) {
          node = buildPrimitiveArrayNode(prop);
        } else {
          node = buildControlNode(prop, '');
        }
        if (node) {
          elements.push({
            type: 'row',
            'data-id': uid(),
            css: '',
            elements: [node],
          });
        }
        break;
      }

      case 'fieldset': {
        const defName = getDefName(group.prop);
        const subElements = buildFieldsetElements(group.subProperties, defName);
        elements.push({
          type: 'fieldset',
          label: getProper(group.prop.name),
          css: 'flex flex-col p-4 gap-4 border border-solid rounded-md primary-bg-border-color',
          'data-id': uid(),
          elements: subElements,
        });
        break;
      }

      case 'fieldset-card': {
        const defName = getDefName(group.prop);
        const itemElements = buildFieldsetElements(group.subProperties, defName);
        elements.push({
          type: 'fieldset',
          label: getProper(group.prop.name),
          css: 'flex flex-col p-4 gap-4 border border-solid rounded-md primary-bg-border-color',
          'data-id': uid(),
          elements: [
            {
              type: 'data-array',
              css: 'card-host flex flex-wrap gap-4',
              scope: `#/properties/${group.prop.name}`,
              'data-id': uid(),
              label: '',
              required: false,
              has_add_new: true,
              elements: [
                {
                  type: 'data-item',
                  css: 'card-item flex flex-col p-4 gap-4 xw-300 border border-solid rounded-md primary-border-color card relative primary-bg-image-gradient',
                  'data-id': uid(),
                  elements: itemElements,
                },
              ],
            },
          ],
        });
        break;
      }
    }
  }

  return elements;
}

/**
 * Build control elements for a fieldset (nested object) or array item.
 */
function buildFieldsetElements(subProperties, defName) {
  const elements = [];
  // Group sub-properties into rows using inference
  const groups = inferLayout(subProperties, {});

  for (const group of groups) {
    if (group.type === 'row' || group.type === 'single') {
      const fields = group.fields;
      const rowElements = [];
      for (const prop of fields) {
        const node = buildControlNode(prop, defName);
        if (node) rowElements.push(node);
      }
      if (rowElements.length > 0) {
        elements.push({
          type: 'row',
          'data-id': uid(),
          css: '',
          elements: rowElements,
        });
      }
    }
  }

  return elements;
}

// --- List Layout Generation ---

/**
 * Generate a json_layout array for a list page.
 *
 * @param {Object} schema - Clean JSON Schema
 * @param {string} collectionName - Collection name
 * @param {string} routePrefix - 'v' or 'x'
 * @returns {Array} json_layout array
 */
export function generateListPageLayout(schema, collectionName, routePrefix) {
  const properName = getProper(collectionName);
  const properties = normalizeProperties(schema);

  // Build tabulator columns from schema properties
  const columns = buildTabulatorColumns(properties);

  // Build sort string
  let initialSort = '';
  if (schema.sort && schema.sort.length > 0) {
    initialSort = JSON.stringify(schema.sort.map(s => ({ column: s.name, dir: s.dir })));
  }

  return [
    {
      'data-id': uid(),
      type: 'column',
      label: '',
      scope: '',
      css: 'flex-1 px-10 py-2',
      required: false,
      rules: [],
      elements: [
        // Breadcrumb
        {
          'data-id': uid(),
          type: 'wc-breadcrumb',
          label: 'wc-breadcrumb',
          scope: '',
          css: '',
          required: false,
          rules: [],
          elements: [
            {
              'data-id': uid(),
              type: 'wc-breadcrumb-item',
              label: '',
              scope: '',
              css: '',
              required: false,
              rules: [],
              elements: [],
              link: `/p${routePrefix}/home`,
            },
            {
              'data-id': uid(),
              type: 'wc-breadcrumb-item',
              label: properName,
              scope: '',
              css: '',
              required: false,
              rules: [],
              elements: [],
              link: '',
            },
          ],
        },
        // Tabulator
        {
          'data-id': uid(),
          type: 'wc-tabulator',
          label: 'wc-tabulator',
          scope: '',
          css: 'rounded w-full max-h-500',
          required: false,
          rules: [],
          elements: columns,
          ajax_url: `/api/${collectionName}`,
          ajax_params: '',
          ajax_params_map: '',
          filter_mode: 'remote',
          initial_filter: '',
          sort_mode: 'remote',
          initial_sort: initialSort,
          data_placeholder: 'No Data Available',
          row_context_menu: 'rowContextMenu',
          row_header: '',
          row_height: 40,
          row_formatter: '',
          row_click: '',
          row_selected: '',
          row_deselected: '',
          frozen_rows: null,
          pagination: true,
          pagination_size: 16,
          pagination_counter: 'rows',
          header_visible: true,
          movable_columns: true,
          resizable_columns: false,
          resizable_column_guide: false,
          movable_rows: true,
          resizable_rows: false,
          resizable_row_guide: false,
          selectable_rows: 'true',
          persistence: false,
          layout: 'fitColumns',
          col_field_formatter: '',
          group_by: '',
          responsive_layout: '',
          record_size: null,
        },
      ],
    },
  ];
}

/**
 * Build wc-tabulator-column nodes from schema properties.
 */
function buildTabulatorColumns(properties) {
  const columns = [];

  // Selection checkbox column
  columns.push({
    'data-id': uid(),
    type: 'wc-tabulator-column',
    label: 'wc-tabulator-column',
    scope: '',
    css: '',
    required: false,
    rules: [],
    elements: [],
    field: '',
    title: 'Actions',
    header_filter: '',
    header_filter_params: '',
    header_filter_placeholder: '',
    header_hoz_align: 'center',
    header_menu: 'headerMenu',
    header_sort: false,
    header_sort_starting_dir: '',
    header_sort_tristate: false,
    formatter: 'rowSelection',
    formatter_params: '',
    title_formatter: 'rowSelection',
    header_filter_func: '',
    visible: true,
    resizable: false,
    editable: false,
    frozen: false,
    responsive: false,
    tooltip: '',
    row_handle: false,
    html_output: '',
    print: false,
    clipboard: false,
    width: '45',
    width_grow: null,
    width_shrink: null,
    min_width: '',
    max_width: '',
    max_initial_width: '',
    top_calc: '',
    top_calc_params: '',
    bottom_calc: '',
    bottom_cal_params: '',
    editor: '',
    editor_params: '',
    sorter: '',
    sorter_params: '',
    hoz_align: 'center',
    vert_align: 'middle',
    cell_click: 'toggleSelect',
  });

  // Data columns
  let isFirstVisible = true;
  for (const prop of properties) {
    const col = inferListCol(prop, '', isFirstVisible);
    if (!col) continue;

    const isLink = isFirstVisible && col.visible;
    columns.push({
      'data-id': uid(),
      type: 'wc-tabulator-column',
      label: 'wc-tabulator-column',
      scope: '',
      css: '',
      required: false,
      rules: [],
      elements: [],
      field: prop.name,
      title: getProper(prop.name),
      header_filter: 'input',
      header_filter_params: '',
      header_filter_placeholder: '',
      header_hoz_align: '',
      header_menu: isLink ? 'headerMenu' : '',
      header_sort: false,
      header_sort_starting_dir: '',
      header_sort_tristate: false,
      formatter: isLink ? 'link' : (prop.type === 'boolean' ? 'tickCross' : ''),
      formatter_params: isLink
        ? '{"page_id": "{{Page.RouteNextPageSlug}}", "url": "pageFormatter"}'
        : '',
      title_formatter: '',
      header_filter_func: isLink ? 'starts' : '',
      visible: col.visible,
      resizable: true,
      editable: false,
      frozen: false,
      responsive: false,
      tooltip: '',
      row_handle: false,
      html_output: '',
      print: false,
      clipboard: false,
      width: '',
      width_grow: null,
      width_shrink: null,
      min_width: '',
      max_width: '',
      max_initial_width: '',
      top_calc: '',
      top_calc_params: '',
      bottom_calc: '',
      bottom_cal_params: '',
      editor: '',
      editor_params: '',
      sorter: '',
      sorter_params: '',
      hoz_align: '',
      vert_align: '',
      cell_click: '',
    });

    if (col.visible && isFirstVisible) {
      isFirstVisible = false;
    }
  }

  return columns;
}

// --- Internal helpers ---

function resolveType(prop) {
  if (prop.type) return prop.type;
  if (prop.anyOf) {
    const typed = prop.anyOf.find(s => s.type && s.format);
    if (typed) return typed.type;
    const first = prop.anyOf.find(s => s.type);
    if (first) return first.type;
  }
  return null;
}

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

function getDefName(prop) {
  if (prop.$ref) return prop.$ref.replace('#/$defs/', '');
  if (prop.items && prop.items.$ref) return prop.items.$ref.replace('#/$defs/', '');
  return prop.name;
}
