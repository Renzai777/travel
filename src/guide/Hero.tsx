import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Photo } from "../components/Photo";
import { Stats } from "./Stats";
import { reduceMotion } from "../lib/motion";
import { PHOTOS } from "../data/photos";
import type { Photo as PhotoType } from "../types/photo";

const HERO_KEYS = ["hero-1", "haridwar-1", "vrindavan-1", "hero-2", "nainital-2", "kausani-1", "rishikesh-1"];

const slides = HERO_KEYS.map((key) => PHOTOS.find((p) => p.key === key)).filter((p): p is PhotoType => Boolean(p));

export function Hero({ onNavigate }: { onNavigate: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const [active, setActive] = useState(0);
  const layer1Ref = useRef<SVGGElement>(null);
  const layer2Ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reduceMotion || slides.length < 2) return;

    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 6500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    let ticking = false;
    let rafId: number | null = null;

    const update = () => {
      const yScroll = Math.min(window.scrollY, 900);
      if (layer1Ref.current) {
        layer1Ref.current.style.transform = `translateY(${yScroll * 0.18}px)`;
      }
      if (layer2Ref.current) {
        layer2Ref.current.style.transform = `translateY(${yScroll * 0.3}px)`;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <section className="hero" id="top" aria-labelledby="hero-heading">
      <div className="hero-slides" id="heroSlides" aria-hidden="true">
        {slides.map((p, i) => (
          <div key={p.key} className={`slide${i === active ? " on" : ""}`}>
            <Photo p={p} eager={i === 0} />
          </div>
        ))}
      </div>
      <div className="hero-shade" aria-hidden="true" />
      <svg className="hero-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <g ref={layer1Ref} data-depth="0.18">
          <path
            style={{ fill: "var(--paper)" }}
            opacity=".35"
            d="M0 760 L120 700 L260 735 L400 650 L520 720 L650 670 L780 730 L930 650 L1080 720 L1200 680 L1320 730 L1440 690 L1440 900 L0 900Z"
          />
        </g>
        <g ref={layer2Ref} data-depth="0.3">
          <path
            style={{ fill: "var(--paper)" }}
            d="M0 830 C160 790 300 815 430 800 C600 780 700 830 860 808 C1010 788 1150 830 1290 806 C1360 795 1410 805 1440 812 L1440 900 L0 900Z"
          />
        </g>
      </svg>
      <div className="hero-copy">
        <p className="eyebrow">A 15-day journey · Pune to the Himalaya</p>
        <h1 id="hero-heading">
          From the Yamuna's plains
          <br />
          <em>to Nanda Devi's snows</em>
        </h1>
        <p className="lede">
          Krishna's Braj, Mughal Delhi, the Ganga's holy gateways, the Panch Prayag confluences, the meadows of Auli and
          the lakes of Kumaon — climbing from 170 m to 3,000 m.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary" href="/days" onClick={onNavigate}>
            See the 15 days
          </a>
          <a className="btn btn-ghost" href="/places" onClick={onNavigate}>
            Explore 12 places
          </a>
        </div>
      </div>
      <p className="hero-caption" id="heroCaption" aria-live="polite">
        {slides[active]?.caption}
      </p>
      <Stats />
    </section>
  );
}
