/* ==========================================================================
   PlayVerse - shared behaviour
   Progressive enhancement: every page is readable and navigable without JS.
   ========================================================================== */
(function () {
  'use strict';

  var LIB_KEY = 'pv_library';
  var THEME_KEY = 'pv_theme';

  /* ---------- storage helpers (never throw) ---------- */
  function readStore(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function writeStore(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function getLibrary() {
    var v = readStore(LIB_KEY, []);
    return Object.prototype.toString.call(v) === '[object Array]' ? v : [];
  }
  function setLibrary(list) { writeStore(LIB_KEY, list); updateLibCount(); }

  /* ---------- toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    // force reflow so the transition replays on rapid clicks
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  /* ---------- 1. Theme toggle ---------- */
  function initTheme() {
    var root = document.documentElement;
    var saved = readStore(THEME_KEY, null);
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

    function label() {
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') &&
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      return dark ? '☀' : '☾';
    }

    var buttons = document.querySelectorAll('[data-theme-toggle]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.textContent = label();
      btn.addEventListener('click', function () {
        var isDark = root.getAttribute('data-theme') === 'dark' ||
          (!root.getAttribute('data-theme') &&
            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        var next = isDark ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        writeStore(THEME_KEY, next);
        Array.prototype.forEach.call(buttons, function (b) { b.textContent = label(); });
      });
    });
  }

  /* ---------- 2. Active tab in the topbar ---------- */
  function initActiveTab() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    var anchors = document.querySelectorAll('.topbar-tabs a');
    Array.prototype.forEach.call(anchors, function (a) {
      if (a.getAttribute('href') === path) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- 3. Library counter in the topbar ---------- */
  function updateLibCount() {
    var n = getLibrary().length;
    var els = document.querySelectorAll('[data-lib-count]');
    Array.prototype.forEach.call(els, function (el) {
      el.textContent = n ? String(n) : '';
      el.style.display = n ? '' : 'none';
    });
  }

  /* ---------- 4. Install / save buttons ---------- */
  function syncButton(btn) {
    var id = btn.getAttribute('data-app-id');
    var inLib = getLibrary().indexOf(id) !== -1;
    btn.setAttribute('aria-pressed', inLib ? 'true' : 'false');
    var on = btn.getAttribute('data-label-on') || 'Installed';
    var off = btn.getAttribute('data-label-off') || 'Install';
    btn.textContent = inLib ? on : off;
  }

  function initLibraryButtons() {
    var buttons = document.querySelectorAll('[data-app-id]');
    Array.prototype.forEach.call(buttons, function (btn) {
      if (btn.tagName !== 'BUTTON') return;
      syncButton(btn);
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-app-id');
        var name = btn.getAttribute('data-app-name') || 'App';
        var lib = getLibrary();
        var i = lib.indexOf(id);
        if (i === -1) { lib.push(id); toast(name + ' added to your library'); }
        else { lib.splice(i, 1); toast(name + ' removed from your library'); }
        setLibrary(lib);
        // keep every button for this app in sync across the page
        var all = document.querySelectorAll('[data-app-id="' + id + '"]');
        Array.prototype.forEach.call(all, function (b) { if (b.tagName === 'BUTTON') syncButton(b); });
        if (document.getElementById('library-root')) renderLibrary();
      });
    });
  }

  /* ---------- 5. Browse: search, category filter, sort ---------- */
  function initBrowse() {
    var grid = document.getElementById('browse-grid');
    if (!grid) return;

    var search = document.getElementById('browse-search');
    var sort = document.getElementById('browse-sort');
    var chips = document.querySelectorAll('.chip[data-filter]');
    var count = document.getElementById('browse-count');
    var empty = document.getElementById('browse-empty');
    var items = Array.prototype.slice.call(grid.querySelectorAll('[data-name]'));
    var active = 'all';

    // honour ?q= from the topbar search
    var q = (window.location.search.match(/[?&]q=([^&]*)/) || [])[1];
    if (q && search) search.value = decodeURIComponent(q.replace(/\+/g, ' '));

    function apply() {
      var term = (search && search.value || '').trim().toLowerCase();
      var shown = 0;

      items.forEach(function (el) {
        var name = (el.getAttribute('data-name') || '').toLowerCase();
        var dev = (el.getAttribute('data-dev') || '').toLowerCase();
        var cat = el.getAttribute('data-cat') || '';
        var okCat = active === 'all' || cat === active;
        var okTerm = !term || name.indexOf(term) !== -1 || dev.indexOf(term) !== -1 ||
          cat.toLowerCase().indexOf(term) !== -1;
        var show = okCat && okTerm;
        el.classList.toggle('hide', !show);
        if (show) shown++;
      });

      if (count) {
        var noun = grid.getAttribute('data-noun') || 'titles';
        count.textContent = shown === items.length
          ? 'Showing all ' + items.length + ' ' + noun
          : 'Showing ' + shown + ' of ' + items.length + ' ' + noun;
      }
      if (empty) empty.classList.toggle('hide', shown !== 0);
    }

    function applySort() {
      if (!sort) return;
      var mode = sort.value;
      var sorted = items.slice().sort(function (a, b) {
        if (mode === 'rating') return parseFloat(b.getAttribute('data-rating')) - parseFloat(a.getAttribute('data-rating'));
        if (mode === 'name') return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
        return parseInt(a.getAttribute('data-order') || '0', 10) - parseInt(b.getAttribute('data-order') || '0', 10);
      });
      sorted.forEach(function (el) { grid.appendChild(el); });
    }

    if (search) search.addEventListener('input', apply);
    if (sort) sort.addEventListener('change', function () { applySort(); apply(); });

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

  /* ---------- 6. Topbar search -> browse page ---------- */
  function initTopSearch() {
    var form = document.getElementById('top-search-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      var input = form.querySelector('input');
      var term = (input && input.value || '').trim();
      var onBrowse = !!document.getElementById('browse-grid');
      if (onBrowse) {
        // filter in place instead of navigating away
        e.preventDefault();
        var local = document.getElementById('browse-search');
        if (local) {
          local.value = term;
          local.dispatchEvent(new Event('input', { bubbles: true }));
          local.scrollIntoView({ block: 'center' });
        }
        return;
      }
      if (!term) { e.preventDefault(); return; }
      // otherwise let the GET submit to games.html?q=term
    });
  }

  /* ---------- 7. Chart tabs ---------- */
  function initChartTabs() {
    var tabs = document.querySelectorAll('[data-chart-tab]');
    if (!tabs.length) return;
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-chart-tab');
        Array.prototype.forEach.call(tabs, function (t) {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-pressed', t === tab ? 'true' : 'false');
        });
        var panels = document.querySelectorAll('[data-chart-panel]');
        Array.prototype.forEach.call(panels, function (p) {
          p.classList.toggle('hide', p.getAttribute('data-chart-panel') !== target);
        });
      });
    });
  }

  /* ---------- 8. Library page rendering ---------- */
  function renderLibrary() {
    var root = document.getElementById('library-root');
    if (!root) return;
    var catalog = window.PV_CATALOG || [];
    var lib = getLibrary();
    var items = catalog.filter(function (a) { return lib.indexOf(a.id) !== -1; });

    var summary = document.getElementById('library-summary');
    if (summary) {
      summary.textContent = items.length
        ? items.length + (items.length === 1 ? ' title' : ' titles') + ' in your library'
        : 'Your library is empty';
    }

    if (!items.length) {
      root.innerHTML =
        '<div class="empty-state">' +
          '<div class="big">📦</div>' +
          '<h3>Nothing installed yet</h3>' +
          '<p>Tap <strong>Install</strong> on any title and it will show up here. ' +
          'Your library is stored in this browser only.</p>' +
          '<div class="btn-row" style="justify-content:center">' +
            '<a class="btn btn-primary" href="games.html">Browse games</a>' +
            '<a class="btn btn-ghost" href="apps.html">Browse apps</a>' +
          '</div>' +
        '</div>';
      return;
    }

    var html = items.map(function (a) {
      return '' +
        '<div class="lib-row">' +
          '<div class="tile tile-sm ' + a.art + '">' + a.letter + '</div>' +
          '<div>' +
            '<h3><a href="' + (a.page || (a.id + '.html')) + '">' + a.name + '</a></h3>' +
            '<div class="meta">' + a.dev + ' &middot; ' + a.cat + ' &middot; ' + a.size + '</div>' +
          '</div>' +
          '<button class="btn btn-ghost btn-sm btn-save" type="button" ' +
            'data-app-id="' + a.id + '" data-app-name="' + a.name + '" ' +
            'data-label-on="Remove" data-label-off="Install">Remove</button>' +
        '</div>';
    }).join('');

    root.innerHTML = html;
    initLibraryButtons();
  }

  /* ---------- 9. Clear library ---------- */
  function initClearLibrary() {
    var btn = document.getElementById('clear-library');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!getLibrary().length) { toast('Your library is already empty'); return; }
      setLibrary([]);
      renderLibrary();
      toast('Library cleared');
      var all = document.querySelectorAll('[data-app-id]');
      Array.prototype.forEach.call(all, function (b) { if (b.tagName === 'BUTTON') syncButton(b); });
    });
  }

  /* ---------- 10. FAQ accordion ---------- */
  function initFaq() {
    var qs = document.querySelectorAll('.faq-q');
    Array.prototype.forEach.call(qs, function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.faq-item');
        var open = item.classList.toggle('open');
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- 11. Support form ---------- */
  function initForm() {
    var form = document.getElementById('support-form');
    if (!form) return;
    var note = document.getElementById('form-note');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var fields = form.querySelectorAll('.field');

      Array.prototype.forEach.call(fields, function (field) {
        var input = field.querySelector('input, textarea, select');
        if (!input || !input.hasAttribute('required')) return;
        var value = (input.value || '').trim();
        var bad = !value;
        if (!bad && input.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        if (!bad && input.tagName === 'TEXTAREA' && value.length < 20) bad = true;
        field.classList.toggle('invalid', bad);
        if (bad) ok = false;
      });

      if (!ok) {
        if (note) note.classList.remove('show');
        var first = form.querySelector('.field.invalid input, .field.invalid textarea, .field.invalid select');
        if (first) first.focus();
        return;
      }
      form.reset();
      if (note) note.classList.add('show');
      toast('Request submitted (demo only)');
    });

    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) field.classList.remove('invalid');
    });
  }

  /* ---------- 12. Detail page: hydrate from ?id= ---------- */
  function initDetail() {
    var installBtn = document.querySelector('[data-d-install]');
    if (!installBtn) return;

    var raw = (window.location.search.match(/[?&]id=([^&]*)/) || [])[1];
    if (!raw) return;
    var id = decodeURIComponent(raw);

    var catalog = window.PV_CATALOG || [];
    var app = null;
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) { app = catalog[i]; break; }
    }
    if (!app) return; // unknown id: leave the static default content in place

    function setAll(attr, value) {
      var els = document.querySelectorAll('[' + attr + ']');
      Array.prototype.forEach.call(els, function (el) { el.textContent = value; });
    }

    setAll('data-d-name', app.name);
    setAll('data-d-dev', app.dev);
    setAll('data-d-cat', app.cat);
    setAll('data-d-rating', app.rating.toFixed(1));
    setAll('data-d-reviews', app.reviews);
    setAll('data-d-size', app.size);
    setAll('data-d-price', app.price);
    setAll('data-d-age', app.age);
    setAll('data-d-desc', app.desc);
    setAll('data-d-date', app.updated);
    setAll('data-d-updated', 'Updated ' + app.updated);

    document.title = app.name + ' — PlayVerse';

    var tile = document.querySelector('[data-d-tile]');
    if (tile) { tile.className = 'tile tile-lg ' + app.art; tile.textContent = app.letter; }

    var back = document.querySelector('[data-d-backlink]');
    if (back) {
      var isApp = app.type === 'app';
      back.textContent = isApp ? 'Apps' : 'Games';
      back.setAttribute('href', isApp ? 'apps.html' : 'games.html');
    }

    var tags = document.querySelector('[data-d-tags]');
    if (tags && app.tags && app.tags.length) {
      tags.innerHTML = app.tags.map(function (t) {
        return '<span class="badge">' + t + '</span>';
      }).join('');
    }
    if (app.tags && app.tags.length) setAll('data-d-tagline', app.tags.join(' · '));

    // Shape the rating histogram around the actual score instead of leaving it fixed.
    var bars = document.querySelector('[data-d-bars]');
    if (bars) {
      var p5 = Math.max(20, Math.min(95, Math.round((app.rating - 3) / 2 * 100)));
      var rest = 100 - p5;
      var p4 = Math.round(rest * 0.55);
      var p3 = Math.round((rest - p4) * 0.5);
      var p2 = Math.round((rest - p4 - p3) * 0.5);
      var p1 = rest - p4 - p3 - p2;
      var widths = [p5, p4, p3, p2, p1];
      var fills = bars.querySelectorAll('.bar > i');
      for (var b = 0; b < fills.length && b < widths.length; b++) {
        fills[b].style.width = Math.max(widths[b], 1) + '%';
      }
    }

    // Rotate the placeholder screenshot artwork so each title looks distinct.
    var shots = document.querySelector('[data-d-shots]');
    if (shots) {
      var palette = ['art-1','art-2','art-3','art-4','art-5','art-6',
                     'art-7','art-8','art-9','art-10','art-11','art-12'];
      var start = palette.indexOf(app.art);
      if (start < 0) start = 0;
      var frames = shots.children;
      for (var s = 0; s < frames.length; s++) {
        frames[s].className = 'shot ' + palette[(start + s * 3) % palette.length];
      }
    }

    installBtn.setAttribute('data-app-id', app.id);
    installBtn.setAttribute('data-app-name', app.name);
  }

  /* ---------- 13. BroadEngage / MCPForge chat widget ----------
     Loaded on every page, because every page includes this file.
     The bot answers from the store's own JSON API via its MCP tools.     */
  /* The assistant lives in its own file. Loading it from here means every
     page gets it without a script tag of its own.

     To go back to the hosted BroadEngage bot once their chat page serves its
     CSS and JS correctly, point ASSISTANT_SRC at a loader that iframes
     https://app.broadengage.com/mfe-mcp/chat/830414c9-2b0b-4024-99c3-e1d45c366370
     instead. Nothing else here needs to change. */
  var ASSISTANT_SRC = 'assets/js/assistant.js';

  function initChatWidget() {
    if (document.getElementById('pv-assistant-js')) return;
    var s = document.createElement('script');
    s.id = 'pv-assistant-js';
    s.src = ASSISTANT_SRC;
    s.defer = true;
    document.body.appendChild(s);
  }


  /* ---------- 14. Footer year ---------- */
  function initYear() {
    var y = new Date().getFullYear();
    Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
      el.textContent = y;
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    initTheme();
    initActiveTab();
    initDetail();
    updateLibCount();
    initLibraryButtons();
    initBrowse();
    initTopSearch();
    initChartTabs();
    renderLibrary();
    initClearLibrary();
    initFaq();
    initForm();
    initChatWidget();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
