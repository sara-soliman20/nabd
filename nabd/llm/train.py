"""
تدريب نموذج لغة (GPT صغير) من الصفر باستخدام numpy فقط — بدون PyTorch ولا أي نموذج جاهز.
كل شيء هنا مكتوب يدوياً: الـ Embedding، Self-Attention متعدد الرؤوس مع القناع السببي (causal mask)،
LayerNorm، MLP مع GELU، دالة الخسارة Cross-Entropy، الـ Backpropagation، ومُحسّن Adam.

التشغيل:
    node scripts/llm-build-data.js        # (مرة واحدة) يبني الـ tokenizer والبيانات
    python3 llm/train.py --gradcheck      # يتأكد أن الـ backprop صحيح بالمقارنة مع المشتقات العددية
    python3 llm/train.py                  # تدريب (يحفظ public/llm/model.bin)
"""
import numpy as np, json, time, math, sys, os, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOS, EOS, Q, T_, A, PAD = 1, 2, 3, 4, 5, 0


# ───────────── النموذج ─────────────
class GPT:
    def __init__(s, V, d, L, H, ff, ctx, seed=0, dtype=np.float32):
        s.cfg = dict(V=V, d=d, L=L, H=H, ff=ff, ctx=ctx); s.dt = dtype
        rng = np.random.default_rng(seed)
        w = lambda *sh, std=0.02: (rng.standard_normal(sh) * std).astype(dtype)
        z = lambda *sh: np.zeros(sh, dtype); o = lambda *sh: np.ones(sh, dtype)
        rs = 0.02 / math.sqrt(2 * L)  # تصغير مخرجات الطبقات المتراكمة (كما في GPT-2)
        P = {'emb': w(V, d), 'pos': w(ctx, d)}
        for l in range(L):
            P.update({f'l{l}.ln1g': o(d), f'l{l}.ln1b': z(d), f'l{l}.wqkv': w(d, 3 * d), f'l{l}.bqkv': z(3 * d),
                      f'l{l}.wo': w(d, d, std=rs), f'l{l}.bo': z(d), f'l{l}.ln2g': o(d), f'l{l}.ln2b': z(d),
                      f'l{l}.w1': w(d, ff), f'l{l}.b1': z(ff), f'l{l}.w2': w(ff, d, std=rs), f'l{l}.b2': z(d)})
        P.update({'lnfg': o(d), 'lnfb': z(d)})
        s.P = P

    @staticmethod
    def _ln(x, g, b, eps=1e-5):
        mu = x.mean(-1, keepdims=True); xc = x - mu
        rstd = 1.0 / np.sqrt((xc * xc).mean(-1, keepdims=True) + eps); xh = xc * rstd
        return xh * g + b, (xh, rstd)

    @staticmethod
    def _ln_back(dy, g, c):
        xh, rstd = c; dxh = dy * g
        dx = rstd * (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True))
        return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))

    @staticmethod
    def _gelu(x):
        c = math.sqrt(2 / math.pi); t = np.tanh(c * (x + 0.044715 * x ** 3))
        return 0.5 * x * (1 + t), (x, t)

    @staticmethod
    def _gelu_back(dy, c):
        x, t = c; k = math.sqrt(2 / math.pi)
        return dy * (0.5 * (1 + t) + 0.5 * x * (1 - t * t) * k * (1 + 3 * 0.044715 * x * x))

    def forward(s, ids):
        """ids: [B,T] -> logits [B,T,V] و cache للـ backward"""
        P, c = s.P, s.cfg; B, T = ids.shape; d, H = c['d'], c['H']; hd = d // H
        x = P['emb'][ids] + P['pos'][:T]
        mask = np.tril(np.ones((T, T), dtype=bool)); cache = {'ids': ids, 'layers': []}
        for l in range(c['L']):
            p = lambda n: P[f'l{l}.{n}']; lc = {}
            lc['x_in'] = x
            xn, lc['ln1'] = s._ln(x, p('ln1g'), p('ln1b')); lc['xn1'] = xn
            qkv = xn @ p('wqkv') + p('bqkv')
            q, k, v = [m.reshape(B, T, H, hd).transpose(0, 2, 1, 3) for m in np.split(qkv, 3, -1)]
            S = (q @ k.transpose(0, 1, 3, 2)) / math.sqrt(hd)
            S = np.where(mask, S, -1e9); S = S - S.max(-1, keepdims=True)
            Pr = np.exp(S); Pr /= Pr.sum(-1, keepdims=True)
            O = (Pr @ v).transpose(0, 2, 1, 3).reshape(B, T, d)
            lc.update(q=q, k=k, v=v, Pr=Pr, O=O)
            x = x + O @ p('wo') + p('bo')
            lc['x_mid'] = x
            xn2, lc['ln2'] = s._ln(x, p('ln2g'), p('ln2b')); lc['xn2'] = xn2
            hpre = xn2 @ p('w1') + p('b1'); hact, lc['gelu'] = s._gelu(hpre); lc['hact'] = hact
            x = x + hact @ p('w2') + p('b2')
            cache['layers'].append(lc)
        xf, cache['lnf'] = s._ln(x, P['lnfg'], P['lnfb']); cache['xf'] = xf
        return xf @ P['emb'].T, cache  # الـ Embedding نفسه يُستخدم كطبقة الإخراج (weight tying)

    def loss_and_grads(s, ids, targets, weights):
        """Cross-Entropy موزون (الوزن 0 = لا نحسب خسارة لهذا الموضع)."""
        P, c = s.P, s.cfg; B, T = ids.shape; d, H = c['d'], c['H']; hd = d // H
        logits, cache = s.forward(ids)
        lg = logits - logits.max(-1, keepdims=True); pr = np.exp(lg); pr /= pr.sum(-1, keepdims=True)
        W = max(weights.sum(), 1e-9)
        nll = -np.log(np.take_along_axis(pr, targets[..., None], -1)[..., 0] + 1e-12)
        loss = float((nll * weights).sum() / W)
        dl = pr; np.put_along_axis(dl, targets[..., None], np.take_along_axis(dl, targets[..., None], -1) - 1, -1)
        dl *= (weights / W)[..., None]
        G = {k: np.zeros_like(v) for k, v in P.items()}
        xf = cache['xf']
        G['emb'] += dl.reshape(-1, dl.shape[-1]).T @ xf.reshape(-1, d)
        dx = dl @ P['emb']
        dx, G['lnfg'], G['lnfb'] = s._ln_back(dx, P['lnfg'], cache['lnf'])
        for l in reversed(range(c['L'])):
            p = lambda n: P[f'l{l}.{n}']; lc = cache['layers'][l]
            # MLP
            dh = dx @ p('w2').T
            G[f'l{l}.w2'] += lc['hact'].reshape(-1, c['ff']).T @ dx.reshape(-1, d); G[f'l{l}.b2'] += dx.sum((0, 1))
            dh = s._gelu_back(dh, lc['gelu'])
            G[f'l{l}.w1'] += lc['xn2'].reshape(-1, d).T @ dh.reshape(-1, c['ff']); G[f'l{l}.b1'] += dh.sum((0, 1))
            dxn2 = dh @ p('w1').T
            dxx, G[f'l{l}.ln2g'], G[f'l{l}.ln2b'] = s._ln_back(dxn2, p('ln2g'), lc['ln2'])
            dx = dx + dxx
            # Attention
            dO = dx @ p('wo').T
            G[f'l{l}.wo'] += lc['O'].reshape(-1, d).T @ dx.reshape(-1, d); G[f'l{l}.bo'] += dx.sum((0, 1))
            dO = dO.reshape(B, T, H, hd).transpose(0, 2, 1, 3)
            Pr, q, k, v = lc['Pr'], lc['q'], lc['k'], lc['v']
            dP = dO @ v.transpose(0, 1, 3, 2); dv = Pr.transpose(0, 1, 3, 2) @ dO
            dS = Pr * (dP - (dP * Pr).sum(-1, keepdims=True)) / math.sqrt(hd)
            dq = dS @ k; dk = dS.transpose(0, 1, 3, 2) @ q
            mg = lambda a: a.transpose(0, 2, 1, 3).reshape(B, T, d)
            dqkv = np.concatenate([mg(dq), mg(dk), mg(dv)], -1)
            G[f'l{l}.wqkv'] += lc['xn1'].reshape(-1, d).T @ dqkv.reshape(-1, 3 * d); G[f'l{l}.bqkv'] += dqkv.sum((0, 1))
            dxn1 = dqkv @ p('wqkv').T
            dxx, G[f'l{l}.ln1g'], G[f'l{l}.ln1b'] = s._ln_back(dxn1, p('ln1g'), lc['ln1'])
            dx = dx + dxx
        np.add.at(G['emb'], ids, dx); G['pos'][:T] += dx.sum(0)
        return loss, G

    def eval_loss(s, ids, targets, weights):
        logits, _ = s.forward(ids)
        lg = logits - logits.max(-1, keepdims=True); pr = np.exp(lg); pr /= pr.sum(-1, keepdims=True)
        nll = -np.log(np.take_along_axis(pr, targets[..., None], -1)[..., 0] + 1e-12)
        acc = ((logits.argmax(-1) == targets) * weights).sum() / max(weights.sum(), 1e-9)
        return float((nll * weights).sum() / max(weights.sum(), 1e-9)), float(acc)


