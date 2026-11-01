import { useEffect, useState, type MouseEvent } from "react";
import { useTheme } from "../theme/useTheme";

export function Topbar({ onNavigate }: { onNavigate: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const { toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    let rafId: number | null = null;

    const update = () => {
      setScrolled(window.scrollY > 40);
      ticking = false;
    };

    update();

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
    <header className={`topbar${scrolled ? " scrolled" : ""}`} id="topbar">
      <a className="brand" href="/" onClick={onNavigate}>
        Plains <span>→</span> Peaks
      </a>
      <nav aria-label="Main navigation">
        <a href="/route" onClick={onNavigate}>
          Route
        </a>
        <a href="/days" onClick={onNavigate}>
          Day by day
        </a>
        <a href="/places" onClick={onNavigate}>
          Places
        </a>
        <a href="/food" onClick={onNavigate}>
          Food
        </a>
        <a href="/plan" onClick={onNavigate}>
          Plan
        </a>
      </nav>
      <button className="theme-toggle" id="themeToggle" type="button" aria-label="Toggle dark mode" onClick={toggle}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </header>
  );
}
