import { useEffect, useState } from "react";
import { reduceMotion } from "../lib/motion";

const STATS: [string, string][] = [
  ["15", "days"],
  ["12", "destinations"],
  ["~1,600", "km by road"],
  ["5", "sacred confluences"],
  ["3,050 m", "highest point"],
];

function Stat({ value, label }: { value: string; label: string }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduceMotion) return;

    const match = value.match(/^(\D*)([\d,]+)(.*)$/);
    if (!match) return;

    const [, pre, num, post] = match;
    const target = Number(num.replace(/,/g, ""));
    const start = performance.now();
    let rafId: number;

    const step = (now: number) => {
      const t = Math.min((now - start) / 1600, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(pre + Math.round(target * eased).toLocaleString("en-IN") + post);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [value]);

  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd data-value={value}>{shown}</dd>
    </div>
  );
}

export function Stats() {
  return (
    <dl className="stats" id="stats">
      {STATS.map(([value, label]) => (
        <Stat key={label} value={value} label={label} />
      ))}
    </dl>
  );
}
