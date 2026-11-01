/* Legacy photo pieces still rendered outside React: food grid, lightbox, credits (moving in E1-S4). */
import { el } from "./dom.js";
import { PHOTOS, photosFor } from "../src/data/photos.js";

const FOOD_NOTES = {
  "food-1": "Old Delhi · Haridwar",
  "food-2": "Chandni Chowk",
  "food-3": "Paranthe Wali Gali",
  "food-4": "Dehradun's Tibetan colony",
  "food-5": "Mathura's famous sweet",
  "food-6": "Almora's signature",
  "food-7": "Every dhaba, every hill",
  "food-8": "Braj kulhad lassi",
};

/** Photo element with warm, unified grading and a graceful fallback. */
export function photo(p, { eager = false, cls = "" } = {}) {
  const img = el("img", {
    src: p.src, alt: p.caption, class: `ph ${cls}`.trim(),
    loading: eager ? "eager" : "lazy", decoding: "async",
    fetchpriority: eager ? "high" : undefined,
  });
  img.addEventListener("error", () => img.classList.add("ph-missing"), { once: true });
  return img;
}

/* ---------- lightbox ---------- */
let lbList = [];
let lbIndex = 0;

function showLightbox(i) {
  lbIndex = (i + lbList.length) % lbList.length;
  const p = lbList[lbIndex];
  const img = document.getElementById("lightboxImg");
  img.src = p.src;
  img.alt = p.caption;
  document.getElementById("lightboxCap").replaceChildren(
    el("b", {}, p.caption), ` — ${p.credit}, ${p.license} · `,
    el("a", { href: p.source, target: "_blank", rel: "noopener noreferrer" }, "source"),
  );
}

export function openLightbox(list, index) {
  lbList = list;
  showLightbox(index);
  const dlg = document.getElementById("lightbox");
  if (!dlg.open) dlg.showModal();
}

function initLightbox() {
  const dlg = document.getElementById("lightbox");
  document.getElementById("lbClose").addEventListener("click", () => dlg.close());
  document.getElementById("lbPrev").addEventListener("click", () => showLightbox(lbIndex - 1));
  document.getElementById("lbNext").addEventListener("click", () => showLightbox(lbIndex + 1));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showLightbox(lbIndex - 1);
    if (e.key === "ArrowRight") showLightbox(lbIndex + 1);
  });
}

/** Wrap a photo in a button that opens the lightbox on the given list. */
export const zoomable = (p, list, child) =>
  el("button", { type: "button", class: "zoom", "aria-label": `View photo: ${p.caption}`,
    onclick: () => openLightbox(list, list.indexOf(p)) }, child);

/* ---------- food ---------- */
function initFood() {
  const foods = photosFor("food");
  document.getElementById("foodGrid").append(...foods.map((p, i) => el("figure", {
    class: `food-card reveal f${i + 1}`, style: `--tilt:${(i % 2 ? 1.5 : -1.5)}deg; --d:${(i % 4) * 80}ms`,
  }, [
    zoomable(p, foods, photo(p)),
    el("figcaption", {}, [el("b", {}, p.caption), el("span", {}, FOOD_NOTES[p.key] || "")]),
  ])));
}

/* ---------- credits ---------- */
function initCredits() {
  document.getElementById("credits").append(...PHOTOS.map((p) => el("li", {}, [
    el("a", { href: p.source, target: "_blank", rel: "noopener noreferrer" }, p.caption),
    ` — ${p.credit} (${p.license})`,
  ])));
}

export function initGallery() {
  initLightbox();
  initFood();
  initCredits();
}
