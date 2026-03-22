# Template Craft
This is an inference-based code generator that converts clean JSON Schema into Go Kart `_template_builder` and `_page` documents.

## Demo
[Demo Site](https://mattduffield.github.io/template-craft/views/)

## Documentation
- [TemplateCraft Knowledge Base](docs/template-craft-knowledge.json)

## Build
Execute the following command to build the bundler.

```bash
npm run build
```

## Viewing Components
Execute the following to view the test page locally.

```bash
python3 -m http.server 3017
```

## Usage

### Generate `_template_builder` documents
```js
const templates = templateCraft.generate(schema, {
  collectionName: 'client',
  routePrefix: 'v',
  templateType: 'tab-control',
});
```

### Generate `_page` documents
```js
const pages = templateCraft.generatePages(schema, {
  collectionName: 'client',
  routePrefix: 'v',
});
```

## Example Schema Input
```
def Address object {
  street: string @required
  city: string @required
  state: string @required
  postal_code: string @required
}
def Member array {
  first_name: string @required
  middle_initial: string @minLength(1) @maxLength(1)
  last_name: string
}
model Client object {
  first_name: string @required @minLength(2) @maxLength(50)
  last_name: string @required @minLength(2) @maxLength(50)
  email: string @email
  phone_number: string
  gender: string @required @enum(male,female)
  age: integer @minimum(14) @maximum(130)
  is_active: boolean @required @default(true)
  tags: array(string) @uniqueItems
  address: object @ref(Address) @required
  household_members: array @ref(Member) @uniqueItems
  created_by: string
  created_date: string @format(date-time)
  modified_by: string
  modified_date: string @format(date-time)

  @if(modified_by: @minLength(1) @maxLength(99), @required(modified_date))

  @sort(modified_date, desc)
  @breadcrumb(first_name, " ")
  @breadcrumb(last_name)
}
```

## Inference Rules
The generator infers Wave CSS components from schema types — no UI annotations needed.

| Schema Signal | Component |
|---|---|
| `format: "uuid"` or ObjectId pattern | hidden input |
| `type: "boolean"` | checkbox toggle-switch |
| `string` + `enum` (2-3 values) | radio buttons |
| `string` + `enum` (4+ values) | select dropdown |
| `format: "email"` or name has "email" | email input |
| `format: "date-time"` | date input |
| Name has "phone" or "tel" | tel input |
| Name has "description", "notes", "bio" | textarea |
| `type: "integer"` | number input |
| `type: "number"` | currency input |
| `array` + `items.type: "string"` | chip select |
| `array` + `items.$ref` | fieldset-card |
| `object` + `$ref` | fieldset |
| System fields (`_id`, `created_*`, `modified_*`) | skipped |

## Output Targets

| | `_template_builder` | `_page` |
|---|---|---|
| Function | `generate()` | `generatePages()` |
| Content | HTML (Pongo2 markup) | `json_layout` + `json_schema` |
| Routes | `/v/`, `/x/` | `/pv/`, `/px/` |
| Base templates | `base`, `partial-base` | `page_base`, `page_partial_base` |
| Navigation | `Template.RouteNextTemplateSlug` | `Page.RouteNextPageSlug` |
| Code tab | Same (runGet, runPut, runPost, runDelete) | Same |
| Field rules | Same (from allOf conditionals) | Same |
