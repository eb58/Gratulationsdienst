import { state } from './state.js';

const dirtyFormIds = new Set(["citizen-form", "member-form", "street-form", "sender-form", "template-form", "quittung-form", "user-form"]);
let pendingDirtyLeave = null;

const controlKey = control => control.name || control.dataset.bind || control.id;
const controlValue = control => control.type === "checkbox" || control.type === "radio" ? control.checked : control.value;
const formId = form => form.getAttribute("id") || "";
const formSignature = form => JSON.stringify([...form.elements]
  .filter(control => !control.disabled && controlKey(control))
  .map(control => [controlKey(control), controlValue(control)]));
const trackedForms = () => [...document.querySelectorAll("form")].filter(form => dirtyFormIds.has(formId(form)));
const hasInitialValues = form => typeof form.dataset.initialValues === "string";
const markDirtyState = form => {
  form.dataset.dirty = String(!hasInitialValues(form) || form.dataset.initialValues !== formSignature(form));
};
const refreshDirtyForms = () => trackedForms().forEach(markDirtyState);
const dirtyForms = () => trackedForms().filter(form => form.dataset.dirty === "true");
const trackedFormFor = target => {
  const form = target.closest?.("form");
  return form && dirtyFormIds.has(formId(form)) ? form : null;
};

export const rememberDirtyFormBaselines = (root = document) => {
  root.querySelectorAll("form").forEach(form => {
    if (!dirtyFormIds.has(formId(form))) return;
    form.dataset.initialValues = formSignature(form);
    form.dataset.dirty = "false";
  });
};

export const trackDirtyFormChange = event => {
  const form = trackedFormFor(event.target);
  if (!form) return false;
  markDirtyState(form);
  return true;
};

export const hasDirtyForm = () => {
  refreshDirtyForms();
  return dirtyForms().length > 0;
};
export const requestDirtyFormLeave = proceed => {
  if (!hasDirtyForm()) {
    proceed();
    return true;
  }
  pendingDirtyLeave = proceed;
  state.dialog = {
    type: "dirty-form",
    title: "Ungespeicherte Änderungen",
    message: "Die Maske enthält Änderungen, die noch nicht gespeichert sind. Änderungen verwerfen und fortfahren?",
    confirmLabel: "Änderungen verwerfen",
    confirmAction: "confirm-discard-dirty"
  };
  state.focusTarget = ".dialog-box [data-autofocus]";
  return false;
};
export const confirmDirtyFormLeave = () => {
  const proceed = pendingDirtyLeave;
  pendingDirtyLeave = null;
  state.dialog = null;
  return proceed;
};
export const cancelDirtyFormLeave = () => { pendingDirtyLeave = null; };
