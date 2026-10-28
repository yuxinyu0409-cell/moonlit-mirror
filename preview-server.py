#!/usr/bin/env python3
"""Persistent loopback-only preview. Run: python3 preview-server.py [stop|status]."""
import http.server, json, os, pathlib, signal, socket, subprocess, sys, tempfile, urllib.request
from tarot_api import generate_reading, ReadingError
ROOT=pathlib.Path(__file__).resolve().parent
STATE=pathlib.Path(tempfile.gettempdir())/'moonlit-mirror-preview.json'
LOG=pathlib.Path(tempfile.gettempdir())/'moonlit-mirror-preview.log'
PORT=8877
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_POST(self):
        if self.path != '/api/reading':
            self.send_error(404)
            return
        origin = self.headers.get('Origin')
        if origin and origin not in {f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'}:
            self.send_error(403)
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16384:
                raise ReadingError(400, '请求格式有误。')
            if self.headers.get_content_type() != 'application/json':
                raise ReadingError(415, '请使用JSON格式提交问题。')
            data = json.loads(self.rfile.read(size))
            result, status = generate_reading(data), 200
        except ReadingError as exc:
            result, status = {'error': exc.message}, exc.status
        except (ValueError, UnicodeError):
            result, status = {'error': '请求格式有误。'}, 400
        body = json.dumps(result, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        # Preview serves public assets only; dotfiles and backend code stay private.
        from urllib.parse import unquote, urlsplit
        path = pathlib.PurePosixPath(unquote(urlsplit(self.path).path))
        if any(part.startswith('.') for part in path.parts if part != '/') or path.suffix in {'.py', '.pyc'}:
            self.send_error(404)
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)

    def do_HEAD(self):
        from urllib.parse import unquote, urlsplit
        path = pathlib.PurePosixPath(unquote(urlsplit(self.path).path))
        if any(part.startswith('.') for part in path.parts if part != '/') or path.suffix in {'.py', '.pyc'}:
            self.send_error(404)
            return
        super().do_HEAD()

    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        super().end_headers()
def state():
    try:return json.loads(STATE.read_text())
    except (OSError,ValueError):return {}
def main():
    if len(sys.argv)>1 and sys.argv[1]=='--serve':
        server=http.server.ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
        STATE.write_text(json.dumps({'pid':os.getpid(),'root':str(ROOT),'port':PORT}))
        server.serve_forever()
    elif len(sys.argv)>1 and sys.argv[1]=='stop':
        s=state()
        if s.get('root')==str(ROOT):
            try:os.kill(s['pid'],signal.SIGTERM)
            except ProcessLookupError:pass
            STATE.unlink(missing_ok=True)
            print('Moonlit preview stopped.')
        else:print('No managed preview found.')
    else:
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/',timeout=2) as response:
                print(f'Preview running: http://127.0.0.1:{PORT}/');sys.exit(0)
        except Exception:pass
        if len(sys.argv)>1 and sys.argv[1]=='status':print('Preview is not running.');sys.exit(1)
        with LOG.open('ab') as log:
            p=subprocess.Popen([sys.executable,str(__file__),'--serve'],stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True,close_fds=True)
        print(f'Started persistent preview (PID {p.pid}): http://127.0.0.1:{PORT}/')
        print(f'Logs: {LOG}')

if __name__ == '__main__':
    main()
