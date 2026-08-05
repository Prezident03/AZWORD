(function () {
  'use strict';

  var BTN_SELECTORS = [
    '.btn-primary',
    '.btn-add',
    '.btn-study',
    '.btn-confirm',
    '.btn-success',
    '.btn-streak',
    '.btn-ai',
    '.btn-gold',
    '.btn-danger',
    '.btn-sm',
    '.btn-google',
    '.btn-ai-gen',
    '.btn-cancel',
    '.match-btn',
    '.option-btn',
    '.back-btn',
    '.btn-home'
  ];

  function isInsideButton(target) {
    return target.closest && target.closest(BTN_SELECTORS.join(','));
  }

  function spawnRipple(btn, x, y) {
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.2;
    var px = (x - rect.left) - size / 2;
    var py = (y - rect.top)  - size / 2;

    var span = document.createElement('span');
    span.className = 'btn-ripple';
    span.style.width  = size + 'px';
    span.style.height = size + 'px';
    span.style.left   = px + 'px';
    span.style.top    = py + 'px';

    btn.appendChild(span);
    var azMotion = window.AzMotion || { emphasis: 650 };
    setTimeout(function () {
      if (span.parentNode) span.parentNode.removeChild(span);
    }, azMotion.emphasis + 70); // CSS animatsiya (--dur-emphasis) tugagach ozgina zaxira bilan tozalaydi
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    var btn = isInsideButton(e.target);
    if (btn) spawnRipple(btn, e.clientX, e.clientY);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var btn = isInsideButton(document.activeElement);
    if (btn) {
      var rect = btn.getBoundingClientRect();
      spawnRipple(btn, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, true);
})();
