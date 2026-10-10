/* AzWord · AI xizmati mijozi (/api/ai). Har so'rov Firebase ID token bilan yuboriladi. */
import { auth } from './firebase.js';

export async function callAI(task, payload = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Avval tizimga kiring');
  const token = await user.getIdToken();
  let res;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ task, ...payload })
    });
  } catch (e) {
    throw new Error("AI xizmatiga ulanib bo'lmadi. Internetni tekshiring.");
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* bo'sh javob */ }
  if (!res.ok) {
    const err = new Error((data.error || 'AI xizmatida xatolik yuz berdi') + (data.detail ? ` (${data.detail})` : ''));
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export const aiExample = (en, uz) => callAI('example', { en, uz }).then(d => d.text || '');
export const aiTranslate = (text) => callAI('translate', { text }).then(d => d.text || '');
export const aiWords = (topic, level, count) => callAI('words', { topic, level, count });
export const aiPing = () => callAI('ping');
export const aiChat = (messages) => callAI('chat', { messages }).then(d => d.text || '');
