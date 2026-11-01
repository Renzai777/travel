import type { CSSProperties } from "react";
import { PLACES, placeById } from "../data/places";
import { photosFor } from "../data/photos";
import { Photo } from "../components/Photo";
import { Zoomable } from "../components/Zoomable";
import type { Lens } from "../types/photo";

const LENSES: { key: Lens; label: string }[] = [
  { key: "culture", label: "Culture" },
  { key: "food", label: "Food" },
  { key: "geography", label: "Geography" },
  { key: "shopping", label: "Shopping" },
  { key: "activities", label: "Things to do" },
];

export function Places({
  place,
  lens,
  onSelect,
}: {
  place: string;
  lens: Lens;
  onSelect: (id: string, opts?: { lens?: Lens }) => void;
}) {
  const p = placeById(place) ?? PLACES[0];
  const pics = photosFor(p.id);

  return (
    <section className="section places" id="places" aria-labelledby="places-heading">
      <div className="section-head">
        <p className="eyebrow">Destination guide</p>
        <h2 id="places-heading">Twelve places, five ways in</h2>
        <p>Pick a place, then choose a lens: culture, food, geography, shopping or things to do.</p>
      </div>
      <div className="explorer">
        <div className="place-list" role="tablist" aria-label="Destinations" id="placeList">
          {PLACES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              data-id={item.id}
              style={{ "--hue": item.hue } as CSSProperties}
              aria-selected={item.id === place}
              onClick={() => onSelect(item.id)}
            >
              <span className="pl-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pl-name">{item.name}</span>
              <span className="pl-alt">{`${item.altitude.toLocaleString("en-IN")} m`}</span>
            </button>
          ))}
        </div>
        <article
          className="place-panel swap"
          id="placePanel"
          aria-live="polite"
          style={{ "--hue": p.hue } as CSSProperties}
          key={`${place}-${lens}`}
        >
          <header className={`panel-head${pics.length ? " has-photo" : ""}`}>
            {pics.length ? <Photo p={pics[0]} className="panel-bg" /> : null}
            <p className="panel-region">{`${p.region} · ${p.altitude.toLocaleString("en-IN")} m`}</p>
            <h3>
              {p.name}{" "}
              <span className="native" lang="hi">
                {p.native}
              </span>
            </h3>
            <p className="panel-tagline">{p.tagline}</p>
          </header>
          <p className="panel-intro">{p.intro}</p>
          {pics.length > 1 ? (
            <div className="panel-gallery">
              {pics.map((ph) => (
                <figure key={ph.key}>
                  <Zoomable p={ph} list={pics}>
                    <Photo p={ph} />
                  </Zoomable>
                  <figcaption>{ph.caption}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}
          <div className="lens-tabs" role="tablist" aria-label="Topic">
            {LENSES.map((l) => (
              <button
                key={l.key}
                type="button"
                role="tab"
                aria-selected={l.key === lens}
                onClick={() => onSelect(place, { lens: l.key })}
              >
                {l.label}
              </button>
            ))}
          </div>
          <ul className="lens-list" role="tabpanel">
            {p[lens].map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
          {p.tips.length ? (
            <div className="panel-tips">
              <b>Good to know</b>
              <ul>
                {p.tips.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
