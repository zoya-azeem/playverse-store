/* ==========================================================================
   PlayVerse assistant - a styled chat widget that answers from the store's
   own JSON API (/api/*.json). No third-party service, no API key, no build.

   It is not an LLM: it matches intent and then reports real data from the
   API, so it can never invent a title, rating or price.
   ========================================================================== */
(function () {
  'use strict';

  var BOT_NAME = 'Sierra';
  var catalogue = null;      // loaded lazily on first open
  var loadError = false;

  /* ---------------- data ---------------- */

  function loadCatalogue() {
    if (catalogue || loadError) return Promise.resolve();
    return fetch('api/titles.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) { catalogue = d.titles || []; })
      .catch(function () { loadError = true; });
  }

  function getDetail(id) {
    return fetch('api/titles/' + id + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function getReviews(id) {
    return fetch('api/reviews/' + id + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ---------------- helpers ---------------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function findTitles(q) {
    if (!catalogue) return [];
    var hits = [];
    catalogue.forEach(function (t) {
      var name = t.name.toLowerCase();
      var short = name.replace(/\s+\d+$/, '');     // "pocket racer 9" -> "pocket racer"
      if (q.indexOf(name) !== -1 || q.indexOf(t.id) !== -1 ||
          (short.length > 4 && q.indexOf(short) !== -1)) {
        hits.push(t);
      }
    });
    return hits;
  }

  function findCategory(q) {
    if (!catalogue) return null;
    var found = null;
    catalogue.forEach(function (t) {
      if (q.indexOf(t.category.toLowerCase()) !== -1) found = t.category;
    });
    return found;
  }

  function titleLine(t) {
    return '<a href="' + t.id + '.html"><strong>' + esc(t.name) + '</strong></a> &middot; ' +
           esc(t.category) + ' &middot; ' + t.rating + ' &#9733; &middot; ' +
           esc(t.size) + ' &middot; ' + esc(t.price);
  }

  function listOf(items, heading) {
    return heading + '<ul class="pv-msg-list">' + items.map(function (t) {
      return '<li>' + titleLine(t) + '</li>';
    }).join('') + '</ul>';
  }

  /* ---------------- answering ---------------- */

  function answer(raw) {
    var q = raw.toLowerCase().trim();

    if (loadError || !catalogue) {
      return Promise.resolve('I could not reach the store data just now. ' +
        'Try <a href="games.html">the games page</a> instead.');
    }

    // greeting
    if (/^(hi+|hey+|hello+|yo|namaste|salaam|hola)\b/.test(q) || q === '') {
      return Promise.resolve('Hello. Ask me about any game or app in the store &mdash; ' +
        'what is available, what a title costs, or what people said about it.');
    }

    // help
    if (/^(help|what can you do|how do you work)/.test(q)) {
      return Promise.resolve('I answer from the store\'s own data. Try:' +
        '<ul class="pv-msg-list"><li>What games do you have?</li>' +
        '<li>Tell me about Mindfold</li>' +
        '<li>What do people say about Kingdom of Ash?</li>' +
        '<li>Compare Mindfold and Pocket Racer 9</li></ul>');
    }

    var hits = findTitles(q);
    var wantsReviews = /review|people say|say about|worth it|any good|opinion|rating/.test(q);
    var wantsCompare = /compare|versus|\bvs\b|better/.test(q);
    var wantsList = /what|which|list|show|available|have|browse|all /.test(q);

    // compare two titles
    if (wantsCompare && hits.length >= 2) {
      return Promise.all([getDetail(hits[0].id), getDetail(hits[1].id)]).then(function (d) {
        if (!d[0] || !d[1]) return 'I could not load both of those.';
        var rows = [
          ['Category', d[0].category, d[1].category],
          ['Rating', d[0].rating + ' ★', d[1].rating + ' ★'],
          ['Size', d[0].size, d[1].size],
          ['Price', d[0].price, d[1].price],
          ['Age', d[0].contentRating, d[1].contentRating]
        ];
        return '<table class="pv-msg-table"><thead><tr><th></th><th>' +
          esc(d[0].name) + '</th><th>' + esc(d[1].name) + '</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td>' + r[0] + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>';
          }).join('') + '</tbody></table>';
      });
    }

    // reviews for a title
    if (hits.length && wantsReviews) {
      return getReviews(hits[0].id).then(function (d) {
        if (!d || !d.reviews || !d.reviews.length) return 'No reviews loaded for that one.';
        return '<strong>' + esc(d.titleName) + '</strong> &mdash; ' + d.rating +
          ' &#9733; from ' + esc(d.reviewCount) + ' reviews.' +
          d.reviews.slice(0, 2).map(function (r) {
            return '<div class="pv-msg-quote">' + '&#9733;'.repeat(r.stars) +
              ' <em>' + esc(r.author) + '</em><br>' + esc(r.text) + '</div>';
          }).join('') +
          '<a href="' + d.titleId + '-reviews.html">Read all reviews &rarr;</a>';
      });
    }

    // one title in detail
    if (hits.length === 1) {
      return getDetail(hits[0].id).then(function (d) {
        if (!d) return 'I could not load that one.';
        return '<strong>' + esc(d.name) + '</strong> by ' + esc(d.developer) + '<br>' +
          esc(d.description) +
          '<div class="pv-msg-facts">' + esc(d.category) + ' &middot; ' + d.rating +
          ' &#9733; &middot; ' + esc(d.size) + ' &middot; ' + esc(d.price) +
          ' &middot; ' + esc(d.contentRating) + '</div>' +
          '<a href="' + d.id + '.html">Open its page &rarr;</a>';
      });
    }

    // several titles matched
    if (hits.length > 1) {
      return Promise.resolve(listOf(hits, 'I found a few:'));
    }

    // by category
    var cat = findCategory(q);
    if (cat) {
      var inCat = catalogue.filter(function (t) { return t.category === cat; });
      return Promise.resolve(listOf(inCat, 'In <strong>' + esc(cat) + '</strong>:'));
    }

    // games / apps / everything
    if (/\bapps?\b/.test(q)) {
      return Promise.resolve(listOf(
        catalogue.filter(function (t) { return t.type === 'app'; }), 'The apps:'));
    }
    if (/\bgames?\b/.test(q) || (wantsList && /title|store|everything|all/.test(q))) {
      return Promise.resolve(listOf(
        catalogue.filter(function (t) { return t.type === 'game'; }), 'The games:'));
    }
    if (wantsList) {
      return Promise.resolve(listOf(catalogue, 'Everything in the store:'));
    }

    // free / cheap
    if (/free|cheap|price|cost/.test(q)) {
      return Promise.resolve(listOf(
        catalogue.filter(function (t) { return t.price === 'Free'; }), 'Free right now:'));
    }
    // small downloads
    if (/small|light|size|mb\b|space/.test(q)) {
      var small = catalogue.filter(function (t) { return /MB/.test(t.size); });
      return Promise.resolve(listOf(small, 'The smaller downloads:'));
    }
    // best / recommend
    if (/best|top|recommend|popular|suggest/.test(q)) {
      var top = catalogue.slice().sort(function (a, b) { return b.rating - a.rating; }).slice(0, 3);
      return Promise.resolve(listOf(top, 'Highest rated:'));
    }

    // nothing matched - say so honestly
    return Promise.resolve(
      'That is not in the PlayVerse store. The store has six titles:' +
      '<ul class="pv-msg-list">' + catalogue.map(function (t) {
        return '<li>' + titleLine(t) + '</li>';
      }).join('') + '</ul>');
  }

  /* ---------------- UI ---------------- */

  function build() {
    if (document.getElementById('pv-chat-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'pv-chat-btn';
    btn.className = 'pv-chat-btn';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open the PlayVerse assistant');
    btn.innerHTML = '<span aria-hidden="true">💬</span>';

    var panel = document.createElement('div');
    panel.id = 'pv-chat-panel';
    panel.className = 'pv-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'PlayVerse assistant');
    panel.innerHTML =
      '<div class="pv-chat-head">' +
        '<span class="pv-chat-title">' +
          '<span class="pv-chat-dot" aria-hidden="true"></span>' + BOT_NAME +
        '</span>' +
        '<button type="button" class="pv-chat-close" aria-label="Close the assistant">&times;</button>' +
      '</div>' +
      '<div class="pv-chat-log" id="pv-chat-log" role="log" aria-live="polite"></div>' +
      '<form class="pv-chat-form" id="pv-chat-form">' +
        '<input type="text" id="pv-chat-input" autocomplete="off" ' +
          'placeholder="Ask about a game or app..." aria-label="Ask about a game or app">' +
        '<button type="submit" aria-label="Send">&#10148;</button>' +
      '</form>';

    document.body.appendChild(panel);
    document.body.appendChild(btn);

    var log = panel.querySelector('#pv-chat-log');
    var form = panel.querySelector('#pv-chat-form');
    var input = panel.querySelector('#pv-chat-input');
    var started = false;

    function add(who, html) {
      var row = document.createElement('div');
      row.className = 'pv-msg pv-msg-' + who;
      row.innerHTML = html;
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
    }

    function typing() {
      var row = add('bot', '<span class="pv-typing"><i></i><i></i><i></i></span>');
      row.classList.add('pv-msg-typing');
      return row;
    }

    function chips() {
      var row = document.createElement('div');
      row.className = 'pv-chips';
      ['What games do you have?', 'Tell me about Mindfold', 'Best rated?']
        .forEach(function (t) {
          var c = document.createElement('button');
          c.type = 'button';
          c.className = 'pv-chip';
          c.textContent = t;
          c.addEventListener('click', function () { send(t); });
          row.appendChild(c);
        });
      log.appendChild(row);
    }

    function send(text) {
      if (!text.trim()) return;
      add('user', esc(text));
      input.value = '';
      var t = typing();
      // a short pause so the reply does not snap in before the question is read
      Promise.all([answer(text), new Promise(function (r) { setTimeout(r, 320); })])
        .then(function (res) {
          t.remove();
          add('bot', res[0]);
        });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      send(input.value);
    });

    function open() {
      panel.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Close the PlayVerse assistant');
      btn.innerHTML = '<span aria-hidden="true">✕</span>';

      if (!started) {
        started = true;
        loadCatalogue().then(function () {
          add('bot', 'Hi! Ask me about any game or app in the PlayVerse store.');
          chips();
        });
      }
      setTimeout(function () { input.focus(); }, 60);
    }

    function close() {
      panel.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open the PlayVerse assistant');
      btn.innerHTML = '<span aria-hidden="true">💬</span>';
    }

    btn.addEventListener('click', function () {
      if (panel.classList.contains('open')) { close(); } else { open(); }
    });
    panel.querySelector('.pv-chat-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