# ───────────── Adam ─────────────
class Adam:
    def __init__(s, P, b1=0.9, b2=0.99, eps=1e-8):
        s.m = {k: np.zeros_like(v) for k, v in P.items()}; s.v = {k: np.zeros_like(v) for k, v in P.items()}
        s.t = 0; s.b1, s.b2, s.eps = b1, b2, eps

    def step(s, P, G, lr, clip=1.0):
        gn = math.sqrt(sum(float((g * g).sum()) for g in G.values()))
        sc = min(1.0, clip / (gn + 1e-9)); s.t += 1
        for k in P:
            g = G[k] * sc
            s.m[k] = s.b1 * s.m[k] + (1 - s.b1) * g; s.v[k] = s.b2 * s.v[k] + (1 - s.b2) * g * g
            mh = s.m[k] / (1 - s.b1 ** s.t); vh = s.v[k] / (1 - s.b2 ** s.t)
            P[k] -= (lr * mh / (np.sqrt(vh) + s.eps)).astype(P[k].dtype)
        return gn


# ───────────── البيانات ─────────────
def build_seq(q, title, ans):
    """<bos><q> سؤال <t> عنوان الحالة <a> الجواب <eos>  — الخسارة تبدأ من <t> (السؤال نفسه لا يُتنبأ به)."""
    pre = [BOS, Q] + q
    seq = pre + [T_] + title + [A] + ans + [EOS]
    return seq, len(pre)  # موضع <t>


