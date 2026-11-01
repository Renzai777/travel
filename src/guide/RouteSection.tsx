import { useState } from "react";
import { RouteMap } from "./charts/RouteMap";
import { AltitudeChart } from "./charts/AltitudeChart";

export function RouteSection({ onSelectPlace }: { onSelectPlace: (id: string) => void }) {
  const [caption, setCaption] = useState("Pune lies ~1,400 km south — you fly in to Delhi.");

  return (
    <section className="section route" id="route" aria-labelledby="route-heading">
      <div className="section-head">
        <p className="eyebrow">The shape of the trip</p>
        <h2 id="route-heading">One long climb north</h2>
        <p>
          Hover or tap a stop. The map is drawn from real coordinates; the line below traces how high you'll be each
          night.
        </p>
      </div>
      <div className="route-grid">
        <figure className="map-card">
          <RouteMap onSelect={(id) => onSelectPlace(id)} onHover={setCaption} />
          <figcaption id="mapCaption">{caption}</figcaption>
        </figure>
        <figure className="alt-card">
          <figcaption>
            <strong>Altitude by night</strong>
            <span>metres above sea level</span>
          </figcaption>
          <AltitudeChart />
        </figure>
      </div>
      <aside className="prayag" aria-labelledby="prayag-heading">
        <h3 id="prayag-heading">You'll pass all five Panch Prayag</h3>
        <ol>
          <li>
            <b>Devprayag</b> Bhagirathi + Alaknanda
          </li>
          <li>
            <b>Rudraprayag</b> + Mandakini
          </li>
          <li>
            <b>Karnaprayag</b> + Pindar
          </li>
          <li>
            <b>Nandprayag</b> + Nandakini
          </li>
          <li>
            <b>Vishnuprayag</b> + Dhauliganga
          </li>
        </ol>
      </aside>
    </section>
  );
}
