"""Serve the site to everyone on the local/company network.

Usage: python tools/serve.py [port]      (default port 8765)
"""
import functools
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Allowlist of what the site needs; everything else (.git, tools, ...) is 404.
PUBLIC_FILES = {ROOT / "index.html"}
PUBLIC_DIRS = tuple(ROOT / d for d in ("css", "js", "assets"))


def is_public(fs_path: Path) -> bool:
    """Decide on the resolved filesystem path, so URL tricks (%2e, case, ./) can't bypass it."""
    resolved = fs_path.resolve()
    if resolved.is_dir():
        resolved = resolved / "index.html"
    return resolved in PUBLIC_FILES or any(resolved.is_relative_to(d) for d in PUBLIC_DIRS)


class SiteHandler(SimpleHTTPRequestHandler):
    # Windows' registry can map .js to text/plain, which breaks ES modules — pin the types.
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".html": "text/html",
    }

    def send_head(self):  # shared by GET and HEAD
        if not is_public(Path(self.translate_path(self.path))):
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        if self.path.startswith("/assets/img/"):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:  # always revalidate HTML/JS/CSS so edits show up on refresh
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


class Server(ThreadingHTTPServer):
    request_queue_size = 128  # default of 5 refuses parallel image requests on Windows
    daemon_threads = True
    allow_reuse_address = False  # on Windows, True lets us silently share a port another app owns


def lan_addresses() -> list[str]:
    try:
        infos = socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)
    except socket.gaierror:
        return []
    return sorted({info[4][0] for info in infos if not info[4][0].startswith("127.")})


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(SiteHandler, directory=str(ROOT))
    with Server(("0.0.0.0", port), handler) as httpd:
        print(f"Serving {ROOT}")
        print(f"  This PC:   http://localhost:{port}")
        for ip in lan_addresses():
            print(f"  Network:   http://{ip}:{port}")
        print("Press Ctrl+C to stop.", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
