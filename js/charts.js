/* Route map (projected from real lat/lon) and the nightly altitude profile. */
import { svg } from "./dom.js";
import { PLACES, placeById } from "./places.js";
import { DAYS } from "./itinerary.js";

const MAP = { w: 520, h: 560, pad: 48, lat: [27.2, 30.8], lon: [76.9, 80.0] };

const project = ([lat, lon]) => [
  MAP.pad + ((lon - MAP.lon[0]) / (MAP.lon[1] - MAP.lon[0])) * (MAP.w - MAP.pad * 2),
  MAP.pad + ((MAP.lat[1] - lat) / (MAP.lat[1] - MAP.lat[0])) * (MAP.h - MAP.pad * 2),
];

const WAYPOINTS = {
  rudraprayag: [30.28, 78.98],
  karnaprayag: [30.26, 79.22],
  joshimath: [30.55, 79.56],
  gwaldam: [30.0, 79.56],
};

const ROUTE = [
  "delhi", "mathura", "vrindavan", "delhi", "dehradun", "haridwar", "rishikesh", "devprayag",
  "rudraprayag", "karnaprayag", "joshimath", "auli", "joshimath", "karnaprayag", "gwaldam",
  "kausani", "almora", "kainchi", "nainital",
];

const RIVERS = [
  { name: "Yamuna", pts: [[30.4, 77.6], [29.4, 77.2], [28.61, 77.25], [27.9, 77.55], [27.49, 77.72]] },
  { name: "Ganga", pts: [[30.15, 78.6], [30.09, 78.3], [29.95, 78.18], [29.4, 78.1], [28.6, 78.4]] },
  { name: "Alaknanda", pts: [[30.6, 79.5], [30.55, 79.56], [30.26, 79.22], [30.28, 78.98], [30.15, 78.6]] },
];

/* Label placement for crowded clusters: [dx, dy, anchor]. */
const LABEL = {
  mathura: [12, 14, "start"], vrindavan: [12, -4, "start"], delhi: [-12, 4, "end"],
  dehradun: [-12, -6, "end"], haridwar: [-12, 10, "end"], rishikesh: [2, -12, "middle"],
  devprayag: [0, 22, "middle"], auli: [0, -16, "middle"], kausani: [12, 4, "start"],
  almora: [12, 8, "start"], kainchi: [12, 12, "start"], nainital: [-12, 10, "end"],
};

const pathFrom = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

/* A small plane that loops along the whole route (skipped for reduced motion). */
function addTraveller(root, d) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.append(svg("g", { class: "map-plane", "aria-hidden": "true" }, [
    svg("circle", { r: 11, class: "map-plane-glow" }),
    svg("path", { d: "M9 0 L-5 -6 L-2 0 L-5 6 Z M-1 -1 L-6 -9 L-4 -9 L2 -1 Z M-1 1 L-6 9 L-4 9 L2 1 Z" }),
    svg("animateMotion", { dur: "26s", repeatCount: "indefinite", rotate: "auto", path: d }),
  ]));
}

