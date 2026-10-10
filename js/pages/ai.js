/* AzWord · AI yordamchi (chat). Suhbat qurilmada saqlanadi. */
import { initPage } from '../core.js';
import { aiChat } from '../ai.js';
import { icon } from '../icons.js';
import { $, html, ic, setHTML, toastError, confirmDialog } from '../ui.js';

const { user } = await initPage({ title: 'AI yordamchi', active: 'ai' });
const KEY = 'az:chat:' + user.uid;
let messages = [];
try { messages = JSON.parse(localStorage.getItem(KEY) || '[]').slice(-40); } catch (e) { messages = []; }
let busy = false;

const SUGGEST = [
  '"Make" va "do" ning farqi nima?',
  '"Although" so\'zini misollar bilan tushuntir',
  'Present Perfect qachon ishlatiladi?',
  "Sayohat haqida 10 ta foydali so'z ber",
  '"I am agree" to\'g\'rimi?'
];

$('#send').innerHTML = icon('send', 18);
const topbar = document.querySelector('.topbar-spacer');
if (topbar) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-ghost btn-sm';
  btn.innerHTML = icon('trash-2', 15) + '<span>Tozalash</span>';
  btn.onclick = async () => {
    if (!messages.length) return;
    if (!await confirmDialog({ title: 'Suhbatni tozalash', message: 'Barcha xabarlar o\'chiriladi.', confirmText: 'Tozalash' })) return;
    messages = []; persist(); render();
  };
  topbar.after(btn);
}

function persist() { try { localStorage.setItem(KEY, JSON.stringify(messages.slice(-40))); } catch (e) { /* ignore */ } }

function render() {
  const log = $('#log');
  if (!messages.length) {
    setHTML(log, html`<div class="empty" style="margin:auto">
      <div class="empty-icon">${ic('sparkles', 30)}</div>
      <div class="empty-title">AzWord AI yordamchi</div>
      <div class="empty-sub">So'zlar, grammatika va ingliz tilidagi istalgan savolingizni o'zbek tilida bering.</div>
      <div class="suggestions mt-3" style="justify-content:center">${SUGGEST.map(s => html`<button class="chip" data-s="${s}">${s}</button>`)}</div>
    </div>`);
    log.querySelectorAll('[data-s]').forEach(b => b.onclick = () => send(b.dataset.s));
    return;
  }
  setHTML(log, html`${messages.map(m => html`<div class="msg ${m.role === 'user' ? 'user' : 'bot'}">${m.content}</div>`)}${busy ? html`<div class="msg bot typing">Yozmoqda...</div>` : ''}`);
  log.scrollTop = log.scrollHeight;
}

async function send(text) {
  const t = String(text || '').trim();
  if (!t || busy) return;
  messages.push({ role: 'user', content: t.slice(0, 1000) });
  busy = true;
  persist(); render();
  $('#msg').value = ''; autosize();
  try {
    const reply = await aiChat(messages.slice(-12));
    messages.push({ role: 'assistant', content: reply || 'Kechirasiz, javob topa olmadim.' });
  } catch (e) {
    toastError(e.message);
    messages.pop();
    $('#msg').value = t;
  }
  busy = false;
  persist(); render();
  $('#msg').focus();
}

const input = $('#msg');
function autosize() { input.style.height = '46px'; input.style.height = Math.min(140, input.scrollHeight) + 'px'; }
input.addEventListener('input', autosize);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
$('#form').onsubmit = (e) => { e.preventDefault(); send(input.value); };
render();