def batchify(seqs, starts):
    T = max(len(s) for s in seqs) - 1; B = len(seqs)
    ids = np.zeros((B, T), np.int64); tg = np.zeros((B, T), np.int64); w = np.zeros((B, T), np.float32)
    for i, (s, st) in enumerate(zip(seqs, starts)):
        n = len(s) - 1; ids[i, :n] = s[:-1]; tg[i, :n] = s[1:]; w[i, max(st - 1, 0):n] = 1.0  # الهدف رقم j هو s[j+1]
    return ids, tg, w


def gradcheck():
    print('gradient check (float64) ...')
    m = GPT(V=23, d=8, L=2, H=2, ff=16, ctx=12, seed=1, dtype=np.float64)
    for k in m.P: m.P[k] += np.random.default_rng(7).standard_normal(m.P[k].shape) * 0.05  # بعيداً عن الصفر
    rng = np.random.default_rng(3); ids = rng.integers(0, 23, (3, 9)); tg = rng.integers(0, 23, (3, 9)); w = (rng.random((3, 9)) > .3).astype(np.float64)
    _, G = m.loss_and_grads(ids, tg, w); worst = 0
    for k, p in m.P.items():
        for _ in range(4):
            idx = tuple(rng.integers(0, n) for n in p.shape); old = p[idx]; e = 1e-5
            p[idx] = old + e; lp, _ = m.loss_and_grads(ids, tg, w); p[idx] = old - e; lm, _ = m.loss_and_grads(ids, tg, w); p[idx] = old
            num = (lp - lm) / (2 * e); ana = G[k][idx]; err = abs(num - ana) / (abs(num) + abs(ana) + 1e-8); worst = max(worst, err)
            if err > 1e-4: print('  MISMATCH', k, idx, num, ana)
    print('  أسوأ خطأ نسبي = %.2e' % worst, '→', 'الـ backprop صحيح ✓' if worst < 1e-4 else 'خطأ ✗')
    return worst < 1e-4


