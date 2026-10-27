import importlib.util
import io
import json
import os
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch
import tarot_api as api

VALID = {'answer': '针对是否换工作的困惑，先核实条件。', 'card_readings': ['过去的尝试', '当下的选择', '未来先验证再行动'], 'synthesis': '从开始走向选择，再通过核实信息形成行动方向。', 'actions': ['列出选择标准', '了解新岗位条件'], 'reflection': '你最重视什么？'}

class ReadingTests(unittest.TestCase):
    def setUp(self):
        # Keep unit tests independent of the user's real provider and credentials.
        local_config = patch.object(api.pathlib.Path, 'read_text', return_value='')
        local_config.start()
        self.addCleanup(local_config.stop)

    @patch.dict(os.environ, {}, clear=True)
    def test_local_config_reload_and_env_precedence(self):
        with patch.object(api.pathlib.Path, 'read_text', return_value='OPENAI_API_KEY="local-test"\nOPENAI_MODEL=test-model\nUNRELATED=ignored'):
            self.assertEqual(api.reading_config(), {'OPENAI_API_KEY':'local-test', 'OPENAI_MODEL':'test-model'})
            with patch.dict(os.environ, {'OPENAI_API_KEY':'environment-test'}):
                self.assertEqual(api.reading_config()['OPENAI_API_KEY'], 'environment-test')
        with patch.object(api.pathlib.Path, 'read_text', return_value='OPENAI_API_KEY=updated-test'):
            self.assertEqual(api.reading_config()['OPENAI_API_KEY'], 'updated-test')

    def test_knowledge_matches_full_deck(self):
        self.assertEqual([c['id'] for c in api.KNOWLEDGE['cards']], list(range(78)))
        for c in api.KNOWLEDGE['cards']:
            self.assertEqual(len(c['positions']), 3)
            self.assertTrue(c['meaning'] and c['symbols'])

    def test_rejects_bad_questions_cards(self):
        for data in [None, {}, {'question':' ', 'cards':[0,1,2]}, {'question':'a'*101,'cards':[0,1,2]}, {'question':'工作','cards':[0,0,1]}, {'question':'工作','cards':[True,1,2]}, {'question':'工作','cards':[0,1,78]}]:
            with self.assertRaises(api.ReadingError): api.validate_input(data)

    def test_validates_orientations_and_full_deck(self):
        draws = [{'id': 77, 'reversed': True}, {'id': 22, 'reversed': False}, {'id': 18, 'reversed': True}]
        self.assertEqual(api.validate_input({'question': '合作', 'cards': draws})[1], draws)
        for bad in [True, -1, 78, {'id': 1}, {'id': 1, 'reversed': 'false'}, {'id': True, 'reversed': False}, {'id': 1, 'reversed': 0}, {'id': 1, 'reversed': False, 'meaning': 'override'}]:
            with self.assertRaises(api.ReadingError):
                api.validate_input({'question':'合作','cards':[bad,2,3]})
        with self.assertRaises(api.ReadingError):
            api.validate_input({'question':'合作','cards':[{'id':1,'reversed':True},{'id':1,'reversed':False},3]})

    @patch.dict(os.environ, {'OPENAI_API_KEY':'test-secret'}, clear=True)
    def test_reversed_meaning_is_grounded(self):
        response = {'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(VALID)}]}]}
        with patch.object(api.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(response).encode())) as send:
            api.generate_reading({'question':'合作','cards':[{'id':77,'reversed':True},{'id':22,'reversed':False},{'id':18,'reversed':True}]})
        context = json.loads(json.loads(send.call_args.args[0].data)['input'])
        self.assertEqual(context['cards'][0]['name'], '星币国王')
        self.assertEqual([c['orientation'] for c in context['cards']], ['逆位','正位','逆位'])
        self.assertEqual(context['cards'][0]['meaning'], api.KNOWLEDGE['cards'][77]['reversed']['meaning'])
        self.assertEqual(context['cards'][2]['position_meaning'], api.KNOWLEDGE['cards'][18]['reversed']['positions'][2])
        self.assertNotIn('reversed', context['cards'][0])

    @patch.dict(os.environ, {}, clear=True)
    @patch.object(api, "reading_config", return_value={})
    def test_no_key_is_explicit(self, config):
        with self.assertRaises(api.ReadingError) as cm: api.generate_reading({'question':'工作','cards':[0,1,2]})
        self.assertEqual(cm.exception.status, 503)

    @patch.dict(os.environ, {'OPENAI_API_KEY':'test-secret'})
    def test_grounded_request_and_structured_result(self):
        response = {'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(VALID)}]}]}
        with patch.object(api.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(response).encode())) as send:
            result = api.generate_reading({'question':'我应该换工作吗？','cards':[0,6,18]})
        body = json.loads(send.call_args.args[0].data)
        context = json.loads(body['input'])
        self.assertEqual(context['question'], '我应该换工作吗？')
        self.assertEqual([c['name'] for c in context['cards']], ['愚者','恋人','月亮'])
        self.assertEqual([c['position'] for c in context['cards']], api.POSITIONS)
        self.assertEqual(context['cards'][2]['position_meaning'], api.KNOWLEDGE['cards'][18]['positions'][2])
        self.assertFalse(body['store'])
        self.assertTrue(body['text']['format']['strict'])
        self.assertEqual(result['answer'], VALID['answer'])
        self.assertNotIn('test-secret',json.dumps(result))

    @patch.dict(os.environ, {'OPENAI_API_KEY':'test-secret'})
    @patch.object(api.time, 'sleep')
    def test_upstream_failures(self, sleep):
        for exc, status in [(TimeoutError(),504),(urllib.error.HTTPError('url',401,'secret',{},None),503),(urllib.error.HTTPError('url',429,'secret',{},None),429)]:
            with patch.object(api.urllib.request, 'urlopen', side_effect=exc):
                with self.assertRaises(api.ReadingError) as cm: api.generate_reading({'question':'工作','cards':[0,1,2]})
                self.assertEqual(cm.exception.status,status)
                self.assertNotIn('secret',cm.exception.message)
        for value in [{}, {**VALID,'card_readings':['one']}, {**VALID,'actions':['one']}]:
            with self.assertRaises(api.ReadingError): api.validate_output(value)

    @patch.dict(os.environ, {'READING_PROVIDER':'deepseek', 'DEEPSEEK_API_KEY':'deepseek-test'}, clear=True)
    def test_deepseek_request_and_result(self):
        response={'choices':[{'finish_reason':'stop','message':{'content':json.dumps(VALID)}}]}
        with patch.object(api.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(response).encode())) as send:
            result=api.generate_reading({'question':'我该换工作吗？','cards':[0,6,18]})
        request=send.call_args.args[0]
        self.assertEqual(request.full_url, 'https://api.deepseek.com/chat/completions')
        self.assertEqual(request.get_header('Authorization'), 'Bearer deepseek-test')
        body=json.loads(request.data)
        self.assertEqual(body['model'], 'deepseek-flash')
        self.assertEqual(body['response_format'], {'type':'json_object'})
        context=json.loads(body['messages'][1]['content'])
        self.assertEqual([c['name'] for c in context['cards']], ['愚者','恋人','月亮'])
        self.assertEqual(result['answer'], VALID['answer'])
        for value in [{'choices':[]}, {'choices':[{'finish_reason':'length'}]}, {'choices':[{'finish_reason':'stop','message':{'content':''}}]}]:
            with patch.object(api.urllib.request, 'urlopen', return_value=io.BytesIO(json.dumps(value).encode())):
                with self.assertRaises(api.ReadingError):api.generate_reading({'question':'工作','cards':[0,1,2]})
        with patch.object(api.urllib.request, 'urlopen', side_effect=urllib.error.HTTPError('url',402,'secret',{},None)):
            with self.assertRaises(api.ReadingError) as cm:api.generate_reading({'question':'工作','cards':[0,1,2]})
            self.assertIn('余额不足',cm.exception.message)

    def test_flat_provider_format_is_assembled_without_guessing(self):
        wire = {'answer':VALID['answer'], 'past':'过去', 'present':'现在', 'future':'未来', 'synthesis':VALID['synthesis'], 'action_1':'行动一', 'action_2':'行动二', 'reflection':VALID['reflection']}
        reply = lambda value: {'choices':[{'finish_reason':'stop','message':{'content':json.dumps(value)}}]}
        result = api.parse_provider_result(reply(wire), 'deepseek')
        self.assertEqual(result['card_readings'], ['过去','现在','未来'])
        self.assertEqual(result['actions'], ['行动一','行动二'])
        with self.assertRaises(api.ReadingError):
            api.parse_provider_result(reply({**wire, 'past':''}), 'deepseek')
        wire.pop('present')
        with self.assertRaises(api.ReadingError):
            api.parse_provider_result(reply(wire), 'deepseek')

    def test_named_card_readings_keep_position_order(self):
        value = {**VALID, 'card_readings': {'future':'未来', 'past':'过去', 'present':'现在'}}
        result = api.parse_provider_result({'choices':[{'finish_reason':'stop','message':{'content':json.dumps(value)}}]}, 'deepseek')
        self.assertEqual(result['card_readings'], ['过去', '现在', '未来'])
        value['card_readings'].pop('past')
        with self.assertRaises(api.ReadingError):
            api.parse_provider_result({'choices':[{'finish_reason':'stop','message':{'content':json.dumps(value)}}]}, 'deepseek')

    def test_extra_metadata_does_not_discard_complete_reading(self):
        self.assertEqual(api.validate_output({**VALID, 'title': '多余的标题'}), VALID)
        for value, code in [({k:v for k,v in VALID.items() if k != 'answer'}, 'missing_fields'),
                            ({**VALID, 'card_readings': ['一张']}, 'card_count'),
                            ({**VALID, 'actions': ['一项']}, 'action_count'),
                            ({**VALID, 'reflection': ' '}, 'invalid_text')]:
            with self.assertRaises(api.ReadingError) as cm:
                api.validate_output(value)
            self.assertEqual(cm.exception.code, code)

    @patch.dict(os.environ, {'READING_PROVIDER':'deepseek', 'DEEPSEEK_API_KEY':'test-only'}, clear=True)
    def test_format_failure_recovers_once_without_changing_draws(self):
        def reply(value):
            return io.BytesIO(json.dumps({'choices':[{'finish_reason':'stop','message':{'content':json.dumps(value)}}]}).encode())
        invalid = {**VALID, 'actions': ['只有一项']}
        with patch.object(api.urllib.request, 'urlopen', side_effect=[reply(invalid), reply(VALID)]) as send:
            with self.assertLogs(api.LOGGER, level='WARNING') as logs:
                result = api.generate_reading({'question':'如何安排学习计划？','cards':[{'id':0,'reversed':True},6,18]})
        self.assertEqual(result['answer'], VALID['answer'])
        self.assertEqual(send.call_count, 2)
        bodies=[json.loads(call.args[0].data) for call in send.call_args_list]
        self.assertEqual(bodies[0]['messages'][1], bodies[1]['messages'][1])
        self.assertIn('action_1', bodies[1]['messages'][0]['content'])
        self.assertNotIn('学习计划', str(logs.output))
        self.assertNotIn('test-only', str(logs.output))
        with patch.object(api.urllib.request, 'urlopen', side_effect=[reply(invalid) for _ in range(4)]) as send:
            with self.assertRaises(api.ReadingError) as cm:
                api.generate_reading({'question':'工作','cards':[0,6,18]})
        self.assertEqual(send.call_count, 4)
        self.assertIn('自动尝试4次', cm.exception.message)

    @patch.dict(os.environ, {'READING_PROVIDER':'deepseek', 'DEEPSEEK_API_KEY':'test-only'}, clear=True)
    def test_repeated_invalid_and_transient_failures_recover(self):
        def reply(value):
            return io.BytesIO(json.dumps({'choices':[{'finish_reason':'stop','message':{'content':json.dumps(value)}}]}).encode())
        invalid={**VALID, 'card_readings':['一','二','三','四']}
        with patch.object(api.urllib.request, 'urlopen', side_effect=[reply(invalid),reply(invalid),reply(invalid),reply(VALID)]) as send:
            result=api.generate_reading({'question':'工作','cards':[0,6,18]})
        self.assertEqual(send.call_count,4)
        self.assertEqual(result['card_readings'],VALID['card_readings'])
        with patch.object(api.time,'sleep'), patch.object(api.urllib.request,'urlopen',side_effect=[TimeoutError(),reply(VALID)]) as send:
            result=api.generate_reading({'question':'工作','cards':[0,6,18]})
        self.assertEqual(send.call_count,2)
        self.assertEqual(result['answer'],VALID['answer'])
        with patch.object(api.urllib.request,'urlopen',side_effect=urllib.error.HTTPError('url',401,'secret',{},None)) as send:
            with self.assertRaises(api.ReadingError):
                api.generate_reading({'question':'工作','cards':[0,6,18]})
        self.assertEqual(send.call_count,1)

    def test_http_route(self):
        spec=importlib.util.spec_from_file_location('preview','preview-server.py')
        server_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(server_module)
        server=server_module.http.server.ThreadingHTTPServer(('127.0.0.1',0),server_module.Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            with patch.object(server_module,'generate_reading',return_value=VALID):
                req=urllib.request.Request(base+'/api/reading',data=json.dumps({'question':'工作','cards':[0,1,2]}).encode(),headers={'Content-Type':'application/json'})
                with urllib.request.urlopen(req) as response:
                    self.assertEqual(json.load(response),VALID)
                    self.assertIn('no-store',response.headers['Cache-Control'])
            for path in ['/.env','/tarot_api.py','/%2eenv']:
                with self.assertRaises(urllib.error.HTTPError) as cm: urllib.request.urlopen(base+path)
                self.assertEqual(cm.exception.code,404)
            req=urllib.request.Request(base+'/api/reading',data=b'{}',headers={'Content-Type':'application/json','Origin':'https://untrusted.example'})
            with self.assertRaises(urllib.error.HTTPError) as cm: urllib.request.urlopen(req)
            self.assertEqual(cm.exception.code,403)
        finally:
            server.shutdown();server.server_close();thread.join()

if __name__ == '__main__': unittest.main()
