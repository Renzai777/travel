import { useEffect, useRef, useState, type RefObject } from "react";
import { reduceMotion } from "./motion";

export function useReveal<T extends Element = HTMLElement>(): [RefObject<T | null>, boolean] {
  const shouldBypass = reduceMotion || typeof IntersectionObserver === "undefined";
  const [shown, setShown] = useState(shouldBypass);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (shown) return;
    const target = ref.current;
    if (!target) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    io.observe(target);

    return () => {
      io.disconnect();
    };
  }, [shown]);

  return [ref, shown];
}
