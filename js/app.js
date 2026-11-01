import { el, formatInr } from "./dom.js";
import { PLACES, placeById } from "../src/data/places.js";
import { DAYS } from "../src/data/itinerary.js";
import { SEASONS, BUDGET, PACKING, ALERTS, SOURCES } from "../src/data/planning.js";
import { renderRouteMap, renderAltitude } from "./charts.js";
import { initGallery, photo, zoomable } from "./gallery.js";
import { photosFor } from "../src/data/photos.js";

const REGION = {
  mathura: "braj", vrindavan: "braj", delhi: "braj",
  dehradun: "garhwal", haridwar: "garhwal", rishikesh: "garhwal", devprayag: "garhwal", auli: "garhwal",
  kausani: "kumaon", almora: "kumaon", kainchi: "kumaon", nainital: "kumaon",
};

const LENSES = [
  { key: "culture", label: "Culture" },
  { key: "food", label: "Food" },
  { key: "geography", label: "Geography" },
  { key: "shopping", label: "Shopping" },
  { key: "activities", label: "Things to do" },
];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- storage (per-viewer convenience only) ---------- */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable: ignore */ } },
};

/* ---------- theme ---------- */
function initTheme() {
  const saved = store.get("theme");
  if (saved) document.documentElement.dataset.theme = saved;
  document.getElementById("themeToggle").addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });
}

/* ---------- hero ---------- */
function renderStats() {
  const stats = [
    ["15", "days"], ["12", "destinations"], ["~1,600", "km by road"], ["5", "sacred confluences"], ["3,050 m", "highest point"],
  ];
  document.getElementById("stats").append(
    ...stats.map(([v, k]) => el("div", { class: "stat" }, [el("dt", {}, k), el("dd", { "data-value": v }, v)]))
  );
  if (!reduceMotion) document.querySelectorAll(".stat dd").forEach(countUp);
}

/* Count the numeric part of "~1,600" / "3,050 m" up from zero, keeping prefix and suffix. */
function countUp(node) {
  const match = node.dataset.value.match(/^(\D*)([\d,]+)(.*)$/);
  if (!match) return;
  const [, pre, num, post] = match;
  const target = Number(num.replace(/,/g, ""));
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / 1600, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    node.textContent = pre + Math.round(target * eased).toLocaleString("en-IN") + post;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initParallax() {
  if (reduceMotion) return;
  const layers = [...document.querySelectorAll(".hero-art [data-depth]")];
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const yScroll = Math.min(window.scrollY, 900);
      layers.forEach((l) => { l.style.transform = `translateY(${yScroll * Number(l.dataset.depth)}px)`; });
      document.getElementById("topbar").classList.toggle("scrolled", window.scrollY > 40);
      ticking = false;
    });
  }, { passive: true });
}

/* ---------- timeline ---------- */
function dayPhoto(d) {
  const nth = DAYS.filter((x) => x.place === d.place && x.day < d.day).length;
  const pics = photosFor(d.place);
  return pics.length ? pics[nth % pics.length] : null;
}

function dayCard(d) {
  const p = placeById(d.place);
  const pic = dayPhoto(d);
  return el("li", { class: "day reveal", "data-region": REGION[d.place], style: `--hue:${p.hue}` }, [
    el("div", { class: "day-num", "aria-hidden": "true" }, String(d.day).padStart(2, "0")),
    el("div", { class: `day-card${pic ? " has-photo" : ""}` }, [
      el("details", { class: "day-body", open: d.day <= 2 ? "" : undefined }, [
        el("summary", {}, [
          el("span", { class: "day-label" }, `Day ${d.day} · ${d.route}`),
          el("h3", {}, d.title),
          el("div", { class: "day-meta" }, [
            el("span", {}, [el("b", {}, "Travel "), d.travel]),
            el("span", {}, [el("b", {}, "Stay "), d.stay]),
          ]),
          el("p", { class: "day-teaser" }, [el("b", {}, "Taste "), d.taste]),
        ]),
        el("ol", { class: "day-plan" }, d.plan.map((s) => el("li", {}, s))),
        el("p", { class: "day-taste" }, [el("b", {}, "Taste: "), d.taste]),
        el("button", { type: "button", class: "link-btn", onclick: () => selectPlace(d.place, true) }, `Open ${p.name} guide →`),
      ]),
      pic ? el("figure", { class: "day-photo" }, [zoomable(pic, photosFor(d.place), photo(pic)), el("figcaption", {}, pic.caption)]) : null,
    ]),
  ]);
}

function renderTimeline() {
  const list = document.getElementById("timeline");
  list.append(...DAYS.map(dayCard));
  const buttons = [...document.querySelectorAll("#regionFilter button")];
  buttons.forEach((b) => b.addEventListener("click", () => {
    buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    list.querySelectorAll(".day").forEach((li) => {
      li.hidden = b.dataset.region !== "all" && li.dataset.region !== b.dataset.region;
    });
  }));
}

