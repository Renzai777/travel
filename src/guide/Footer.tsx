import { SOURCES } from "../data/planning";
import { PHOTOS } from "../data/photos";

export function Footer() {
  return (
    <footer className="footer">
      <p className="footer-title">
        Plains <span>→</span> Peaks
      </p>
      <p>
        Information compiled from tourism boards, news reports and travel guides. Timings, fees and road conditions
        change — always confirm locally before travelling.
      </p>
      <details>
        <summary>Sources</summary>
        <ul className="sources" id="sources">
          {SOURCES.map(([label, href]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Photo credits</summary>
        <p>Photos from Wikimedia Commons, used under their stated licences.</p>
        <ul className="sources credits" id="credits">
          {PHOTOS.map((p) => (
            <li key={p.key}>
              <a href={p.source} target="_blank" rel="noopener noreferrer">
                {p.caption}
              </a>
              {` — ${p.credit} (${p.license})`}
            </li>
          ))}
        </ul>
      </details>
    </footer>
  );
}
