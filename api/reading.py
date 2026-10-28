"""Vercel Python Function; shares validation and generation with local preview."""
import json
import logging
import pathlib
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlsplit

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from tarot_api import generate_reading, ReadingError


class handler(BaseHTTPRequestHandler):
    def respond(self, status, result):
        body = json.dumps(result, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        origin = self.headers.get('Origin')
        host = self.headers.get('Host', '')
        if origin and urlsplit(origin).netloc != host:
            self.respond(403, {'error': '请从本站提交解读请求。'})
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16384:
                raise ReadingError(400, '请求格式有误。')
            if self.headers.get_content_type() != 'application/json':
                raise ReadingError(415, '请使用JSON格式提交问题。')
            data = json.loads(self.rfile.read(size))
            result = generate_reading(data)
            self.respond(200, result)
        except ReadingError as exc:
            self.respond(exc.status, {'error': exc.message})
        except (ValueError, UnicodeError):
            self.respond(400, {'error': '请求格式有误。'})
        except Exception:
            logging.error('reading_function_failed')
            self.respond(500, {'error': '解读暂时无法完成，请稍后重试。'})

    def do_GET(self):
        self.respond(405, {'error': '请使用POST提交解读请求。'})