/** @param {SVGSVGElement} root @param {(id: string) => void} onSelect @param {(text: string) => void} onHover */
export function renderRouteMap(root, onSelect, onHover) {
  const coordOf = (id) => WAYPOINTS[id] || placeById(id).coords;
  const routePts = ROUTE.map((id) => project(coordOf(id)));

  RIVERS.forEach((r) => {
    root.append(svg("path", { d: pathFrom(r.pts.map(project)), class: "map-river" }, svg("title", {}, r.name)));
  });
  root.append(svg("path", { d: pathFrom(routePts), class: "map-route" }));
  root.append(svg("path", { d: pathFrom(routePts), class: "map-route-dash" }));
  addTraveller(root, pathFrom(routePts));

  Object.values(WAYPOINTS).forEach((c) => {
    const [x, y] = project(c);
    root.append(svg("circle", { cx: x, cy: y, r: 2.5, class: "map-waypoint" }));
  });

  PLACES.forEach((p, i) => {
    const [x, y] = project(p.coords);
    const [dx, dy, anchor] = LABEL[p.id] || [10, 4, "start"];
    const g = svg("g", {
      class: "map-stop", tabindex: 0, role: "button",
      "aria-label": `${p.name}, ${p.altitude} metres. Open guide.`,
      onclick: () => onSelect(p.id),
      onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(p.id)),
      onmouseenter: () => onHover(`${p.name} · ${p.altitude.toLocaleString("en-IN")} m — ${p.tagline}`),
      onfocus: () => onHover(`${p.name} · ${p.altitude.toLocaleString("en-IN")} m — ${p.tagline}`),
      style: `--stop:${p.hue}; --i:${i}`,
    }, [
      svg("circle", { cx: x, cy: y, r: 13, class: "map-halo" }),
      svg("circle", { cx: x, cy: y, r: 6, class: "map-dot" }),
      svg("text", { x: x + dx, y: y + dy, "text-anchor": anchor, class: "map-label" }, p.name.replace(" & Baijnath", "")),
    ]);
    root.append(g);
  });

  const [px, py] = project([27.25, 77.1]);
  root.append(svg("text", { x: px, y: py + 10, class: "map-note" }, "↓ Pune ~1,400 km"));
  const [nx, ny] = project([30.75, 79.9]);
  root.append(svg("text", { x: nx, y: ny, class: "map-note", "text-anchor": "end" }, "N ↑"));
}

/* Night altitude: the day's place, except where you sleep somewhere else. */
const NIGHT_OVERRIDE = { 9: { alt: 895, name: "Rudraprayag" }, 15: { alt: 560, name: "Pune" } };

export const nightAltitudes = () =>
  DAYS.map((d) => {
    const o = NIGHT_OVERRIDE[d.day];
    const p = placeById(d.place);
    return { day: d.day, alt: o ? o.alt : p.altitude, name: o ? o.name : p.name };
  });

/** @param {SVGSVGElement} root */
export function renderAltitude(root) {
  const W = 640, H = 300, L = 48, R = 16, T = 24, B = 36, MAX = 3200;
  const data = nightAltitudes();
  const x = (i) => L + (i / (data.length - 1)) * (W - L - R);
  const y = (a) => T + (1 - a / MAX) * (H - T - B);

  root.append(svg("defs", {}, svg("linearGradient", { id: "altFill", x1: 0, y1: 0, x2: 0, y2: 1 }, [
    svg("stop", { offset: 0, style: "stop-color:var(--accent-2);stop-opacity:0.45" }),
    svg("stop", { offset: 1, style: "stop-color:var(--accent-2);stop-opacity:0" }),
  ])));

  [0, 1000, 2000, 3000].forEach((a) => {
    root.append(svg("line", { x1: L, x2: W - R, y1: y(a), y2: y(a), class: "alt-grid" }));
    root.append(svg("text", { x: L - 8, y: y(a) + 4, "text-anchor": "end", class: "alt-axis" }, a.toLocaleString("en-IN")));
  });

  const pts = data.map((d, i) => [x(i), y(d.alt)]);
  const line = pathFrom(pts);
  root.append(svg("path", { d: `${line} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`, fill: "url(#altFill)" }));
  root.append(svg("path", { d: line, class: "alt-line" }));

  data.forEach((d, i) => {
    root.append(svg("text", { x: x(i), y: H - 12, "text-anchor": "middle", class: "alt-axis" }, d.day));
    root.append(svg("circle", { cx: x(i), cy: y(d.alt), r: 4.5, class: "alt-dot", tabindex: 0 },
      svg("title", {}, `Day ${d.day} · ${d.name} · ${d.alt.toLocaleString("en-IN")} m`)));
  });

  const peak = data.reduce((m, d, i) => (d.alt > data[m].alt ? i : m), 0);
  root.append(svg("text", { x: x(peak) + 8, y: y(data[peak].alt) - 10, class: "alt-peak" },
    `${data[peak].name} ${data[peak].alt.toLocaleString("en-IN")} m`));
}
