/* ═══════════════════════════════════════════════════════════════════
   AzWord — Touch UX yordamchisi (FAQAT mobil, max-width:768px'da
   ishlaydigan interaktivlik — hover o'rniga tap/swipe/long-press)
   Har bir sahifaga qo'shiladi:
     <script src="touch-ux.js" defer></script>
   Ta'minlaydi:
     1) iOS Safari'da :active CSS holatini yoqish (touchstart trick)
     2) Long-press — .az-longpress elementlarida (uzoq bosib o'chirish
        va h.k. uchun, hover-only tugmalarga muqobil yo'l)
     3) Swipe-to-delete — .az-swipe-item elementlarida (chapga suring)
   Ikkalasi ham FAQAT window.innerWidth <= 768 bo'lganda faollashadi —
   desktop'da hech qanday xatti-harakat o'zgarmaydi.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function isMobile() {
    return window.innerWidth <= 768;
  }

  /* ─── 1. iOS SAFARI :active FIX ───
     iOS Safari'da hujjatda hech qanday touchstart listener bo'lmasa,
     :active CSS holati umuman ishga tushmaydi (bosilganda darhol
     vizual javob bo'lmaydi). Bo'sh listener shu cheklovni chetlab
     o'tadi va barcha :active qoidalarini yoqadi. */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* ─── 2. LONG-PRESS ───
     Belgilash: <div class="az-longpress"
                      data-longpress-fn="deleteFolder"
                      data-longpress-arg="FOLDER_ID">
     550ms ushlab turilsa data-longpress-fn'da ko'rsatilgan global
     funksiya (masalan window.deleteFolder) data-longpress-arg bilan
     chaqiriladi. Odatda funksiya (event, arg) shaklida kutiladi
     (deleteFolder kabi). Agar funksiya faqat (arg) qabul qilsa
     (masalan deleteWord(wordId)), elementga qo'shimcha
     data-longpress-arg-only qo'yiladi — shunda faqat arg beriladi. */
  var LP_DURATION = 550;
  var LP_MOVE_TOLERANCE = 10;

  function attachLongPress(el) {
    if (el.__azLpAttached) return;
    el.__azLpAttached = true;

    var timer = null;
    var startX = 0, startY = 0;
    var fired = false;

    function clearHold() {
      if (timer) { clearTimeout(timer); timer = null; }
      el.classList.remove('az-lp-active');
    }

    function start(x, y) {
      if (!isMobile()) return;
      fired = false;
      startX = x; startY = y;
      el.classList.add('az-lp-active');
      timer = setTimeout(function () {
        fired = true;
        el.classList.remove('az-lp-active');
        el.classList.add('az-lp-fire');
        setTimeout(function () { el.classList.remove('az-lp-fire'); }, 260);
        if (navigator.vibrate) { try { navigator.vibrate(16); } catch (e) {} }

        var fnName = el.getAttribute('data-longpress-fn');
        var arg = el.getAttribute('data-longpress-arg');
        if (fnName && typeof window[fnName] === 'function') {
          if (el.hasAttribute('data-longpress-arg-only')) {
            window[fnName](arg);
          } else {
            window[fnName]({ stopPropagation: function () {} }, arg);
          }
        } else {
          el.dispatchEvent(new CustomEvent('azlongpress', { bubbles: true }));
        }
      }, LP_DURATION);
    }

    function move(x, y) {
      if (!timer) return;
      if (Math.abs(x - startX) > LP_MOVE_TOLERANCE || Math.abs(y - startY) > LP_MOVE_TOLERANCE) clearHold();
    }

    el.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      move(t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('touchend', clearHold, { passive: true });
    el.addEventListener('touchcancel', clearHold, { passive: true });

    /* Long-press otilgandan keyingi "click" ni bekor qilish — aks
       holda karta bosilganda navigatsiya ham ishga tushib ketadi. */
    el.addEventListener('click', function (e) {
      if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; }
    }, true);
  }

  /* ─── 3. SWIPE-TO-DELETE (to'g'ridan-to'g'ri, panel ochilmaydi) ───
     Belgilash: <div class="lrn-myf-row az-swipe-item"
                      data-swipe-delete-fn="deleteFolder"
                      data-swipe-delete-arg="FOLDER_ID">
     (bitta arg qabul qiladigan funksiyalar uchun — masalan
     deleteWord(wordId) — data-swipe-delete-arg-only ham qo'shiladi.)
     Elementni chapga ~90px+ tez suring — element birozgina siljib,
     xiralashib boradi; chegaradan o'tsa, xuddi o'chirish tugmasi
     bosilgandek data-swipe-delete-fn chaqiriladi (o'zining confirm()
     dialogi bilan). Chegaraga yetmasa, element joyiga qaytadi.
     Asosiy o'chirish tugmasi (mavjud bo'lsa) alohida ishlashda davom
     etadi — bu FAQAT qo'shimcha, yordamchi yo'l. */
  var SWIPE_MAX = 90;
  var SWIPE_THRESHOLD = 64;

  function attachSwipeDelete(el) {
    if (el.__azSwipeAttached) return;
    el.__azSwipeAttached = true;

    var startX = 0, startY = 0, dx = 0, dragging = false, locked = null;

    function reset() {
      el.style.transition = 'transform 220ms ease, opacity 220ms ease';
      el.style.transform = '';
      el.style.opacity = '';
    }

    el.addEventListener('touchstart', function (e) {
      if (!isMobile()) return;
      /* O'chirish tugmasi yoki boshqa interaktiv elementga tegilsa
         swipe boshlanmaydi — ular o'zining click'ini ishlatadi. */
      if (e.target.closest && e.target.closest('button, a')) return;
      var t = e.touches[0];
      startX = t.clientX; startY = t.clientY; dx = 0; dragging = true; locked = null;
      el.style.transition = 'none';
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.touches[0];
      var diffX = t.clientX - startX;
      var diffY = t.clientY - startY;
      if (locked === null) locked = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
      if (locked === 'y') { dragging = false; reset(); return; }
      if (diffX > 0) { dx = 0; } else { dx = Math.max(-SWIPE_MAX, diffX); }
      el.style.transform = 'translateX(' + dx + 'px)';
      el.style.opacity = String(1 - Math.abs(dx) / (SWIPE_MAX * 2.2));
    }, { passive: true });

    el.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      var wasPastThreshold = dx <= -SWIPE_THRESHOLD;
      reset();
      if (wasPastThreshold) {
        var fnName = el.getAttribute('data-swipe-delete-fn');
        var arg = el.getAttribute('data-swipe-delete-arg');
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
        if (fnName && typeof window[fnName] === 'function') {
          if (el.hasAttribute('data-swipe-delete-arg-only')) {
            window[fnName](arg);
          } else {
            window[fnName]({ stopPropagation: function () {} }, arg);
          }
        }
      }
    }, { passive: true });

    el.addEventListener('touchcancel', function () {
      dragging = false;
      reset();
    }, { passive: true });
  }

  /* ─── 4. INIT — sahifa yuklanganda va ro'yxatlar dinamik
     to'ldirilgandan keyin ham chaqirsa bo'ladi (window.AzTouchUX.init) ─── */
  function init(root) {
    var scope = root || document;
    var lp = scope.querySelectorAll('.az-longpress');
    for (var i = 0; i < lp.length; i++) attachLongPress(lp[i]);
    var sw = scope.querySelectorAll('.az-swipe-item');
    for (var j = 0; j < sw.length; j++) attachSwipeDelete(sw[j]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  window.AzTouchUX = { init: init, attachLongPress: attachLongPress, attachSwipeDelete: attachSwipeDelete };
})();
