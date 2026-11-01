/* Tiny DOM builders. All text goes through textContent, so content is never parsed as HTML. */
const SVG_NS = "http://www.w3.org/2000/svg";

function build(node, attrs, children) {
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, String(value));
  });
  [].concat(children ?? []).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

/** @param {string} tag @param {Record<string, unknown>} [attrs] @param {unknown} [children] */
export const el = (tag, attrs, children) => build(document.createElement(tag), attrs, children);

/** @param {string} tag @param {Record<string, unknown>} [attrs] @param {unknown} [children] */
export const svg = (tag, attrs, children) => build(document.createElementNS(SVG_NS, tag), attrs, children);

export const formatInr = (n) => "₹" + n.toLocaleString("en-IN");
