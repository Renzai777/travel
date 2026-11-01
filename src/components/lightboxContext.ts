import { createContext, useContext } from "react";
import type { Photo } from "../types/photo";

export type LightboxContextValue = {
  open: (list: Photo[], index: number) => void;
};

export const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue {
  const context = useContext(LightboxContext);
  if (!context) throw new Error("useLightbox must be used within a LightboxProvider");
  return context;
}