def export(m, path_prefix, meta):
    names = list(m.P.keys()); tensors = []; buf = []; off = 0
    for n in names:
        a = m.P[n].astype(np.float32); tensors.append(dict(name=n, shape=list(a.shape), offset=off)); buf.append(a.tobytes()); off += a.size
    open(path_prefix + '.bin', 'wb').write(b''.join(buf))
    json.dump(dict(config=m.cfg, tensors=tensors, dtype='float32', **meta), open(path_prefix + '.json', 'w'), ensure_ascii=False)
    return off * 2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gradcheck', action='store_true'); ap.add_argument('--steps', type=int, default=1500)
    ap.add_argument('--d', type=int, default=96); ap.add_argument('--layers', type=int, default=3); ap.add_argument('--heads', type=int, default=4)
    ap.add_argument('--batch', type=int, default=8); ap.add_argument('--lr', type=float, default=3e-3); ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--resume', action='store_true'); ap.add_argument('--all-questions', action='store_true', help='مرحلة أخيرة: التدريب على كل صيغ الأسئلة (بما فيها مجموعة التحقق) مع تشويش السؤال'); ap.add_argument('--export-only', action='store_true', help='يعيد تصدير آخر checkpoint بدون تدريب')
    a = ap.parse_args()
    if a.gradcheck: sys.exit(0 if gradcheck() else 1)

    D = json.load(open(os.path.join(ROOT, 'llm/dataset.json'))); V = D['vocab']; topics = D['topics']
    rng = np.random.default_rng(a.seed)
    # فصل 15% من صيغ الأسئلة لكل حالة كمجموعة تحقق (النموذج لا يراها أبداً أثناء التدريب)
    train_q, val_q = [], []
    for t in topics:
        qs = list(t['questions']); rng.shuffle(qs); nv = max(2, len(qs) // 7)
        val_q.append(qs[:nv]); train_q.append(qs[nv:])
    if a.all_questions: train_q = [tq + vq for tq, vq in zip(train_q, val_q)]
    ctx = max(2 + 30 + 1 + len(t['title']) + 1 + len(t['answer']) + 1 for t in topics)
    ctx = int(math.ceil(ctx / 16) * 16)
    m = GPT(V, a.d, a.layers, a.heads, a.d * 8 // 3 // 8 * 8, ctx, seed=a.seed)
    nparams = sum(p.size for p in m.P.values()); print(f'V={V} d={a.d} L={a.layers} H={a.heads} ctx={ctx} params={nparams:,}')
    ckpt = os.path.join(ROOT, 'llm/checkpoint.npz')
    if a.resume and os.path.exists(ckpt):
        z = np.load(ckpt); [m.P.__setitem__(k, z[k]) for k in m.P]; print('resumed')
    if a.export_only:
        z = np.load(ckpt); [m.P.__setitem__(k, z[k]) for k in m.P]
        old = json.load(open(os.path.join(ROOT, 'public/llm/model.json'))); [old.pop(k) for k in ('config', 'tensors', 'dtype')]
        print('exported', export(m, os.path.join(ROOT, 'public/llm/model'), old) * 2 // 1024, 'KB'); return
    topic_w = np.ones(len(topics)); opt = Adam(m.P); warm = 60; t0 = time.time(); hist = []

    def sample(qs_lists, i=None):
        i = rng.choice(len(topics), p=topic_w / topic_w.sum()) if i is None else i; t = topics[i]
        q = qs_lists[i][rng.integers(len(qs_lists[i]))]
        if a.all_questions and rng.random() < 0.5 and len(q) > 1:  # تشويش: حذف عشوائي لبعض رموز السؤال كي لا يعتمد الجواب على صياغته
            q = [x for x in q if rng.random() > 0.3] or q[:1]
        return build_seq(q, t['title'], t['answer'])

    def evaluate(qs_lists, nq=3):
        tot_l, tot_a, full = 0, 0, 0
        for i, t in enumerate(topics):
            sq = [build_seq(q, t['title'], t['answer']) for q in qs_lists[i][:nq]]
            ids, tg, w = batchify([s for s, _ in sq], [st for _, st in sq])
            # الدقة الدقيقة على الجواب فقط (بعد <a>): لو كلها 100% فالتوليد الجشع (greedy) يعيد الجواب حرفياً
            la = ids.shape[1]; lg, _ = m.forward(ids); pred = lg.argmax(-1)
            ok = True
            for r, (s, st) in enumerate(sq):
                a0 = s.index(A); n = len(s) - 1; ok &= bool((pred[r, a0:n] == tg[r, a0:n]).all())
            full += ok; l, ac = m.eval_loss(ids, tg, w); tot_l += l; tot_a += ac
        n = len(topics); return tot_l / n, tot_a / n, full / n

    def hard_topics(n=10):
        """Hard-example mining: أي حالات لا يعيد النموذج جوابها حرفياً (greedy) مع أسئلة مشوَّشة؟ نزيد وزنها في العينة."""
        bad = np.zeros(len(topics))
        for i, t in enumerate(topics):
            sq = [sample(train_q, i) for _ in range(n)]
            ids, tg, w = batchify([x[0] for x in sq], [x[1] for x in sq]); pred = m.forward(ids)[0].argmax(-1)
            for r, (sq_, st) in enumerate(sq):
                a0 = sq_.index(A); nn = len(sq_) - 1; bad[i] += not (pred[r, a0:nn] == tg[r, a0:nn]).all()
        return bad / n

    for step in range(1, a.steps + 1):
        lr = a.lr * min(1, step / warm) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * step / a.steps)))
        batch = [sample(train_q) for _ in range(a.batch)]
        ids, tg, w = batchify([b[0] for b in batch], [b[1] for b in batch])
        loss, G = m.loss_and_grads(ids, tg, w); gn = opt.step(m.P, G, lr)
        if step % 25 == 0 or step == 1: print(f'step {step:5d} loss {loss:.4f} lr {lr:.5f} |g| {gn:.2f}  {time.time() - t0:.0f}s', flush=True)
        if step % 100 == 0 or step == a.steps:
            vl, va, vf = evaluate(val_q, 6); tl, ta, tf = evaluate(train_q)
            hist.append(dict(step=step, train_loss=tl, val_loss=vl, val_ppl=math.exp(vl), exact=tf, val_exact=vf))
            print(f'  ── eval: train loss {tl:.4f} acc {ta:.3f} | val loss {vl:.4f} ppl {math.exp(vl):.2f} acc {va:.3f} | حالات حرفية: train {tf * 100:.0f}% / val {vf * 100:.0f}%', flush=True)
            np.savez(ckpt, **m.P)
            if a.all_questions:
                hb = hard_topics(); topic_w = 1 + 6 * hb; print(f'  حالات صعبة: {int((hb > 0).sum())}/{len(topics)} (متوسط الفشل {hb.mean() * 100:.0f}%)', flush=True)
                if hb.max() == 0 and step >= 300: print('  كل الحالات حرفية مع أسئلة مشوَّشة'); break
            if not a.all_questions and tf == 1.0 and vf == 1.0 and ta > 0.9995 and step >= 300: print('  اكتمل الحفظ الحرفي لكل الحالات'); break
    vl, va, vf = evaluate(val_q, 6); tl, ta, tf = evaluate(train_q)
    prev = {}
    try: prev = json.load(open(os.path.join(ROOT, 'public/llm/model.json')))
    except Exception: pass
    held = prev.get('heldout_metrics') or prev.get('metrics')  # قياسات المرحلة التي لم ترَ فيها صيغ التحقق
    size = export(m, os.path.join(ROOT, 'public/llm/model'), dict(heldout_metrics=held,
        params=nparams, train=dict(steps=step, batch=a.batch, lr=a.lr, seconds=round(time.time() - t0)),
        metrics=dict(train_loss=tl, val_loss=vl, val_perplexity=math.exp(vl), token_accuracy=ta, exact_topics=tf, val_exact_topics=vf), history=hist))
    print(f'saved model.bin ({size * 2 / 1024:.0f} KB float32)')


if __name__ == '__main__':
    main()
