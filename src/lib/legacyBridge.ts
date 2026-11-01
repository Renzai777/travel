// Temporary bridge to the legacy explorer in js/app.js; removed in E1-S4.
export function selectPlace(id: string, scroll = false): void {
  window.dispatchEvent(new CustomEvent("place:select", { detail: { id, scroll } }));
}
