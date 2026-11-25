"""يولّد tests/llm-ref.json: logits مرجعية من numpy (بنفس الأوزان float16 المحفوظة) ليقارنها اختبار JS بتنفيذ الاستدلال في gpt.js."""
import json, os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from train import GPT, ROOT
meta = json.load(open(os.path.join(ROOT, 'public/llm/model.json'))); c = meta['config']
raw = np.fromfile(os.path.join(ROOT, 'public/llm/model.bin'), dtype=np.float32 if meta['dtype'] == 'float32' else np.float16)
m = GPT(**c, dtype=np.float32)
for t in meta['tensors']:
    n = int(np.prod(t['shape'])); m.P[t['name']] = raw[t['offset']:t['offset'] + n].astype(np.float32).reshape(t['shape'])
D = json.load(open(os.path.join(ROOT, 'llm/dataset.json'))); t = D['topics'][3]
ids = [1, 3] + t['questions'][0][:10] + [4] + t['title'] + [5] + t['answer'][:20]
logits, _ = m.forward(np.array([ids]))
json.dump(dict(ids=ids, last=[float(x) for x in logits[0, -1]], argmax=[int(x) for x in logits[0].argmax(-1)]), open(os.path.join(ROOT, 'tests/llm-ref.json'), 'w'))
print('wrote tests/llm-ref.json', len(ids), 'tokens')
