/* AzWord · AI API (Vercel serverless funksiya)
   POST /api/ai   Authorization: Bearer <Firebase ID token>
   Body: { task: 'example' | 'translate' | 'words' | 'chat', ... }

   Xavfsizlik:
   - Har bir so'rov Firebase ID token bilan tekshiriladi (Google sertifikatlari, RS256).
   - Ixtiyoriy prompt yuborib bo'lmaydi — faqat oldindan belgilangan vazifalar.
   - 'words' (AI so'z generatori) oddiy foydalanuvchi uchun aiGeneratorUses
     hisobidan ishlaydi: server foydalanuvchi tokeni bilan Firestore'dan
     qoldiqni o'qiydi va muvaffaqiyatli javobdan keyin 1 taga kamaytiradi.
   - Har bir foydalanuvchi uchun daqiqalik so'rov cheklovi.

   Vercel → Settings → Environment Variables:
     GROQ_API_KEY            (majburiy)
     FIREBASE_PROJECT_ID     (ixtiyoriy, standart — azword-30a2e)
     AI_MODEL                (ixtiyoriy, standart — llama-3.3-70b-versatile) */

import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

const OWNER_EMAIL = 'abdurasul1406z@gmail.com';
const PROJECT = process.env.FIREBASE_PROJECT_ID || 'azword-30a2e';
const MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1') + '/chat/completions';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST ? `http://${process.env.FIRESTORE_EMULATOR_HOST}` : 'https://firestore.googleapis.com';
const FS_BASE = `${FS_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

const LIMITS = { example: 30, translate: 30, words: 6, chat: 20 }; // daqiqasiga
const hits = new Map();

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

function rateLimit(uid, task) {
  const key = uid + ':' + task;
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < 60000);
  if (arr.length >= (LIMITS[task] || 10)) throw new HttpError(429, "Juda ko'p so'rov. Bir daqiqadan keyin qayta urinib ko'ring.", 'rate-limited');
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
}

/* Firebase ID tokenni Google'ning ochiq sertifikatlari bilan tekshirish (API kalit kerak emas) */
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache = { certs: null, exp: 0 };
async function googleCerts() {
  if (certCache.certs && Date.now() < certCache.exp) return certCache.certs;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new HttpError(503, "Autentifikatsiya xizmatiga ulanib bo'lmadi");
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  certCache = { certs: await r.json(), exp: Date.now() + (m ? Number(m[1]) : 3600) * 1000 };
  return certCache.certs;
}
const b64json = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

async function verifyToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) throw new HttpError(401, 'Avval tizimga kiring', 'unauthenticated');
  const bad = () => new HttpError(401, 'Sessiya muddati tugagan. Qayta kiring.', 'unauthenticated');
  const parts = token.split('.');
  if (parts.length !== 3) throw bad();
  let header, payload;
  try { header = b64json(parts[0]); payload = b64json(parts[1]); } catch (e) { throw bad(); }
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== PROJECT || payload.iss !== `https://securetoken.google.com/${PROJECT}`) throw bad();
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp < now || (payload.iat || 0) > now + 300) throw bad();
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    if (header.alg !== 'RS256') throw bad();
    const cert = (await googleCerts())[header.kid];
    if (!cert) throw bad();
    const ok = crypto.createVerify('RSA-SHA256').update(parts[0] + '.' + parts[1]).verify(cert, Buffer.from(parts[2], 'base64url'));
    if (!ok) throw bad();
  }
  return { uid: payload.sub, email: payload.email || '', emailVerified: !!payload.email_verified, token };
}

/* Firestore REST — foydalanuvchining o'z tokeni bilan (xavfsizlik qoidalari amal qiladi) */
async function fsGet(path, token) {
  const r = await fetch(`${FS_BASE}/${path}`, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 404) return null;
  if (!r.ok) throw new HttpError(502, "Ma'lumotlar bazasiga ulanib bo'lmadi");
  return r.json();
}
const fsNumber = (doc, f) => {
  const v = doc && doc.fields && doc.fields[f];
  if (!v) return 0;
  return Number(v.integerValue ?? v.doubleValue ?? 0);
};

async function isAdmin(user) {
  if (user.email === OWNER_EMAIL) return true;
  if (!user.emailVerified) return false;
  try {
    const s = await fsGet('settings/main', user.token);
    const arr = s && s.fields && s.fields.admins && s.fields.admins.arrayValue && s.fields.admins.arrayValue.values || [];
    return arr.some(v => v.stringValue === user.email);
  } catch (e) { return false; }
}

async function consumeGeneratorUse(user) {
  const doc = await fsGet(`users/${user.uid}`, user.token);
  const uses = fsNumber(doc, 'aiGeneratorUses');
  if (uses <= 0) throw new HttpError(402, "AI generator urinishlari tugagan. Do'kondan sotib oling.", 'no-credits');
  return {
    uses,
    async commit() {
      const url = `${FS_BASE}/users/${user.uid}?updateMask.fieldPaths=aiGeneratorUses&currentDocument.exists=true`;
      const r = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + user.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { aiGeneratorUses: { integerValue: String(uses - 1) } } })
      });
      if (!r.ok) { console.warn('[api/ai] credit commit failed', r.status, (await r.text()).slice(0, 300)); throw new HttpError(409, "Urinishni hisobga olib bo'lmadi. Qayta urinib ko'ring.", 'credit-conflict'); }
      return uses - 1;
    }
  };
}

