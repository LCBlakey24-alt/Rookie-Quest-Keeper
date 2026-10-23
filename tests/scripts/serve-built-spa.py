"""Serve a compiled CRA site for non-production browser smoke tests only.

SPA routes fall back to index.html; existing static paths use http.server.
Run from tests/: python3 scripts/serve-built-spa.py
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2] / "frontend" / "build"


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        route = unquote(urlsplit(self.path).path)
        # On deep links, serve the React entrypoint, but preserve real assets
        # and real 404s for missing CSS, JS, images, and other static files.
        relative = route.lstrip("/")
        requested = ROOT / relative
        if route != "/" and not requested.is_file() and not requested.is_dir():
            if "." not in Path(route).name:
                self.path = "/index.html"
        return super().do_GET()

    def do_HEAD(self):
        return self.do_GET()


if __name__ == "__main__":
    if not (ROOT / "index.html").is_file():
        raise SystemExit(f"Missing built frontend: {ROOT / 'index.html'}")
    handler = partial(SpaHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", 4173), handler) as server:
        server.serve_forever()
