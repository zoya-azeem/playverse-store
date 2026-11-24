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

  /* Retries three times with a short backoff. A deploy rolling out can serve a
     404 for a file that exists a second later, and a CDN edge can cache that
     404 briefly - so retries after the first ask the browser to revalidate
     rather than re-reading the same bad cached response. */
  function fetchJson(url, tries) {
    tries = tries || 3;

    function attempt(n) {
      var opts = n === 1 ? undefined : { cache: 'reload' };
      return fetch(url, opts)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .catch(function (err) {
          if (n >= tries) throw err;
          return new Promise(function (go) { setTimeout(go, 250 * n); })
            .then(function () { return attempt(n + 1); });
        });
    }

    return attempt(1);
  }

  function loadCatalogue() {
    if (catalogue) return Promise.resolve();
    return fetchJson('data/titles.json')
      .then(function (d) { catalogue = d.titles || []; loadError = false; })
      .catch(function () { loadError = true; });
  }

  function getDetail(id) {
    return fetchJson('data/titles/' + id + '.json').catch(function () { return null; });
  }

  function getReviews(id) {
    return fetchJson('data/reviews/' + id + '.json').catch(function () { return null; });
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

  /* ---------------- lead capture ---------------- */

  /* Collected one field at a time, because parsing a name and an email out of
     one free-text message gets it wrong often enough to matter. The details go
     to /api/lead on this site, never to the CRM directly - the credential for
     that lives server-side in a Vercel environment variable. */

  var lead = { step: null, name: '', email: '', topic: '' };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function resetLead() {
    lead = { step: null, name: '', email: '', topic: lead.topic };
  }

  function submitLead() {
    return fetch('api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        message: lead.topic || 'Asked to be contacted via the website assistant'
      })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        var who = esc(lead.name.split(' ')[0] || 'there');
        resetLead();
        if (res.ok && res.d && res.d.success) {
          return 'Thanks ' + who + ' &mdash; passed to the team. Someone will email you.';
        }
        return esc((res.d && res.d.error) || 'That did not save. Please try again in a moment.');
      })
      .catch(function () {
        resetLead();
        return 'I could not reach the server just now. Please try again in a moment.';
      });
  }

  function handleLeadStep(raw, q) {
    if (/^(no|nope|cancel|stop|never ?mind|not now|later)\b/.test(q)) {
      resetLead();
      return Promise.resolve('No problem. Ask me anything else about the store.');
    }

    if (lead.step === 'name') {
      var name = raw.trim().replace(/^(my name is|i am|i'm|this is)\s+/i, '').slice(0, 120);
      if (name.length < 2) {
        return Promise.resolve('What name should I put down?');
      }
      lead.name = name;
      lead.step = 'email';
      return Promise.resolve('Thanks ' + esc(name.split(' ')[0]) +
        '. What is the best email to reach you on?');
    }

    if (lead.step === 'email') {
      var m = raw.match(/[^\s@]+@[^\s@]+\.[^\s@]{2,}/);
      var email = m ? m[0] : raw.trim();
      if (!EMAIL_RE.test(email)) {
        return Promise.resolve('That does not look like an email address. ' +
          'Could you type it again, or say <em>cancel</em> to stop?');
      }
      lead.email = email;
      lead.step = 'sending';
      return submitLead();
    }

    return Promise.resolve('');
  }

  /* ---------------- answering ---------------- */

  function answer(raw) {
    var q = raw.toLowerCase().trim();

    // mid-conversation lead capture takes priority over everything else
    if (lead.step && lead.step !== 'sending') return handleLeadStep(raw, q);

    /* Someone asking to be contacted. Checked before the catalogue guard
       below, because passing a lead to the team does not need the catalogue -
       and a visitor who wants to be contacted is exactly who we must not drop
       if the store data happens to be unavailable. */
    if (/contact|get in touch|talk to (someone|a human|the team)|reach out|call me|email me|publish (my|a|our)|submit (my|a|our)|list my (game|app)|partner|work with you|sales|\bdemo\b/.test(q)) {
      lead.step = 'name';
      lead.topic = raw.trim().slice(0, 300);
      return Promise.resolve('Happy to pass you to the team. What is your name?');
    }

    /* If the catalogue is missing, try loading it again before giving up. The
       first attempt can fail during a deploy, and without this the widget
       stayed broken for the rest of the visit even once the data came back. */
    if (!catalogue) {
      return loadCatalogue().then(function () {
        if (!catalogue) {
          return 'I could not reach the store data just now. ' +
            'Try <a href="games.html">the games page</a> instead.';
        }
        return answer(raw);   // data is in - answer it properly this time
      });
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
        lead.topic = 'Asked about ' + d.name;   // used if they later ask to be contacted
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
      ['What games do you have?', 'Tell me about Mindfold', 'Talk to the team']
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
