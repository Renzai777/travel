import { placeById } from "../../data/places";
import { DAYS } from "../../data/itinerary";

export const MAP = {
  w: 520,
  h: 560,
  pad: 48,
  lat: [27.2, 30.8] as [number, number],
  lon: [76.9, 80.0] as [number, number],
};

export const project = ([lat, lon]: [number, number] | readonly [number, number]): [number, number] => [
  MAP.pad + ((lon - MAP.lon[0]) / (MAP.lon[1] - MAP.lon[0])) * (MAP.w - MAP.pad * 2),
  MAP.pad + ((MAP.lat[1] - lat) / (MAP.lat[1] - MAP.lat[0])) * (MAP.h - MAP.pad * 2),
];

export const WAYPOINTS: Record<string, [number, number]> = {
  rudraprayag: [30.28, 78.98],
  karnaprayag: [30.26, 79.22],
  joshimath: [30.55, 79.56],
  gwaldam: [30.0, 79.56],
};

export const ROUTE: string[] = [
  "delhi",
  "mathura",
  "vrindavan",
  "delhi",
  "dehradun",
  "haridwar",
  "rishikesh",
  "devprayag",
  "rudraprayag",
  "karnaprayag",
  "joshimath",
  "auli",
  "joshimath",
  "karnaprayag",
  "gwaldam",
  "kausani",
  "almora",
  "kainchi",
  "nainital",
];

export type River = {
  name: string;
  pts: [number, number][];
};

export const RIVERS: River[] = [
  {
    name: "Yamuna",
    pts: [
      [30.4, 77.6],
      [29.4, 77.2],
      [28.61, 77.25],
      [27.9, 77.55],
      [27.49, 77.72],
    ],
  },
  {
    name: "Ganga",
    pts: [
      [30.15, 78.6],
      [30.09, 78.3],
      [29.95, 78.18],
      [29.4, 78.1],
      [28.6, 78.4],
    ],
  },
  {
    name: "Alaknanda",
    pts: [
      [30.6, 79.5],
      [30.55, 79.56],
      [30.26, 79.22],
      [30.28, 78.98],
      [30.15, 78.6],
    ],
  },
];

/* Label placement for crowded clusters: [dx, dy, anchor]. */
export const LABEL: Record<string, [number, number, "start" | "middle" | "end"]> = {
  mathura: [12, 14, "start"],
  vrindavan: [12, -4, "start"],
  delhi: [-12, 4, "end"],
  dehradun: [-12, -6, "end"],
  haridwar: [-12, 10, "end"],
  rishikesh: [2, -12, "middle"],
  devprayag: [0, 22, "middle"],
  auli: [0, -16, "middle"],
  kausani: [12, 4, "start"],
  almora: [12, 8, "start"],
  kainchi: [12, 12, "start"],
  nainital: [-12, 10, "end"],
};

export const pathFrom = (pts: [number, number][]): string =>
  pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

export const coordOf = (id: string): [number, number] => {
  const wp = WAYPOINTS[id];
  if (wp) return wp;
  const p = placeById(id);
  if (!p) throw new Error(`Unknown place or waypoint: ${id}`);
  return p.coords;
};

/* Night altitude: the day's place, except where you sleep somewhere else. */
export const NIGHT_OVERRIDE: Record<number, { alt: number; name: string }> = {
  9: { alt: 895, name: "Rudraprayag" },
  15: { alt: 560, name: "Pune" },
};

export const nightAltitudes = (): { day: number; alt: number; name: string }[] =>
  DAYS.map((d) => {
    const o = NIGHT_OVERRIDE[d.day];
    const p = placeById(d.place);
    if (!p) throw new Error(`Unknown place: ${d.place}`);
    return { day: d.day, alt: o ? o.alt : p.altitude, name: o ? o.name : p.name };
  });
