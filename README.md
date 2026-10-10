# AzWord

Ingliz tilidagi so'zlarni o'zbek tilida o'rganish uchun veb-ilova (PWA): kitoblar va mavzular, shaxsiy lug'atlar, 5 bosqichli mashqlar, aqlli takrorlash (spaced repetition), streak, yutuqlar, reyting, do'kon va AI yordamchi.

## Imkoniyatlar

| Bo'lim | Tavsif |
|---|---|
| **O'rganish** | Kitoblar → mavzular → so'zlar; umumiy (admin) va shaxsiy bo'limlar |
| **5 bosqichli mashq** | Tanishish → Variantlar → Bo'laklash → Moslashtirish → Yozish, oxirida xatolarni mustahkamlash |
| **Mashq turlari** | Flashcard (suring/bosing), tezkor kviz, tinglab tushunish |
| **Takrorlash** | Leitner tizimi: to'g'ri eslangan so'z 1, 2, 4, 7, 15, 30, 60 kundan keyin qaytadi |
| **Lug'atim** | Mashq qilingan barcha so'zlar: o'zlashtirilgan / qiyin / takrorlash kerak |
| **O'yinlashtirish** | XP va darajalar, tanga, kunlik maqsad, streak (+ streak muzlatish), yutuqlar, haftalik reyting |
| **Do'kon** | AI so'z generatori, streak muzlatish, nishon, avatar ramkasi, ilova rangi |
| **AI** | Misol gap yozish, tarjima, mavzu bo'yicha so'z generatsiyasi, AI yordamchi (chat) |
| **Admin panel** | Foydalanuvchilar (balans, bloklash), kitob/mavzu/so'z CRUD, Excel/Word import, AI generatsiya, e'lonlar, do'kon, yutuqlar, texnik ishlar rejimi, adminlar ro'yxati |
| **PWA** | O'rnatish, oflayn ishlash (oxirgi ma'lumotlar keshda), oflayn natijalar keyin yuboriladi |

## Tuzilma

```
*.html               Sahifalar (har biri faqat markup — mantiq js/pages/ da)
css/app.css          Yagona dizayn tizimi (qorong'i/yorug' mavzu, mobil)
js/
  firebase.js        Firebase ulanishi (SDK versiyasi bitta joyda)
  core.js            Sahifa yadrosi: auth, sidebar/topbar/pastki menyu, qidiruv (Ctrl+K), PWA
  data.js            Firestore ma'lumotlar qatlami (mashg'ulot yakuni, xarid, yutuq — tranzaksiyalar)
  game.js            O'yin qoidalari: daraja, streak, haftalik reyting, mukofot, SRS
  session.js         Mashg'ulot uchun so'zlarni tayyorlash va natijani saqlash
  ui.js              Xavfsiz HTML (html`` avtomatik escape), toast, modal, formatlash
  widgets.js, fx.js, prefs.js, parse.js, ai.js, icons.js, admin-data.js
  pages/*.js         Har bir sahifaning mantiqi
api/ai.js            Vercel serverless funksiya — AI vazifalari (Groq)
sw.js, manifest.json Service Worker va PWA manifest
firestore.rules      Xavfsizlik qoidalari
tests/               Qoidalar, API va brauzer (E2E) testlari
```

## Ma'lumotlar modeli (Firestore)

```
users/{uid}                    profil + o'yin maydonlari (stars, coins, streakDays, ...)
  progress/{kind_id_topic}     mavzu bo'yicha shaxsiy progress
  wordStats/{kind_id_topic_w}  har bir so'z statistikasi va takrorlash jadvali (box, due)
  studyLog/{id}                mashg'ulotlar tarixi (faqat qo'shiladi)
  purchases/{id}               xaridlar tarixi
leaderboard/{uid}              ommaviy reyting (users dagi qiymatlar bilan mos bo'lishi shart)
books/{id}/topics/{id}/words/{id}
folders/{id}                   isAdmin=true — umumiy, false — shaxsiy (uid egasi)
  words/{id} | topics/{id}/words/{id}
shop, achievements, announcements, settings/main
```

