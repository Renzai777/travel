export {};

declare global {
  interface Window {
    /** Where Excalidraw loads its fonts from (`<path>/fonts/<Family>/…`). */
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}
