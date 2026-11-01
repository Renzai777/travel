import { Fragment } from "react";
import { nightAltitudes, pathFrom } from "./geo";

const W = 640;
const H = 300;
const L = 48;
const R = 16;
const T = 24;
const B = 36;
const MAX = 3200;

const GRID_VALUES = [0, 1000, 2000, 3000];

const data = nightAltitudes();
const x = (i: number): number => L + (i / (data.length - 1)) * (W - L - R);
const y = (a: number): number => T + (1 - a / MAX) * (H - T - B);

const pts: [number, number][] = data.map((d, i) => [x(i), y(d.alt)]);
const lineD = pathFrom(pts);
const areaD = `${lineD} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;

const peakIndex = data.reduce((m, d, i) => (d.alt > data[m].alt ? i : m), 0);
const peakDay = data[peakIndex];
const peakX = x(peakIndex) + 8;
const peakY = y(peakDay.alt) - 10;
const peakText = `${peakDay.name} ${peakDay.alt.toLocaleString("en-IN")} m`;

export function AltitudeChart() {
  return (
    <svg id="altChart" viewBox="0 0 640 300" role="img" aria-label="Altitude profile across 15 days">
      <defs>
        <linearGradient id="altFill" x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} style={{ stopColor: "var(--accent-2)", stopOpacity: 0.45 }} />
          <stop offset={1} style={{ stopColor: "var(--accent-2)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {GRID_VALUES.map((a) => (
        <Fragment key={a}>
          <line x1={L} x2={W - R} y1={y(a)} y2={y(a)} className="alt-grid" />
          <text x={L - 8} y={y(a) + 4} textAnchor="end" className="alt-axis">
            {a.toLocaleString("en-IN")}
          </text>
        </Fragment>
      ))}
      <path d={areaD} fill="url(#altFill)" />
      <path d={lineD} className="alt-line" />
      {data.map((d, i) => (
        <Fragment key={d.day}>
          <text x={x(i)} y={H - 12} textAnchor="middle" className="alt-axis">
            {d.day}
          </text>
          <circle cx={x(i)} cy={y(d.alt)} r={4.5} className="alt-dot" tabIndex={0}>
            <title>{`Day ${d.day} · ${d.name} · ${d.alt.toLocaleString("en-IN")} m`}</title>
          </circle>
        </Fragment>
      ))}
      <text x={peakX} y={peakY} className="alt-peak">
        {peakText}
      </text>
    </svg>
  );
}
