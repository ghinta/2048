from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, urlunsplit


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="dist", **kwargs)

    def translate_path(self, path):
        # Exercise the same files at both localhost/ and GitHub Pages' /2048/.
        parsed = urlsplit(path)
        if parsed.path.startswith("/2048/"):
            path = urlunsplit(parsed._replace(path=parsed.path[len("/2048"):]))
        return super().translate_path(path)


ThreadingHTTPServer(("127.0.0.1", 4174), Handler).serve_forever()