async function groq(messages, { maxTokens = 400, temperature = 0.6, json = false } = {}) {
  if (!process.env.GROQ_API_KEY) throw new HttpError(500, 'AI xizmati sozlanmagan (GROQ_API_KEY).', 'not-configured');
  const body = { model: MODEL, messages, max_tokens: maxTokens, temperature };
  if (json) body.response_format = { type: 'json_object' };
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, 'AI xizmati vaqtincha javob bermayapti.', 'upstream');
  return String(data.choices?.[0]?.message?.content || '').trim();
}

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const unquote = (s) => s.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

const TASKS = {
  async example(body) {
    const en = str(body.en, 80), uz = str(body.uz, 120);
    if (!en) throw new HttpError(400, "So'z kiritilmagan");
    const text = await groq([
      { role: 'system', content: 'You write short, natural, beginner-friendly English example sentences. Reply with the sentence only.' },
      { role: 'user', content: `Word: "${en}"${uz ? ` (Uzbek meaning: "${uz}")` : ''}. Write ONE simple English sentence (max 14 words) that uses this word in that meaning.` }
    ], { maxTokens: 80, temperature: 0.7 });
    return { text: unquote(text.split('\n')[0]).slice(0, 300) };
  },

  async translate(body) {
    const text = str(body.text, 500);
    if (!text) throw new HttpError(400, 'Matn kiritilmagan');
    const out = await groq([
      { role: 'system', content: "You are a professional English→Uzbek translator. Translate into natural Uzbek (Latin script). Reply with the translation only." },
      { role: 'user', content: text }
    ], { maxTokens: 300, temperature: 0.2 });
    return { text: unquote(out).slice(0, 800) };
  },

  async words(body, user) {
    const topic = str(body.topic, 80);
    const level = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(body.level) ? body.level : 'B1';
    const count = Math.max(5, Math.min(40, parseInt(body.count, 10) || 10));
    if (!topic) throw new HttpError(400, 'Mavzu kiritilmagan');
    const admin = await isAdmin(user);
    const credit = admin ? null : await consumeGeneratorUse(user);

    const raw = await groq([
      { role: 'system', content: 'You create English vocabulary lists for Uzbek learners. Always reply with valid JSON only.' },
      { role: 'user', content: `Create ${count} useful English vocabulary items about the topic "${topic}" for CEFR level ${level}. Return JSON: {"words":[{"en":"word or short phrase (lowercase unless proper noun)","uz":"accurate Uzbek translation in Latin script","example":"one simple English example sentence"}]}. No duplicates.` }
    ], { maxTokens: 3500, temperature: 0.5, json: true });

    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      const m = raw.match(/\[[\s\S]*\]/);
      parsed = m ? { words: JSON.parse(m[0]) } : null;
    }
    const seen = new Set();
    const words = (parsed && Array.isArray(parsed.words) ? parsed.words : [])
      .map(w => ({ en: str(w.en, 80), uz: str(w.uz, 150), example: str(w.example, 300) }))
      .filter(w => w.en && w.uz && !seen.has(w.en.toLowerCase()) && seen.add(w.en.toLowerCase()))
      .slice(0, count);
    if (!words.length) throw new HttpError(502, "AI so'zlarni yarata olmadi. Mavzuni o'zgartirib ko'ring.", 'empty');

    const usesLeft = credit ? await credit.commit() : null;
    return { words, usesLeft, unlimited: !credit };
  },

  async chat(body) {
    const msgs = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const clean = msgs
      .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({ role: m.role, content: str(m.content, 1200) }))
      .filter(m => m.content);
    if (!clean.length || clean[clean.length - 1].role !== 'user') throw new HttpError(400, 'Savol kiritilmagan');
    const text = await groq([
      { role: 'system', content: "You are AzWord AI — a friendly, patient English tutor for Uzbek speakers. Answer in Uzbek (Latin script) unless the user writes in English or asks otherwise. Explain vocabulary, grammar and usage clearly with short English examples. Keep answers concise (under 180 words), use simple formatting (short lines, '-' bullets). Politely decline topics unrelated to learning languages." },
      ...clean
    ], { maxTokens: 700, temperature: 0.6 });
    return { text: text.slice(0, 4000) };
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const task = TASKS[body.task] ? body.task : null;
    if (!task) throw new HttpError(400, "Noma'lum vazifa", 'bad-task');
    const user = await verifyToken(req);
    rateLimit(user.uid, task);
    const result = await TASKS[task](body, user);
    return res.status(200).json(result);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error('[api/ai]', e);
    return res.status(status).json({ error: e instanceof HttpError ? e.message : 'Server xatosi', code: e.code || 'error' });
  }
}
