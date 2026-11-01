import { useState } from "react";
import type { Photo as PhotoType } from "../types/photo";

export function Photo({ p, eager = false, className = "" }: { p: PhotoType; eager?: boolean; className?: string }) {
  const [missing, setMissing] = useState(false);

  const baseClass = `ph ${className}`.trim();
  const fullClass = missing ? `${baseClass} ph-missing` : baseClass;

  return (
    <img
      src={p.src}
      alt={p.caption}
      className={fullClass}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      onError={() => setMissing(true)}
    />
  );
}