## Xavfsizlik

- **Firestore qoidalari** foydalanuvchiga o'z hujjatidagi o'yin maydonlarini faqat ruxsat etilgan amallar orqali o'zgartirishga imkon beradi:
  mashg'ulot yakuni (bir mashg'ulotda ko'pi bilan 100 XP, 45 soniyalik cooldown, streak +1 dan oshmaydi),
  xarid (narx `shop` hujjatidan tekshiriladi), yutuq (shart bajarilgani va mukofot miqdori tekshiriladi), AI urinishini 1 taga kamaytirish.
- Foydalanuvchilar bir-birining hujjatini (email va h.k.) o'qiy olmaydi; reyting alohida `leaderboard` kolleksiyasida.
- Oddiy foydalanuvchi umumiy bo'lim yarata olmaydi va boshqalarning bo'limini o'qiy olmaydi.
- Bloklangan foydalanuvchi o'z ma'lumotlarini o'zgartira olmaydi; ilovada bloklash va texnik ishlar ekrani ko'rsatiladi.
- `/api/ai` faqat Firebase ID token bilan ishlaydi, ixtiyoriy prompt qabul qilmaydi, so'rovlar soni cheklangan; AI generator urinishlari serverda tekshiriladi.
- Barcha foydalanuvchi matnlari HTML'ga escape qilinib chiqariladi (`html```).

> Eslatma: ilova serversiz (faqat Firestore qoidalari) ishlagani uchun mukofotlar to'liq server tomonida hisoblanmaydi — qoidalar ularni qat'iy cheklaydi, lekin mutlaq himoya uchun keyinchalik Cloud Functions qo'shish mumkin.

## O'rnatish va deploy

### 1. Firestore qoidalari

Yangi qoidalar va ma'lumotlar modeli birga ishlaydi — **saytni yangilashdan oldin yoki bir vaqtda** qoidalarni ham deploy qiling:

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project azword-30a2e
```

(yoki Firebase Console → Firestore → Rules bo'limiga `firestore.rules` mazmunini joylashtiring)

### 2. Vercel

Statik sayt + `api/` funksiyalari. Environment Variables:

| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `GROQ_API_KEY` | ha | Groq API kaliti (AI funksiyalari uchun) |
| `AI_MODEL` | yo'q | standart `llama-3.3-70b-versatile` |
| `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID` | yo'q | standart qiymatlar `js/firebase.js` dagi bilan bir xil |

### 3. Firebase Authentication

Email/parol va Google provayderlari yoqilgan bo'lishi, sayt domeni esa *Authorized domains* ro'yxatida bo'lishi kerak.

### Admin

Asosiy admin — `abdurasul1406z@gmail.com` (`firestore.rules` va `js/data.js` da). Qo'shimcha adminlarni Admin panel → Sozlamalar orqali qo'shish mumkin (email tasdiqlangan bo'lishi shart).

### Eski versiyadan o'tish

Mavjud foydalanuvchilar, kitoblar, bo'limlar, do'kon va yutuqlar o'zgarishsiz ishlaydi. Har bir foydalanuvchi keyingi kirishida reyting (`leaderboard`) hujjati avtomatik yaratiladi. Eski "rank" turidagi yutuqlar endi qo'llanmaydi — admin paneldan boshqa turga o'zgartiring.

## Testlar

```bash
cd tests
npm install
npm run test:rules   # Firestore qoidalari (emulator)
npm run test:api     # /api/ai (Auth + Firestore emulator, soxta Groq)
npm run test:e2e     # brauzer testlari (Playwright + emulatorlar)
```

E2E uchun qo'shimcha: `PAGES=dashboard,shop FLOWS=study,shopAch npm run test:e2e`. Skrinshotlar `tests/screenshots/` ga yoziladi. Java (emulator uchun) talab qilinadi.
