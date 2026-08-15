/* ═══════════════════════════════════════════════════════
   AzWord · Error state helper
   Ma'lumot yuklashda xato bo'lganda (internet uzilgan, server
   javob bermagan, ruxsat rad etilgan) "Qayta urinish" tugmali
   chiroyli blok ko'rsatish uchun umumiy komponent.

   Ishlatilishi:
     window.AzError.mount('books-grid', {
       onRetry: () => loadBooks()
     });

   Ixtiyoriy parametrlar: title, subtitle, retryLabel, inline (true/false)
   Agar subtitle berilmasa, navigator.onLine holatiga qarab avtomatik
   "Internet uzilgan" yoki "Server bilan bog'lanib bo'lmadi" matni tanlanadi.
   ═══════════════════════════════════════════════════════ */
(function () {
  var ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function defaultSubtitle() {
    return (typeof navigator !== 'undefined' && navigator.onLine === false)
      ? "Internet aloqasi yo'q. Ulanishni tekshirib, qayta urinib ko'ring."
      : "Server bilan bog'lanib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.";
  }

  function html(opts) {
    opts = opts || {};
    var title = escapeHtml(opts.title || "Yuklab bo'lmadi");
    var sub = escapeHtml(opts.subtitle || defaultSubtitle());
    var retryLabel = escapeHtml(opts.retryLabel || 'Qayta urinish');
    var showRetry = !!opts.onRetry;
    var cls = 'az-error-state' + (opts.inline ? ' az-error-inline' : '');
    return (
      '<div class="' + cls + '">' +
        '<div class="az-error-icon">' + (opts.icon || ICON_SVG) + '</div>' +
        '<div class="az-error-text">' +
          '<div class="az-error-title">' + title + '</div>' +
          '<div class="az-error-sub">' + sub + '</div>' +
        '</div>' +
        (showRetry ? '<button type="button" class="az-error-retry">' + retryLabel + '</button>' : '') +
      '</div>'
    );
  }

  function mount(container, opts) {
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    if (!container) return;
    container.innerHTML = html(opts);

    if (opts.onRetry) {
      var btn = container.querySelector('.az-error-retry');
      if (btn) {
        btn.addEventListener('click', function () {
          if (btn.disabled) return;
          btn.disabled = true;
          var prevLabel = btn.textContent;
          btn.textContent = 'Yuklanmoqda...';
          var result;
          try {
            result = opts.onRetry();
          } catch (e) {
            result = Promise.reject(e);
          }
          Promise.resolve(result).catch(function (e) {
            console.warn('AzError retry failed', e);
          }).then(function () {
            // Agar container hali ham shu xato bloki bilan bo'lsa (ya'ni retry
            // ham muvaffaqiyatsiz bo'lib, chaqiruvchi qayta AzError.mount qilmagan
            // bo'lsa), tugmani asl holatiga qaytaramiz.
            if (btn.isConnected) {
              btn.disabled = false;
              btn.textContent = prevLabel;
            }
          });
        });
      }
    }
  }

  window.AzError = { html: html, mount: mount };
})();
