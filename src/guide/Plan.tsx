import type { CSSProperties } from "react";
import { SEASONS, BUDGET, PACKING, ALERTS } from "../data/planning";
import { formatInr } from "../lib/format";

export function Plan() {
  const low = BUDGET.reduce((a, b) => a + b.low, 0);
  const high = BUDGET.reduce((a, b) => a + b.high, 0);

  return (
    <section className="section plan" id="plan" aria-labelledby="plan-heading">
      <div className="section-head">
        <p className="eyebrow">Before you go</p>
        <h2 id="plan-heading">Plan it right</h2>
      </div>
      <div className="bento">
        <article className="tile tile-season">
          <h3>When to go</h3>
          <ul className="season" id="season">
            {SEASONS.map((s) => (
              <li key={s.months} className={`season-${s.verdict}`}>
                <b>{s.months}</b>
                <span className="chip">{s.verdict}</span>
                <p>{s.note}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="tile tile-budget">
          <h3>
            Rough budget <small>per person, 15 days, mid-range, two sharing</small>
          </h3>
          <div id="budget">
            <p className="budget-total">{`${formatInr(low)} – ${formatInr(high)}`}</p>
            <ul className="budget-rows">
              {BUDGET.map((b) => (
                <li key={b.item}>
                  <span>{b.item}</span>
                  <span className="bar" style={{ "--w": `${(b.high / high) * 100}%` } as CSSProperties} />
                  <b>{`${formatInr(b.low)}–${formatInr(b.high)}`}</b>
                </li>
              ))}
            </ul>
            <p className="fine">Estimates only; shopping excluded. Flight prices swing with season.</p>
          </div>
        </article>
        <article className="tile tile-pack">
          <h3>Pack for three climates</h3>
          <div className="checklist" id="packing">
            {PACKING.map((g) => (
              <div key={g.group}>
                <h4>{g.group}</h4>
                {g.items.map((it) => (
                  <label key={it}>
                    <input type="checkbox" /> {it}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </article>
        <article className="tile tile-alerts">
          <h3>
            Latest on the ground <small>researched Oct 2026</small>
          </h3>
          <ul className="alerts" id="alerts">
            {ALERTS.map((a) => (
              <li key={a.tag}>
                <span className="chip">{a.tag}</span>
                {a.text}
              </li>
            ))}
          </ul>
        </article>
        <article className="tile tile-etiquette">
          <h3>Temple &amp; hill etiquette</h3>
          <ul>
            <li>Shoes off, shoulders covered, and ask before photographing people or deities.</li>
            <li>Haridwar, Rishikesh and the Braj temple towns are vegetarian and alcohol-free.</li>
            <li>Never drive hill roads after dark; landslide-prone in monsoon (Jul–Sep).</li>
            <li>Carry cash — ATMs thin out beyond Rudraprayag and networks drop in valleys.</li>
            <li>
              Say <em>“Radhe Radhe”</em> in Braj and <em>“Jai Badri Vishal”</em> in Garhwal.
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
