import type { CSSProperties } from "react";
import { PLACES } from "../../data/places";
import { reduceMotion } from "../../lib/motion";
import { LABEL, RIVERS, ROUTE, WAYPOINTS, coordOf, pathFrom, project } from "./geo";

const riverPaths = RIVERS.map((r) => ({
  name: r.name,
  d: pathFrom(r.pts.map(project)),
}));

const routePts = ROUTE.map((id) => project(coordOf(id)));
const routeD = pathFrom(routePts);

const waypointCircles = Object.values(WAYPOINTS).map((c) => project(c));

const placeStops = PLACES.map((p, i) => {
  const [x, y] = project(p.coords);
  const [dx, dy, anchor] = LABEL[p.id] || [10, 4, "start"];
  return {
    place: p,
    i,
    x,
    y,
    labelX: x + dx,
    labelY: y + dy,
    anchor,
    labelText: p.name.replace(" & Baijnath", ""),
    ariaLabel: `${p.name}, ${p.altitude} metres. Open guide.`,
    hoverText: `${p.name} · ${p.altitude.toLocaleString("en-IN")} m — ${p.tagline}`,
  };
});

const [puneX, puneY] = project([27.25, 77.1]);
const [northX, northY] = project([30.75, 79.9]);

export function RouteMap({ onSelect, onHover }: { onSelect: (id: string) => void; onHover: (text: string) => void }) {
  return (
    <svg id="routeMap" viewBox="0 0 520 560" role="img" aria-label="Route map of the trip">
      {riverPaths.map((r) => (
        <path key={r.name} d={r.d} className="map-river">
          <title>{r.name}</title>
        </path>
      ))}
      <path d={routeD} className="map-route" />
      <path d={routeD} className="map-route-dash" />
      {!reduceMotion && (
        <g className="map-plane" aria-hidden="true">
          <circle r={11} className="map-plane-glow" />
          <path d="M9 0 L-5 -6 L-2 0 L-5 6 Z M-1 -1 L-6 -9 L-4 -9 L2 -1 Z M-1 1 L-6 9 L-4 9 L2 1 Z" />
          <animateMotion dur="26s" repeatCount="indefinite" rotate="auto" path={routeD} />
        </g>
      )}
      {waypointCircles.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} className="map-waypoint" />
      ))}
      {placeStops.map((stop) => (
        <g
          key={stop.place.id}
          className="map-stop"
          tabIndex={0}
          role="button"
          aria-label={stop.ariaLabel}
          style={{ "--stop": stop.place.hue, "--i": stop.i } as CSSProperties}
          onClick={() => onSelect(stop.place.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(stop.place.id);
            }
          }}
          onMouseEnter={() => onHover(stop.hoverText)}
          onFocus={() => onHover(stop.hoverText)}
        >
          <circle cx={stop.x} cy={stop.y} r={13} className="map-halo" />
          <circle cx={stop.x} cy={stop.y} r={6} className="map-dot" />
          <text x={stop.labelX} y={stop.labelY} textAnchor={stop.anchor} className="map-label">
            {stop.labelText}
          </text>
        </g>
      ))}
      <text x={puneX} y={puneY + 10} className="map-note">
        ↓ Pune ~1,400 km
      </text>
      <text x={northX} y={northY} className="map-note" textAnchor="end">
        N ↑
      </text>
    </svg>
  );
}
