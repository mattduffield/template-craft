# CLAUDE.md

This file provides guidance to Claude Code when working with the TemplateCraft project.

## Quick Reference

- **Project Type**: Inference-based code generator (clean JSON Schema → Go Kart templates)
- **Language**: JavaScript ES6+
- **Build Tool**: esbuild (with .njk loader plugin)
- **Template Engine**: Nunjucks with custom delimiters (`[% %]`, `[= =]`)
- **Output**: IIFE bundle exposing `window.templateCraft`

## Build Commands

```bash
npm run build
python3 -m http.server 3017  # View at http://localhost:3017/views/
```

## Architecture

TemplateCraft takes a **clean JSON Schema** (from LiteSpec `parseDSL()`, no UI annotations) and generates complete `_template_builder` MongoDB documents by **inferring** the best Wave CSS components, layout, and structure from schema types and constraints.

### Pipeline
```
LiteSpec DSL → parseDSL() → JSON Schema → templateCraft.generate(schema) → _template_builder records
```

### Key Design Principle
**Schema describes data, the generator decides presentation.** No `uiType`, `uiGroup`, `uiLookup`, or other UI annotations in the schema. The inference layer examines `type`, `format`, `enum`, `pattern`, `$ref`, property names, and constraints to deterministically choose the right component and layout.

### What It Generates
- **List templates**: wc-table-skeleton, wc-tabulator with inferred columns
- **Edit templates**: wc-article-skeleton, wc-form, wc-tab, controls inferred from schema
- **Code tabs**: runGet, runPut, runPost, runDelete, runList with array detection
- **Field rules**: Deterministic rules from allOf conditionals (visible, required, clearWhenHidden)
- **Complete _template_builder documents**: All properties set (slug, schema, depends, route_prefix, etc.)

### Control Inference Rules
| Schema Signal | Inferred Component |
|---|---|
| `format: "uuid"` or ObjectId pattern | `input` hidden |
| `type: "boolean"` | `wc-input` checkbox toggle-switch |
| `string` + `enum` (2-3 values) | `wc-input` radio |
| `string` + `enum` (4+ values) | `wc-select` dropdown |
| `format: "email"` or name has "email" | `wc-input` type=email |
| `format: "date-time"` | `wc-input` type=date |
| Name has "phone"/"tel" | `wc-input` type=tel |
| Name has "description"/"notes"/"bio" | `wc-textarea` |
| `type: "integer"` | `wc-input` type=number |
| `type: "number"` / Decimal128 | `wc-input` type=currency |
| `array` + `items.type: "string"` | `wc-select` chip mode |
| `array` + `items.$ref` | fieldset-card with add/delete |
| `object` + `$ref` | fieldset wrapping |
| System fields (`_id`, `created_*`, `modified_*`) | Skipped (meta_fields handles) |

### Layout Inference
- Name-pair heuristics group related fields into responsive grid rows
- `first_name` + `last_name`, `email` + `phone`, address fields together
- Responsive grid: `grid-1 sm:grid-2 md:grid-N gap-2`

## Source Structure

```
src/
  index.js                      — Main entry, generate() API
  template-engine.js            — Nunjucks env with custom delimiters
  inference/
    infer-control.js            — Schema → Wave CSS component inference
    infer-layout.js             — Property grouping into grid rows
    infer-list-col.js           — List column inference
    index.js                    — Barrel export
  generators/
    edit.js                     — Edit template content generation
    edit-form.js                — Recursive form generation using inference
    list.js                     — List template content generation
    code-tab.js                 — Server-side JS code generation
    field-rules.js              — Field rules from allOf conditionals
  layouts/
    wrappers.js                 — Card and tab-control wrappers
  templates/
    register.js                 — Imports and registers all .njk files
    controls/                   — ~23 control templates (wc-input-*, wc-select-*, etc.)
    list-cols/                  — 4 list column templates
    generators/                 — edit-content, list-content, code-edit, code-list
    edit-form/                  — fieldset, fieldset-card, fieldset-table, default-array
    layouts/                    — card/tab-control prefix/suffix
  utils/
    naming.js                   — getProper, getSuffix, toSlug, quoteStrings
    schema-helpers.js           — findProperty, normalizeProperties, resolveRef, findArrayTypes
```

## Nunjucks Custom Delimiters

Pongo2 uses `{% %}` and `{{ }}`. To avoid conflicts, Nunjucks is configured with:
- `[% %]` — Nunjucks block tags (if, for, etc.)
- `[= =]` — Nunjucks variable interpolation
- `{% %}` and `{{ }}` — pass through as literal Pongo2 output in .njk files

## Usage

```js
const templates = templateCraft.generate(schema, {
  collectionName: 'client',  // optional if schema.title is set
  routePrefix: 'x',          // 'x' (protected) or 'v' (public)
  templateType: 'tab-control', // or 'card'
  functions: '',              // optional schema-level JS functions
  includeList: true,
  includeEdit: true,
});
```

## Knowledge Bases

- **Go Kart**: `/Users/matthewduffield/Documents/_learn/go-kart/docs/go-kart-knowledge.json`
- **Wave CSS**: `/Users/matthewduffield/Documents/_dev/wave-css/docs/wave-css-knowledge.json`
- **LiteSpec**: `/Users/matthewduffield/Documents/_dev/lite-spec/docs/lite-spec-knowledge.json`

## Input Schema Format

Standard JSON Schema from LiteSpec `parseDSL()` (without `includeUI=true`):
```json
{
  "title": "Client",
  "type": "object",
  "properties": { ... },
  "required": ["first_name", "last_name"],
  "$defs": { "Address": { ... }, "Member": { ... } },
  "allOf": [ { "if": ..., "then": ... } ],
  "sort": [{ "name": "modified_date", "dir": "desc" }],
  "breadcrumb": [{ "name": "first_name", "suffix": " " }]
}
```
