import { createReadStream, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";

/**
 * Self-hosts Excalidraw's canvas fonts at /excalidraw-assets/fonts/… (window.EXCALIDRAW_ASSET_PATH in src/board/Board.tsx), so the CSP can
 * stay `font-src 'self'` and boards work offline. The 13 MB CJK font (Xiaolai) is left out; Excalidraw falls back to system fonts for it.
 */
const FONTS_DIR = join(process.cwd(), "node_modules/@excalidraw/excalidraw/dist/prod/fonts");
const PUBLIC_PREFIX = "excalidraw-assets/fonts/";
const SKIP = new Set(["Xiaolai"]);

function listFonts(): string[] {
  const out: string[] = [];
  for (const family of readdirSync(FONTS_DIR)) {
    if (SKIP.has(family)) continue;
    const dir = join(FONTS_DIR, family);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) if (file.endsWith(".woff2")) out.push(join(dir, file));
  }
  return out;
}

export function excalidrawFonts(): Plugin {
  return {
    name: "excalidraw-fonts",
    configureServer(server) {
      server.middlewares.use("/" + PUBLIC_PREFIX, (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\/+/, "");
        const file = join(FONTS_DIR, rel);
        if (!file.startsWith(FONTS_DIR + sep) || !file.endsWith(".woff2") || SKIP.has(rel.split("/")[0])) return next();
        try {
          statSync(file);
        } catch {
          return next();
        }
        res.setHeader("Content-Type", "font/woff2");
        createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      // Only the client build (the Cloudflare plugin also builds the worker environment).
      if (this.environment && this.environment.name !== "client") return;
      for (const file of listFonts()) {
        this.emitFile({
          type: "asset",
          fileName: PUBLIC_PREFIX + relative(FONTS_DIR, file).split(sep).join("/"),
          source: readFileSync(file),
        });
      }
    },
  };
}
