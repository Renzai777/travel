import type React from "react";
import type { Photo } from "../types/photo";
import { openLightbox } from "../../js/gallery.js";

export function Zoomable({ p, list, children }: { p: Photo; list: Photo[]; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="zoom"
      aria-label={`View photo: ${p.caption}`}
      onClick={() => openLightbox(list, list.indexOf(p))}
    >
      {children}
    </button>
  );
}
