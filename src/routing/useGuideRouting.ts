import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { reduceMotion } from "../lib/motion";
import type { Lens } from "../types/photo";
import { SPY_IDS, parseLocation, pathFor, targetFor, titleFor, type Route, type SpyId } from "./routes";

const PADDING = 72; // must match `html { scroll-padding-top: 72px }` in css/styles.css
const ARRIVE_PX = 8;
const PROGRAMMATIC_TIMEOUT = 3000;
const SETTLE_MS = 2500;
const USER_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

// Module level, so React StrictMode's second effect run doesn't navigate twice.
let initialNavigationDone = false;

type Select = (id: string, opts?: { lens?: Lens }) => void;

function focusHeading(el: HTMLElement): void {
  const heading = el.querySelector<HTMLElement>("h1, h2");
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

function scrollElement(id: SpyId, el: HTMLElement, behavior: ScrollBehavior): void {
  if (id === "top") window.scrollTo({ top: 0, behavior });
  else el.scrollIntoView({ behavior, block: "start" });
}

/**
 * Clean section URLs (/plan, /places/auli) on top of the History API:
 * initial load + legacy hashes, link clicks, Back/Forward, and a scroll spy that keeps the URL in sync (replaceState only).
 */
export function useGuideRouting(place: string, select: Select) {
  const placeRef = useRef(place);
  const placeChosen = useRef(false);
  const programmatic = useRef<{ el: HTMLElement; until: number } | null>(null);
  const stopSettle = useRef<(() => void) | null>(null);

  useEffect(() => {
    placeRef.current = place;
  }, [place]);

  const scrollToId = useCallback((id: SpyId, opts: { smooth: boolean; settle: boolean; focus: boolean }) => {
    const el = document.getElementById(id);
    if (!el) return;
    stopSettle.current?.();
    stopSettle.current = null;
    programmatic.current = { el, until: performance.now() + PROGRAMMATIC_TIMEOUT };
    scrollElement(id, el, opts.smooth && !reduceMotion ? "smooth" : "auto");
    if (opts.focus) focusHeading(el);
    if (!opts.settle) return;
    // Fonts and lazy photos can shift the layout after the jump: re-align until it settles or the user takes over.
    const observer = new ResizeObserver(() => scrollElement(id, el, "auto"));
    observer.observe(document.body);
    const stop = (): void => {
      observer.disconnect();
      window.clearTimeout(timer);
      USER_EVENTS.forEach((type) => window.removeEventListener(type, stop));
    };
    const timer = window.setTimeout(stop, SETTLE_MS);
    USER_EVENTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    stopSettle.current = stop;
  }, []);

  const show = useCallback(
    (route: Route, opts: { smooth: boolean; settle: boolean }) => {
      if (route.kind === "place") {
        placeChosen.current = true;
        select(route.place);
      }
      document.title = titleFor(route);
      scrollToId(targetFor(route), { ...opts, focus: true });
    },
    [select, scrollToId],
  );

  // Initial load: canonicalize the URL, then scroll to its section once fonts are ready.
  useEffect(() => {
    history.scrollRestoration = "manual";
    if (initialNavigationDone) return;
    initialNavigationDone = true;
    const route = parseLocation(location.pathname, location.hash);
    if (route.kind === "reserved") return;
    const canonical = pathFor(route) + location.search;
    if (canonical !== location.pathname + location.search + location.hash)
      history.replaceState(history.state, "", canonical);
    if (route.kind === "top" || route.kind === "unknown") {
      document.title = titleFor(route);
      return;
    }
    void document.fonts.ready.then(() => requestAnimationFrame(() => show(route, { smooth: false, settle: true })));
  }, [show]);

  // Back / Forward.
  useEffect(() => {
    const onPop = (): void => {
      const route = parseLocation(location.pathname, location.hash);
      if (route.kind !== "reserved") show(route, { smooth: false, settle: true });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [show]);

  // Scroll spy: keep the URL on the section in view (replaceState, never push).
  useEffect(() => {
    let frame = 0;
    const cancelProgrammatic = (): void => {
      programmatic.current = null;
    };
    const spy = (): void => {
      if (parseLocation(location.pathname).kind === "reserved") return;
      const pending = programmatic.current;
      if (pending) {
        const top = pending.el.getBoundingClientRect().top;
        const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        const arrived =
          Math.abs(top - PADDING) <= ARRIVE_PX ||
          (pending.el.id === "top" && window.scrollY <= 1) ||
          (atEnd && top > PADDING); // the target can't reach the top because the page ends
        if (!arrived && performance.now() < pending.until) return;
        programmatic.current = null;
      }
      const line = window.innerHeight * 0.45;
      let active: SpyId = "top";
      for (const id of SPY_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) active = id;
      }
      const route: Route =
        active === "top"
          ? { kind: "top" }
          : active === "places" && placeChosen.current
            ? { kind: "place", place: placeRef.current }
            : { kind: "section", section: active };
      const path = pathFor(route);
      if (path !== location.pathname) {
        history.replaceState(history.state, "", path + location.search);
        document.title = titleFor(route);
      }
    };
    const onScroll = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        spy();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    USER_EVENTS.forEach((type) => window.addEventListener(type, cancelProgrammatic, { passive: true }));
    return () => {
      window.removeEventListener("scroll", onScroll);
      USER_EVENTS.forEach((type) => window.removeEventListener(type, cancelProgrammatic));
      cancelAnimationFrame(frame);
    };
  }, []);

  const navigate = useCallback(
    (route: Route) => {
      if (route.kind === "reserved" || route.kind === "unknown") return;
      const path = pathFor(route);
      if (path !== location.pathname) history.pushState(null, "", path + location.search);
      show(route, { smooth: true, settle: false });
    },
    [show],
  );

  /** For <a href="/plan"> etc.: plain left clicks are handled in-page; modified/middle clicks open normally. */
  const onLinkClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(e.currentTarget.href);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      navigate(parseLocation(url.pathname, url.hash));
    },
    [navigate],
  );

  /** Map stops and day "Open … guide" buttons: a real navigation (pushState) that scrolls to Places. */
  const openPlace = useCallback((id: string) => navigate({ kind: "place", place: id }), [navigate]);

  /** Explorer tabs and lens tabs: tab-like, so the URL is replaced and nothing scrolls. */
  const choosePlace = useCallback(
    (id: string, opts?: { lens?: Lens }) => {
      select(id, opts);
      placeChosen.current = true;
      const route: Route = { kind: "place", place: id };
      const path = pathFor(route);
      if (path !== location.pathname) history.replaceState(history.state, "", path + location.search);
      document.title = titleFor(route);
    },
    [select],
  );

  /** Skip link: move focus to <main> without writing #main into the URL. */
  const skipToMain = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById("main");
    if (!main) return;
    e.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);

  return { onLinkClick, openPlace, choosePlace, skipToMain };
}
