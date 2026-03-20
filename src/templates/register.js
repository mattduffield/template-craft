/**
 * Template registry — imports all .njk template files and registers them
 * with the template engine. This module must be imported before any
 * render() calls are made.
 */

import { registerTemplate } from '../template-engine.js';

// --- Layouts ---
import cardPrefix from './layouts/card-prefix.njk';
import cardSuffix from './layouts/card-suffix.njk';
import tabControlPrefix from './layouts/tab-control-prefix.njk';
import tabControlSuffix from './layouts/tab-control-suffix.njk';
registerTemplate('layouts/card-prefix.njk', cardPrefix);
registerTemplate('layouts/card-suffix.njk', cardSuffix);
registerTemplate('layouts/tab-control-prefix.njk', tabControlPrefix);
registerTemplate('layouts/tab-control-suffix.njk', tabControlSuffix);

// --- List Columns ---
import listColString from './list-cols/string.njk';
import listColStringInvisible from './list-cols/string-invisible.njk';
import listColBoolean from './list-cols/boolean.njk';
import listColBooleanInvisible from './list-cols/boolean-invisible.njk';
registerTemplate('list-cols/string.njk', listColString);
registerTemplate('list-cols/string-invisible.njk', listColStringInvisible);
registerTemplate('list-cols/boolean.njk', listColBoolean);
registerTemplate('list-cols/boolean-invisible.njk', listColBooleanInvisible);

// --- Code Tabs ---
import codeEdit from './generators/code-edit.njk';
import codeList from './generators/code-list.njk';
registerTemplate('generators/code-edit.njk', codeEdit);
registerTemplate('generators/code-list.njk', codeList);

// --- Controls ---
import wcInputRadioEnum from './controls/wc-input-radio-enum.njk';
import wcInputRadio from './controls/wc-input-radio.njk';
import wcInputCheckbox from './controls/wc-input-checkbox.njk';
import wcInputEmail from './controls/wc-input-email.njk';
import wcInputTel from './controls/wc-input-tel.njk';
import wcInputBoolean from './controls/wc-input-boolean.njk';
import wcInputNumber from './controls/wc-input-number.njk';
import wcInputString from './controls/wc-input-string.njk';
import inputHidden from './controls/input-hidden.njk';
import inputBoolean from './controls/input-boolean.njk';
import inputString from './controls/input-string.njk';
import wcSelectMultipleCollection from './controls/wc-select-multiple-collection.njk';
import wcSelectMultipleScreenCollection from './controls/wc-select-multiple-screen-collection.njk';
import wcSelectMultipleDynamic from './controls/wc-select-multiple-dynamic.njk';
import wcSelectMultiple from './controls/wc-select-multiple.njk';
import wcSelectEnum from './controls/wc-select-enum.njk';
import wcSelectScreenCollection from './controls/wc-select-screen-collection.njk';
import wcSelectLookup from './controls/wc-select-lookup.njk';
import selectControl from './controls/select.njk';
import wcTextarea from './controls/wc-textarea.njk';
import defaultControl from './controls/default.njk';
registerTemplate('controls/wc-input-radio-enum.njk', wcInputRadioEnum);
registerTemplate('controls/wc-input-radio.njk', wcInputRadio);
registerTemplate('controls/wc-input-checkbox.njk', wcInputCheckbox);
registerTemplate('controls/wc-input-email.njk', wcInputEmail);
registerTemplate('controls/wc-input-tel.njk', wcInputTel);
registerTemplate('controls/wc-input-boolean.njk', wcInputBoolean);
registerTemplate('controls/wc-input-number.njk', wcInputNumber);
registerTemplate('controls/wc-input-string.njk', wcInputString);
registerTemplate('controls/input-hidden.njk', inputHidden);
registerTemplate('controls/input-boolean.njk', inputBoolean);
registerTemplate('controls/input-string.njk', inputString);
registerTemplate('controls/wc-select-multiple-collection.njk', wcSelectMultipleCollection);
registerTemplate('controls/wc-select-multiple-screen-collection.njk', wcSelectMultipleScreenCollection);
registerTemplate('controls/wc-select-multiple-dynamic.njk', wcSelectMultipleDynamic);
registerTemplate('controls/wc-select-multiple.njk', wcSelectMultiple);
registerTemplate('controls/wc-select-enum.njk', wcSelectEnum);
registerTemplate('controls/wc-select-screen-collection.njk', wcSelectScreenCollection);
registerTemplate('controls/wc-select-lookup.njk', wcSelectLookup);
registerTemplate('controls/select.njk', selectControl);
registerTemplate('controls/wc-textarea.njk', wcTextarea);
registerTemplate('controls/default.njk', defaultControl);

import wcInputDate from './controls/wc-input-date.njk';
import wcInputInteger from './controls/wc-input-integer.njk';
registerTemplate('controls/wc-input-date.njk', wcInputDate);
registerTemplate('controls/wc-input-integer.njk', wcInputInteger);

// --- Edit Form ---
import fieldset from './edit-form/fieldset.njk';
import fieldsetCard from './edit-form/fieldset-card.njk';
import fieldsetTable from './edit-form/fieldset-table.njk';
import defaultArray from './edit-form/default-array.njk';
registerTemplate('edit-form/fieldset.njk', fieldset);
registerTemplate('edit-form/fieldset-card.njk', fieldsetCard);
registerTemplate('edit-form/fieldset-table.njk', fieldsetTable);
registerTemplate('edit-form/default-array.njk', defaultArray);

// --- Generators ---
import editContent from './generators/edit-content.njk';
import listContent from './generators/list-content.njk';
registerTemplate('generators/edit-content.njk', editContent);
registerTemplate('generators/list-content.njk', listContent);
