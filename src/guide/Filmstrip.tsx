import type { CSSProperties } from "react";
import { PLACES } from "../data/places";
import { photosFor } from "../data/photos";
import { Photo } from "../components/Photo";
import { Zoomable } from "../components/Zoomable";
import type { Photo as PhotoType, Place } from "../types/photo";

type Pick = { p: PhotoType; place: Place };

const picks: Pick[] = PLACES.flatMap((place) => {
  const p = photosFor(place.id)[0];
  return p ? [{ p, place }] : [];
});
const all = picks.map((x) => x.p);

function Postcard({ p, place, i, decorative }: Pick & { i: number; decorative: boolean }) {
  const style = { "--hue": place.hue, "--tilt": `${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg` } as CSSProperties;
  return (
    <figure className="postcard" style={style} aria-hidden={decorative ? "true" : undefined}>
      {decorative ? (
        <Photo p={p} />
      ) : (
        <Zoomable p={p} list={all}>
          <Photo p={p} />
        </Zoomable>
      )}
      <figcaption>
        <b>{place.name}</b>
        <span>{place.native}</span>
      </figcaption>
      <span className="stamp" aria-hidden="true">{`${place.altitude.toLocaleString("en-IN")} m`}</span>
    </figure>
  );
}

export function Filmstrip() {
  return (
    <section className="filmstrip" aria-label="Postcards from the route">
      <div className="film-track" id="filmTrack">
        {/* Two copies make the marquee loop seamless; the second is decorative only. */}
        {picks.map((x, i) => (
          <Postcard key={`a-${x.place.id}`} {...x} i={i} decorative={false} />
        ))}
        {picks.map((x, i) => (
          <Postcard key={`b-${x.place.id}`} {...x} i={i} decorative />
        ))}
      </div>
    </section>
  );
}
