/* AzWord · so'z ro'yxatlarini fayl va matndan ajratib olish (upload va admin import uchun) */
const LIBS = {
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
};
const loaded = {};
function loadScript(name) {
  if (!loaded[name]) {
    loaded[name] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIBS[name];
      s.onload = resolve;
      s.onerror = () => reject(new Error("Kutubxonani yuklab bo'lmadi. Internetni tekshiring."));
      document.head.appendChild(s);
    });
  }
  return loaded[name];
}

const HEADERS = new Set(['english', 'en', 'eng', 'word', 'words', 'inglizcha', "so'z", 'soz', 'a ustun']);

function clean(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }

export function splitLine(line) {
  let parts;
  if (line.includes('\t')) parts = line.split('\t');
  else if (line.includes(' - ')) parts = line.split(' - ');
  else if (line.includes(' — ')) parts = line.split(' — ');
  else if (line.includes(';')) parts = line.split(';');
  else if (line.includes(',')) {
    const i = line.indexOf(',');
    const rest = line.slice(i + 1);
    const j = rest.indexOf(',');
    parts = j >= 0 ? [line.slice(0, i), rest.slice(0, j), rest.slice(j + 1)] : [line.slice(0, i), rest];
  } else if (line.includes('=')) parts = line.split('=');
  else {
    const m = line.match(/^(\S+)\s{2,}(.+)$/);
    if (!m) return null;
    parts = [m[1], m[2]];
  }
  parts = parts.map(clean);
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return { en: parts[0], uz: parts[1], example: parts.slice(2).join(', ') };
}

export function parseText(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/^\s*\d+[.)]\s*/, '').trim();
    if (!line) continue;
    const w = splitLine(line);
    if (w && !HEADERS.has(w.en.toLowerCase())) out.push(w);
  }
  return dedupe(out);
}

export function dedupe(list) {
  const seen = new Set();
  return list.filter(w => {
    const k = w.en.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map(w => ({ en: w.en.slice(0, 120), uz: w.uz.slice(0, 200), example: (w.example || '').slice(0, 400) }));
}

export async function parseFile(file) {
  if (file.size > 2 * 1024 * 1024) throw new Error("Fayl hajmi 2 MB dan oshmasligi kerak");
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'txt' || ext === 'csv') return parseText(await file.text());
  if (ext === 'xlsx' || ext === 'xls') {
    await loadScript('xlsx');
    const wb = window.XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const out = [];
    for (const r of rows) {
      const en = clean(r[0]), uz = clean(r[1]);
      if (en && uz && !HEADERS.has(en.toLowerCase())) out.push({ en, uz, example: clean(r[2]) });
    }
    return dedupe(out);
  }
  if (ext === 'docx') {
    await loadScript('mammoth');
    const res = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return parseText(res.value);
  }
  throw new Error("Bu fayl turi qo'llab-quvvatlanmaydi. TXT, CSV, XLSX, XLS yoki DOCX yuklang.");
}
