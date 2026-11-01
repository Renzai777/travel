import type React from "react";
import type { Photo } from "../types/photo";
import { useLightbox } from "./lightboxContext";

export function Zoomable({ p, list, children }: { p: Photo; list: Photo[]; children: React.ReactNode }) {
  const { open } = useLightbox();

  return (
    <button
      type="button"
      className="zoom"
      aria-label={`View photo: ${p.caption}`}
      onClick={() => open(list, list.indexOf(p))}
    >
      {children}
    </button>
  );
}
