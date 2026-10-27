"""Exercise the deployed adapter over HTTP without calling a paid model."""
import importlib.util
import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('vercel_reading', 'api/reading.py')
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


class VercelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), adapter.handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def post(self, body=b'{}', **headers):
        request = urllib.request.Request(self.base + '/api/reading', data=body,
            headers={'Content-Type': 'application/json', **headers})
        return urllib.request.urlopen(request)

    def test_success_and_no_store(self):
        with patch.object(adapter, 'generate_reading', return_value={'answer': '测试'}) as generate:
            with self.post(Origin=self.base) as response:
                self.assertEqual(json.load(response), {'answer': '测试'})
                self.assertEqual(response.headers['Cache-Control'], 'no-store')
            generate.assert_called_once_with({})

    def test_cross_origin_rejected_before_generation(self):
        with patch.object(adapter, 'generate_reading') as generate:
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.post(Origin='https://untrusted.example')
            self.assertEqual(error.exception.code, 403)
            generate.assert_not_called()

    def test_invalid_and_oversized_json(self):
        for body in (b'{', b' ' * 4097):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.post(body)
            self.assertEqual(error.exception.code, 400)

    def test_provider_error_is_preserved(self):
        with patch.object(adapter, 'generate_reading', side_effect=adapter.ReadingError(503, '未启用')):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.post()
            self.assertEqual(error.exception.code, 503)
            self.assertEqual(json.load(error.exception), {'error': '未启用'})

    def test_unexpected_error_is_sanitized(self):
        with patch.object(adapter, 'generate_reading', side_effect=RuntimeError('private upstream data')):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.post()
            self.assertEqual(error.exception.code, 500)
            self.assertNotIn('private', error.exception.read().decode())

    def test_get_not_allowed(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(self.base + '/api/reading')
        self.assertEqual(error.exception.code, 405)


if __name__ == '__main__':
    unittest.main()
