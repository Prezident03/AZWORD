/* /api/ai testlari — Auth + Firestore emulatorlari va soxta Groq serveri bilan.
   Ishga tushirish: npm run test:api */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const PROJECT = 'demo-azword';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_PROJECT_ID = PROJECT;
process.env.FIREBASE_API_KEY = 'fake-key';
process.env.GROQ_API_KEY = 'test';

let groqServer, env, handler, lastGroqBody, ttsCalls = 0;
before(async () => {
  groqServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => {
      lastGroqBody = JSON.parse(b);
      if (req.url.endsWith('/audio/speech')) {
        ttsCalls++;
        if (lastGroqBody.input === 'terms please') {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: { message: 'The model requires terms acceptance', code: 'model_terms_required' } }));
        }
        res.setHeader('Content-Type', 'audio/wav');
        return res.end(Buffer.from('RIFF0000WAVEfake-audio'));
      }
      const json = !!lastGroqBody.response_format;
      const isGloss = json && /Sentence:/.test(JSON.stringify(lastGroqBody.messages));
      const content = isGloss
        ? JSON.stringify({ translation: 'Mushuk divanda uxlaydi.', words: [{ en: 'The', uz: '' }, { en: 'cat', uz: 'mushuk' }, { en: 'sleeps', uz: 'uxlaydi' }] })
        : json
        ? JSON.stringify({ words: [{ en: 'airport', uz: 'aeroport', example: 'We met at the airport.' }, { en: 'ticket', uz: 'chipta', example: 'I bought a ticket.' }] })
        : '"The cat sleeps on the sofa."';
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  }).listen(0);
  process.env.GROQ_BASE_URL = `http://127.0.0.1:${groqServer.address().port}`;
  handler = (await import('../api/ai.js')).default;
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
after(async () => { groqServer.close(); await env.cleanup(); });

async function signUp(email) {
  const r = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true })
  });
  const d = await r.json();
  return { uid: d.localId, token: d.idToken };
}
function call(body, token) {
  return new Promise((resolve) => {
    const req = { method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body };
    const res = {
      code: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; },
      json(d) { resolve({ status: this.code, data: d }); },
      end(buf) { resolve({ status: this.statusCode || this.code, audio: buf, headers: this.headers }); }
    };
    handler(req, res);
  });
}

test('tokensiz so\'rov rad etiladi', async () => {
  const r = await call({ task: 'example', en: 'cat' });
  assert.equal(r.status, 401);
});
test('noma\'lum vazifa rad etiladi', async () => {
  const u = await signUp('t1@x.com');
  const r = await call({ task: 'prompt', prompt: 'hack' }, u.token);
  assert.equal(r.status, 400);
});
test('misol gap', async () => {
  const u = await signUp('t2@x.com');
  const r = await call({ task: 'example', en: 'cat', uz: 'mushuk' }, u.token);
  assert.equal(r.status, 200);
  assert.equal(r.data.text, 'The cat sleeps on the sofa.');
});
test('tabiiy ovoz (tts): audio qaytaradi, keshlaydi, qavslarni olib tashlaydi', async () => {
  const u = await signUp('t10@x.com');
  const before = ttsCalls;
  const r = await call({ task: 'tts', text: 'Hello [whisper] world', voice: 'hannah' }, u.token);
  assert.equal(r.status, 200);
  assert.equal(r.headers['Content-Type'], 'audio/wav');
  assert.equal(r.audio.toString(), 'RIFF0000WAVEfake-audio');
  assert.equal(lastGroqBody.model, 'canopylabs/orpheus-v1-english');
  assert.equal(lastGroqBody.voice, 'hannah');
  assert.equal(lastGroqBody.input, 'Hello whisper world');
  const r2 = await call({ task: 'tts', text: 'Hello [whisper] world', voice: 'hannah' }, u.token);
  assert.equal(r2.status, 200);
  assert.equal(ttsCalls, before + 1);
  const bad = await call({ task: 'tts', text: 'Hi', voice: 'evil' }, u.token);
  assert.equal(lastGroqBody.voice, 'troy');
  assert.equal(bad.status, 200);
  const terms = await call({ task: 'tts', text: 'terms please' }, u.token);
  assert.equal(terms.status, 502);
  assert.equal(terms.data.code, 'tts-terms');
});
test('gap tarjimasi (diktant)', async () => {
  const u = await signUp('t9@x.com');
  const r = await call({ task: 'gloss', text: 'The cat sleeps.' }, u.token);
  assert.equal(r.status, 200);
  assert.equal(r.data.text, 'Mushuk divanda uxlaydi.');
  assert.equal(r.data.words[1].uz, 'mushuk');
});
test('so\'z generatori: urinish yo\'q bo\'lsa 402', async () => {
  const u = await signUp('t3@x.com');
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users', u.uid), { uid: u.uid, email: 't3@x.com', aiGeneratorUses: 0 }));
  const r = await call({ task: 'words', topic: 'travel', level: 'A2', count: 10 }, u.token);
  assert.equal(r.status, 402);
});
test('so\'z generatori: urinish bittaga kamayadi', async () => {
  const u = await signUp('t4@x.com');
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users', u.uid), { uid: u.uid, email: 't4@x.com', aiGeneratorUses: 3 }));
  const r = await call({ task: 'words', topic: 'travel', level: 'A2', count: 10 }, u.token);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.words.length, 2);
  assert.equal(r.data.usesLeft, 2);
  let left;
  await env.withSecurityRulesDisabled(async c => { left = (await getDoc(doc(c.firestore(), 'users', u.uid))).data().aiGeneratorUses; });
  assert.equal(left, 2);
});
test('chat', async () => {
  const u = await signUp('t5@x.com');
  const r = await call({ task: 'chat', messages: [{ role: 'user', content: 'Salom' }] }, u.token);
  assert.equal(r.status, 200);
  assert.equal(lastGroqBody.messages[0].role, 'system');
});
