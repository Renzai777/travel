/* Photo-driven pieces: hero slideshow, postcard filmstrip, food grid, lightbox, credits. */
import { el } from "./dom.js";
import { PHOTOS, photosFor } from "./photos.js";
import { PLACES } from "./places.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const byKey = (key) => PHOTOS.find((p) => p.key === key);

const HERO_KEYS = ["hero-1", "haridwar-1", "vrindavan-1", "hero-2", "nainital-2", "kausani-1", "rishikesh-1"];
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

/* ---------- hero slideshow ---------- */
function initHero() {
  const slides = HERO_KEYS.map(byKey).filter(Boolean);
  const host = document.getElementById("heroSlides");
  const caption = document.getElementById("heroCaption");
  const frames = slides.map((p, i) => el("div", { class: `slide${i === 0 ? " on" : ""}` }, photo(p, { eager: i === 0 })));
  host.append(...frames);
  caption.textContent = slides[0]?.caption ?? "";
  if (reduceMotion || slides.length < 2) return;
  let i = 0;
  setInterval(() => {
    frames[i].classList.remove("on");
    i = (i + 1) % frames.length;
    frames[i].classList.add("on");
    caption.textContent = slides[i].caption;
  }, 6500);
}

/* ---------- filmstrip of postcards ---------- */
function initFilmstrip() {
  const picks = PLACES.map((pl) => photosFor(pl.id)[0] && { p: photosFor(pl.id)[0], place: pl }).filter(Boolean);
  const all = picks.map((x) => x.p);
  const card = ({ p, place }, i, hidden) => el("figure", {
    class: "postcard", style: `--hue:${place.hue}; --tilt:${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg`,
    "aria-hidden": hidden ? "true" : undefined,
  }, [
    hidden ? photo(p) : zoomable(p, all, photo(p)),
    el("figcaption", {}, [el("b", {}, place.name), el("span", {}, place.native)]),
    el("span", { class: "stamp", "aria-hidden": "true" }, `${place.altitude.toLocaleString("en-IN")} m`),
  ]);
  // Two copies make the loop seamless; the second is decorative only.
  document.getElementById("filmTrack").append(
    ...picks.map((x, i) => card(x, i, false)),
    ...picks.map((x, i) => card(x, i, true)),
  );
}

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
  initHero();
  initFilmstrip();
  initFood();
  initCredits();
}
