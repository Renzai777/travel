// Where Excalidraw loads its fonts from: our own copies (excalidraw-fonts.plugin.ts copies them at build time). Set in a
// module that Board.tsx imports before "@excalidraw/excalidraw", so it is in place however early Excalidraw resolves
// font URLs. (Excalidraw also adds an esm.sh fallback URL; the CSP blocks it, so fonts only ever come from us.)
window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";
