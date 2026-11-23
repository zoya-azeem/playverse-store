/* ==========================================================================
   MCP Hub - shared behaviour
   Progressive enhancement only: every page is fully readable without JS.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Mobile nav ---------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    });

    // Close the menu when a link is tapped or the viewport grows.
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 760) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      }
    });
  }

  /* ---------- 2. Mark the current page in the nav ---------- */
  function initActiveLink() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    var anchors = document.querySelectorAll('.nav-links a');
    for (var i = 0; i < anchors.length; i++) {
      var href = anchors[i].getAttribute('href');
      if (href === path && !anchors[i].classList.contains('btn')) {
        anchors[i].setAttribute('aria-current', 'page');
      }
    }
  }

  /* ---------- 3. Copy-to-clipboard on code blocks ---------- */
  function initCopy() {
    var buttons = document.querySelectorAll('.copy-btn');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.codeblock');
        var pre = block && block.querySelector('pre');
        if (!pre) return;
        var text = pre.innerText;
        var done = function () {
          var old = btn.textContent;
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = old; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallback);
        } else {
          fallback();
        }
        function fallback() {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); done(); } catch (err) { btn.textContent = 'Press Ctrl+C'; }
          document.body.removeChild(ta);
        }
      });
    });
  }

  /* ---------- 4. FAQ accordion ---------- */
  function initFaq() {
    var questions = document.querySelectorAll('.faq-q');
    Array.prototype.forEach.call(questions, function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.faq-item');
        var isOpen = item.classList.toggle('open');
        q.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  /* ---------- 5. Server directory: search + category filter ---------- */
  function initDirectory() {
    var grid = document.getElementById('server-grid');
    if (!grid) return;

    var search = document.getElementById('server-search');
    var chips = document.querySelectorAll('.chip[data-filter]');
    var empty = document.getElementById('server-empty');
    var count = document.getElementById('server-count');
    var cards = grid.querySelectorAll('.server-card');
    var active = 'all';

    function apply() {
      var term = (search && search.value || '').trim().toLowerCase();
      var shown = 0;

      Array.prototype.forEach.call(cards, function (card) {
        var cat = card.getAttribute('data-category') || '';
        var hay = (card.getAttribute('data-keywords') || '') + ' ' + card.textContent.toLowerCase();
        var matchCat = active === 'all' || cat === active;
        var matchTerm = !term || hay.toLowerCase().indexOf(term) !== -1;
        var show = matchCat && matchTerm;
        card.style.display = show ? '' : 'none';
        if (show) shown++;
      });

      if (empty) empty.style.display = shown === 0 ? '' : 'none';
      if (count) {
        count.textContent = shown === cards.length
          ? 'Showing all ' + cards.length + ' servers'
          : 'Showing ' + shown + ' of ' + cards.length + ' servers';
      }
    }

    if (search) search.addEventListener('input', apply);

    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        Array.prototype.forEach.call(chips, function (c) {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        active = chip.getAttribute('data-filter');
        apply();
      });
    });

    apply();
  }

  /* ---------- 6. Contact form (client-side validation demo) ---------- */
  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var note = document.getElementById('form-note');

    function setError(field, on) {
      if (on) { field.classList.add('invalid'); } else { field.classList.remove('invalid'); }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var fields = form.querySelectorAll('.field');

      Array.prototype.forEach.call(fields, function (field) {
        var input = field.querySelector('input, textarea, select');
        if (!input || !input.hasAttribute('required')) return;
        var value = (input.value || '').trim();
        var bad = !value;

        if (!bad && input.type === 'email') {
          bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        }
        if (!bad && input.tagName === 'TEXTAREA' && value.length < 20) {
          bad = true;
        }
        setError(field, bad);
        if (bad) ok = false;
      });

      if (!ok) {
        if (note) note.classList.remove('show');
        var firstBad = form.querySelector('.field.invalid input, .field.invalid textarea, .field.invalid select');
        if (firstBad) firstBad.focus();
        return;
      }

      form.reset();
      if (note) {
        note.classList.add('show');
        note.focus && note.focus();
      }
    });

    // Clear the error as soon as the visitor starts fixing it.
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) field.classList.remove('invalid');
    });
  }

  /* ---------- 7. Current year in the footer ---------- */
  function initYear() {
    var els = document.querySelectorAll('[data-year]');
    var y = new Date().getFullYear();
    Array.prototype.forEach.call(els, function (el) { el.textContent = y; });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initNav();
    initActiveLink();
    initCopy();
    initFaq();
    initDirectory();
    initForm();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
