import { useState, type CSSProperties } from "react";
import { DAYS, type Day } from "../data/itinerary";
import { placeById } from "../data/places";
import { photosFor } from "../data/photos";
import { Photo } from "../components/Photo";
import { Zoomable } from "../components/Zoomable";
import { useReveal } from "../lib/useReveal";
import type { Photo as PhotoType } from "../types/photo";

const REGION: Record<string, string> = {
  mathura: "braj",
  vrindavan: "braj",
  delhi: "braj",
  dehradun: "garhwal",
  haridwar: "garhwal",
  rishikesh: "garhwal",
  devprayag: "garhwal",
  auli: "garhwal",
  kausani: "kumaon",
  almora: "kumaon",
  kainchi: "kumaon",
  nainital: "kumaon",
};

function dayPhoto(d: Day): PhotoType | null {
  const nth = DAYS.filter((x) => x.place === d.place && x.day < d.day).length;
  const pics = photosFor(d.place);
  return pics.length ? pics[nth % pics.length] : null;
}

function DayCard({ d, filter, onOpenGuide }: { d: Day; filter: string; onOpenGuide: (placeId: string) => void }) {
  const [ref, shown] = useReveal<HTMLLIElement>();
  const p = placeById(d.place);
  const pic = dayPhoto(d);
  const region = REGION[d.place];
  const style = { "--hue": p?.hue } as CSSProperties;

  return (
    <li
      ref={ref}
      className={`day reveal${shown ? " in" : ""}`}
      data-region={region}
      style={style}
      hidden={filter !== "all" && region !== filter}
    >
      <div className="day-num" aria-hidden="true">
        {String(d.day).padStart(2, "0")}
      </div>
      <div className={`day-card${pic ? " has-photo" : ""}`}>
        <details className="day-body" open={d.day <= 2}>
          <summary>
            <span className="day-label">{`Day ${d.day} · ${d.route}`}</span>
            <h3>{d.title}</h3>
            <div className="day-meta">
              <span>
                <b>Travel </b>
                {d.travel}
              </span>
              <span>
                <b>Stay </b>
                {d.stay}
              </span>
            </div>
            <p className="day-teaser">
              <b>Taste </b>
              {d.taste}
            </p>
          </summary>
          <ol className="day-plan">
            {d.plan.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
          <p className="day-taste">
            <b>Taste: </b>
            {d.taste}
          </p>
          <button type="button" className="link-btn" onClick={() => onOpenGuide(d.place)}>
            {`Open ${p?.name} guide →`}
          </button>
        </details>
        {pic ? (
          <figure className="day-photo">
            <Zoomable p={pic} list={photosFor(d.place)}>
              <Photo p={pic} />
            </Zoomable>
            <figcaption>{pic.caption}</figcaption>
          </figure>
        ) : null}
      </div>
    </li>
  );
}

export function Days({ onOpenGuide }: { onOpenGuide: (placeId: string) => void }) {
  const [filter, setFilter] = useState("all");

  return (
    <section className="section days" id="days" aria-labelledby="days-heading">
      <div className="section-head">
        <p className="eyebrow">Itinerary</p>
        <h2 id="days-heading">Fifteen days, day by day</h2>
        <div className="filter" role="group" aria-label="Filter days by region" id="regionFilter">
          <button type="button" data-region="all" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All
          </button>
          <button type="button" data-region="braj" aria-pressed={filter === "braj"} onClick={() => setFilter("braj")}>
            Braj & Delhi
          </button>
          <button
            type="button"
            data-region="garhwal"
            aria-pressed={filter === "garhwal"}
            onClick={() => setFilter("garhwal")}
          >
            Garhwal
          </button>
          <button
            type="button"
            data-region="kumaon"
            aria-pressed={filter === "kumaon"}
            onClick={() => setFilter("kumaon")}
          >
            Kumaon
          </button>
        </div>
      </div>
      <ol className="timeline" id="timeline">
        {DAYS.map((d) => (
          <DayCard key={d.day} d={d} filter={filter} onOpenGuide={onOpenGuide} />
        ))}
      </ol>
    </section>
  );
}