/* ---------- destination explorer ---------- */
let current = { place: PLACES[0].id, lens: "culture" };

function panelFor(p, lens) {
  const lensTabs = el("div", { class: "lens-tabs", role: "tablist", "aria-label": "Topic" },
    LENSES.map((l) => el("button", {
      type: "button", role: "tab", "aria-selected": String(l.key === lens),
      onclick: () => selectPlace(p.id, false, l.key),
    }, l.label)));

  const pics = photosFor(p.id);
  return [
    el("header", { class: `panel-head${pics.length ? " has-photo" : ""}` }, [
      pics.length ? photo(pics[0], { cls: "panel-bg" }) : null,
      el("p", { class: "panel-region" }, `${p.region} · ${p.altitude.toLocaleString("en-IN")} m`),
      el("h3", {}, [p.name, " ", el("span", { class: "native", lang: "hi" }, p.native)]),
      el("p", { class: "panel-tagline" }, p.tagline),
    ]),
    el("p", { class: "panel-intro" }, p.intro),
    pics.length > 1 ? el("div", { class: "panel-gallery" }, pics.map((ph) =>
      el("figure", {}, [zoomable(ph, pics, photo(ph)), el("figcaption", {}, ph.caption)]))) : null,
    lensTabs,
    el("ul", { class: "lens-list", role: "tabpanel" }, p[lens].map((t) => el("li", {}, t))),
    p.tips.length ? el("div", { class: "panel-tips" }, [el("b", {}, "Good to know"), el("ul", {}, p.tips.map((t) => el("li", {}, t)))]) : null,
  ];
}

function selectPlace(id, scroll = false, lens = current.lens) {
  current = { place: id, lens };
  const p = placeById(id);
  const panel = document.getElementById("placePanel");
  panel.style.setProperty("--hue", p.hue);
  panel.replaceChildren(...panelFor(p, lens).filter(Boolean));
  panel.classList.remove("swap");
  void panel.offsetWidth; // restart the enter animation
  panel.classList.add("swap");
  document.querySelectorAll("#placeList [role=tab]").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.id === id));
  });
  if (scroll) document.getElementById("places").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}

function renderExplorer() {
  const list = document.getElementById("placeList");
  list.append(...PLACES.map((p, i) => el("button", {
    type: "button", role: "tab", "data-id": p.id, style: `--hue:${p.hue}`,
    "aria-selected": "false", onclick: () => selectPlace(p.id),
  }, [el("span", { class: "pl-num" }, String(i + 1).padStart(2, "0")), el("span", { class: "pl-name" }, p.name), el("span", { class: "pl-alt" }, `${p.altitude.toLocaleString("en-IN")} m`)])));
  selectPlace(current.place);
}

/* ---------- planning ---------- */
function renderPlanning() {
  document.getElementById("season").append(...SEASONS.map((s) =>
    el("li", { class: `season-${s.verdict}` }, [el("b", {}, s.months), el("span", { class: "chip" }, s.verdict), el("p", {}, s.note)])));

  const low = BUDGET.reduce((a, b) => a + b.low, 0);
  const high = BUDGET.reduce((a, b) => a + b.high, 0);
  document.getElementById("budget").append(
    el("p", { class: "budget-total" }, `${formatInr(low)} – ${formatInr(high)}`),
    el("ul", { class: "budget-rows" }, BUDGET.map((b) => el("li", {}, [
      el("span", {}, b.item),
      el("span", { class: "bar", style: `--w:${(b.high / high) * 100}%` }),
      el("b", {}, `${formatInr(b.low)}–${formatInr(b.high)}`),
    ]))),
    el("p", { class: "fine" }, "Estimates only; shopping excluded. Flight prices swing with season."),
  );

  document.getElementById("packing").append(...PACKING.map((g) => el("div", {}, [
    el("h4", {}, g.group),
    ...g.items.map((it) => el("label", {}, [el("input", { type: "checkbox" }), " ", it])),
  ])));

  document.getElementById("alerts").append(...ALERTS.map((a) => el("li", {}, [el("span", { class: "chip" }, a.tag), a.text])));

  document.getElementById("sources").append(...SOURCES.map(([label, href]) =>
    el("li", {}, el("a", { href, target: "_blank", rel: "noopener noreferrer" }, label))));
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((n) => n.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -10% 0px" });
  items.forEach((n) => io.observe(n));
}

function init() {
  initTheme();
  renderStats();
  initParallax();
  const caption = document.getElementById("mapCaption");
  renderRouteMap(document.getElementById("routeMap"), (id) => selectPlace(id, true), (t) => { caption.textContent = t; });
  renderAltitude(document.getElementById("altChart"));
  renderTimeline();
  renderExplorer();
  renderPlanning();
  initGallery();
  initReveal();
}

init();
