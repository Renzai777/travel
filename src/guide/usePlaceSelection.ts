import { useCallback, useState } from "react";
import { PLACES } from "../data/places";
import { reduceMotion } from "../lib/motion";
import type { Lens } from "../types/photo";

export function usePlaceSelection(): {
  place: string;
  lens: Lens;
  select: (id: string, opts?: { scroll?: boolean; lens?: Lens }) => void;
} {
  const [selection, setSelection] = useState<{ place: string; lens: Lens }>({
    place: PLACES[0].id,
    lens: "culture",
  });

  const select = useCallback((id: string, opts?: { scroll?: boolean; lens?: Lens }) => {
    setSelection((prev) => ({
      place: id,
      lens: opts?.lens ?? prev.lens,
    }));
    if (opts?.scroll) {
      document.getElementById("places")?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, []);

  return {
    place: selection.place,
    lens: selection.lens,
    select,
  };
}
