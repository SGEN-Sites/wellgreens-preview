/* Wellgreens preview: "Emerald Aperture" behaviour. One file, no dependencies. */
(function () {
  'use strict';
  var d = document, w = window, root = d.documentElement;
  var WG = w.WG || {}; var T = WG.t || {}; var STORES = WG.stores || {}; var BASE = WG.base || './';
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = w.matchMedia('(pointer: fine)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var t = function (k, v) { var s = T[k] || k; if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  var slug = function (v) { return String(v || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
  var dataUrl = function (p) { return new URL(BASE + 'data/' + p, location.href).href; };

  /* ---------- store state ---------- */
  var DEFAULT = WG.defaultStore || 'pacific-beach-de-soto-st';
  var pageStore = (d.body.getAttribute('data-page-store') || '');
  function current() { var s = ls.get('wg-store'); return STORES[s] ? s : (STORES[pageStore] ? pageStore : DEFAULT); }
  function laNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour12: false, weekday: 'short', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
      return { day: day, h: (+o.hour % 24) + (+o.minute) / 60 };
    } catch (e) { var n = new Date(); return { day: n.getDay(), h: n.getHours() + n.getMinutes() / 60 }; }
  }
  function fmt(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); var ap = hh >= 12 ? 'PM' : 'AM'; var h12 = hh % 12 || 12; return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap; }
  function status(id) {
    var s = STORES[id]; if (!s || !s.hm) return { open: true, text: '' };
    var n = laNow(); var hrs = s.hm[n.day]; if (!hrs) return { open: false, text: t('status.closed') };
    if (n.h >= hrs[0] && n.h < hrs[1]) return { open: true, text: t('status.open') + ' ' + t('status.until', { time: fmt(hrs[1]) }), short: t('status.short.open', { time: fmt(hrs[1]) }) };
    var nx = fmt(n.h < hrs[0] ? hrs[0] : (s.hm[(n.day + 1) % 7] || hrs)[0]);
    return { open: false, text: t('status.closed') + ', ' + t('status.opens', { time: nx }), short: t('status.short.closed', { time: nx }) };
  }
  function applyStore() {
    var id = current(); var s = STORES[id] || {};
    // the header chip is small: "La Mesa - University Ave" shows as "University Ave" there (full name in its title and the picker)
    $$('[data-store-name]').forEach(function (el) { var chip = el.closest('.storechip'); el.textContent = chip ? (s.name || '').split(' - ').pop() : (s.name || ''); if (chip) chip.title = s.name || ''; });
    $$('[data-store-link]').forEach(function (a) { var h = a.getAttribute('href') || ''; if (/stores\/[a-z0-9-]+\//.test(h)) a.setAttribute('href', h.replace(/stores\/[a-z0-9-]+\//, 'stores/' + id + '/')); });
    $$('[data-store-status]').forEach(function (el) { var sid = el.getAttribute('data-store-status') || id; if (sid === 'current') sid = id; var st = status(sid); el.setAttribute('data-open', st.open ? 'true' : 'false'); var tx = $('[data-status-text]', el) || (el.hasAttribute('data-status-text') ? el : null); if (tx) tx.textContent = (el.classList.contains('storechip') && st.short) || st.text; });
    $$('[data-store-pick]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-store-pick') === id ? 'true' : 'false'); });
  }
  function setStore(id, nav) {
    if (!STORES[id]) return; ls.set('wg-store', id); applyStore();
    if (nav && pageStore && pageStore !== id && /\/stores\//.test(location.pathname)) { location.href = location.href.replace(/stores\/[a-z0-9-]+\//, 'stores/' + id + '/'); }
  }
  applyStore();
  setInterval(applyStore, 60000);

  /* ---------- age gate: answer first, then the store; leaves through an aperture ---------- */
  var gate = $('#gate');
  if (gate) {
    var ok = +ls.get('wg-age') > Date.now() - 30 * 864e5;
    if (!ok && !/[?&]noage/.test(location.search)) {
      gate.hidden = false; d.documentElement.style.overflow = 'hidden';
      var yes = $('[data-age-yes]', gate); setTimeout(function () { try { yes.focus({ preventScroll: true }); } catch (e) {} }, 60);
      gate.addEventListener('click', function (e) {
        var p = e.target.closest('[data-store-pick]'); if (p) { setStore(p.getAttribute('data-store-pick')); return; }
        if (e.target.closest('[data-age-no]')) { gate.classList.add('denied'); return; }
        if (e.target.closest('[data-age-yes]')) {
          ls.set('wg-age', String(Date.now())); if (!ls.get('wg-store')) setStore(current());
          if (reduce) { gate.hidden = true; d.documentElement.style.overflow = ''; return; }
          gate.classList.add('leaving'); setTimeout(function () { gate.hidden = true; gate.classList.remove('leaving'); d.documentElement.style.overflow = ''; }, 980);
        }
      });
      gate.addEventListener('keydown', function (e) { if (e.key !== 'Tab') return; var f = $$('button, a[href]', gate).filter(function (x) { return x.offsetParent; }); if (!f.length) return; var i = f.indexOf(d.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } });
    }
  }

  /* ---------- dialogs ---------- */
  var lastFocus = null;
  function openDlg(dlg) { if (!dlg) return; lastFocus = d.activeElement; dlg.classList.add('open'); dlg.setAttribute('aria-hidden', 'false'); d.documentElement.style.overflow = 'hidden'; var f = $('[data-autofocus]', dlg) || $('button, input, a[href]', dlg); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 50); }
  function closeDlg(dlg) { if (!dlg || !dlg.classList.contains('open')) return; dlg.classList.remove('open'); dlg.setAttribute('aria-hidden', 'true'); d.documentElement.style.overflow = ''; if (lastFocus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  $$('.dlg').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) closeDlg(dlg); });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { $$('.dlg.open').forEach(closeDlg); closeMenus(); } });
  var picker = $('#picker');
  d.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open-picker]'); if (o) { e.preventDefault(); openDlg(picker); return; }
    var p = e.target.closest('#picker [data-store-pick]'); if (p) { setStore(p.getAttribute('data-store-pick'), true); setTimeout(function () { closeDlg(picker); }, 180); return; }
    var sb = e.target.closest('[data-open-search]'); if (sb) { e.preventDefault(); openSearch(); }
  });

  /* ---------- header: mega menus, drawer ---------- */
  var items = $$('.nav__item');
  function closeMenus(except) { items.forEach(function (it) { if (it !== except) { it.classList.remove('open'); var b = $('.nav__btn', it); if (b && b.tagName === 'BUTTON') b.setAttribute('aria-expanded', 'false'); } }); }
  items.forEach(function (it) {
    var btn = $('button.nav__btn', it); if (!btn) return; var timer;
    btn.addEventListener('click', function () { var o = !it.classList.contains('open'); closeMenus(it); it.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    if (finePointer) {
      it.addEventListener('mouseenter', function () { clearTimeout(timer); closeMenus(it); it.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); });
      it.addEventListener('mouseleave', function () { timer = setTimeout(function () { it.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }, 180); });
    }
  });
  d.addEventListener('click', function (e) { if (!e.target.closest('.nav__item')) closeMenus(); });
  var burger = $('.burger'), drawer = $('#drawer');
  // the phone menu: opening hides the sticky bar, closing brings it back (onScroll re-reads the state); Escape closes it
  function setDrawer(o) { drawer.classList.toggle('open', o); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); d.documentElement.style.overflow = o ? 'hidden' : ''; d.body.classList.toggle('drawer-open', o); onScroll(); }
  if (burger && drawer) {
    burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('open')); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) { setDrawer(false); try { burger.focus({ preventScroll: true }); } catch (x) {} } });
  }

  /* ---------- headline split: words rise into the light ---------- */
  $$('.split').forEach(function (h) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/); var frag = d.createDocumentFragment();
          parts.forEach(function (p) { if (!p) return; if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; } var o = d.createElement('span'); o.className = 'w'; var inner = d.createElement('span'); inner.className = 'wi'; inner.style.setProperty('--i', i++); inner.textContent = p; o.appendChild(inner); frag.appendChild(o); });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(h);
  });

  /* ---------- reveals (observer + a settle sweep so a fast fling never leaves blanks) ---------- */
  var REV = '[data-rv], .split, .ap[data-ap], .sep-terrace, .sep-blade, .cant[data-cant], .col, .step, .steps, .foot__mark, .hero__ring';
  function reveal(el) { if (el.classList.contains('in')) return; el.classList.add('in'); if (el.matches('.ap[data-ap]')) el.classList.add('open'); }
  var revEls = $$(REV);
  if (reduce || !('IntersectionObserver' in w)) revEls.forEach(reveal);
  else {
    var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revEls.forEach(function (el) { io.observe(el); });
    var settle; w.addEventListener('scroll', function () { clearTimeout(settle); settle = setTimeout(function () { var vh = w.innerHeight; revEls.forEach(function (el) { if (!el.classList.contains('in') && el.getBoundingClientRect().top < vh * 0.98) reveal(el); }); }, 140); }, { passive: true });
  }

  /* ---------- scroll-linked: parallax, iris apertures, sticky bar, progress ---------- */
  var pars = $$('[data-par]'), irises = $$('.sep-iris'), prog = $('.progress');
  var sbar = $('.sbar'), hero = $('.hero, .phero, .storehero, .menuhero'), foot = $('.foot');
  var barDismissed = ss.get('wg-bar-x') === '1';
  var ticking = false;
  function onScroll() {
    ticking = false; var vh = w.innerHeight, y = w.scrollY;
    if (!reduce) {
      pars.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return; var k = parseFloat(el.getAttribute('data-par')) || 0.1; var c = (r.top + r.height / 2 - vh / 2); el.style.setProperty('--py', (-c * k).toFixed(1) + 'px'); });
      irises.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return; var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85))); el.style.setProperty('--w', (18 + p * p * 92).toFixed(1) + '%'); });
    }
    if (prog) { var h = d.documentElement.scrollHeight - vh; prog.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0); }
    if (sbar && !barDismissed) {
      var past = hero ? hero.getBoundingClientRect().bottom < vh * 0.35 : y > vh * 0.6;
      var footIn = foot ? foot.getBoundingClientRect().top < vh - 40 : false;
      var typing = d.activeElement && /INPUT|TEXTAREA|SELECT/.test(d.activeElement.tagName);
      var show = past && !footIn && !typing && !d.body.classList.contains('drawer-open') && !$('.dlg.open');
      sbar.classList.toggle('show', show); sbar.setAttribute('aria-hidden', show ? 'false' : 'true');
      $$('a, button', sbar).forEach(function (x) { x.tabIndex = show ? 0 : -1; });
    }
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  w.addEventListener('resize', onScroll); d.addEventListener('focusin', onScroll); d.addEventListener('focusout', function () { setTimeout(onScroll, 50); });
  onScroll();
  if (reduce) irises.forEach(function (el) { el.style.setProperty('--w', '110%'); });
  if (sbar) { var bx = $('.sbar__x', sbar); if (bx) bx.addEventListener('click', function () { barDismissed = true; ss.set('wg-bar-x', '1'); sbar.classList.remove('show'); sbar.setAttribute('aria-hidden', 'true'); }); }

  /* ---------- pointer light, tilt + glare, magnetic buttons ---------- */
  if (finePointer && !reduce) {
    $$('.keylight').forEach(function (sec) { var raf; sec.addEventListener('pointermove', function (e) { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; var r = sec.getBoundingClientRect(); sec.style.setProperty('--mx', (e.clientX - r.left) + 'px'); sec.style.setProperty('--my', (e.clientY - r.top) + 'px'); }); }); });
    $$('.bay, .trophy, [data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; el.style.setProperty('--ty2', ((x - 0.5) * 12).toFixed(2) + 'deg'); el.style.setProperty('--tx2', ((0.5 - y) * 10).toFixed(2) + 'deg'); el.style.setProperty('--lx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--ly', (y * 100).toFixed(1) + '%'); });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--ty2', '0deg'); el.style.setProperty('--tx2', '0deg'); });
    });
    $$('.btn').forEach(function (b) { b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.setProperty('--bx', (e.clientX - r.left) + 'px'); b.style.setProperty('--by', (e.clientY - r.top) + 'px'); }); });
    var ring = $('.hero__ring'), heroEl = $('.hero');
    if (ring && heroEl) heroEl.addEventListener('pointermove', function (e) { var x = e.clientX / w.innerWidth - 0.5, y = e.clientY / w.innerHeight - 0.5; ring.style.setProperty('--px', (x * 26).toFixed(1) + 'px'); ring.style.setProperty('--py', (y * 20).toFixed(1) + 'px'); });
  }

  /* ---------- hero video: plays on phones (portrait file), poster under it, retry on first touch ---------- */
  var vid = $('.hero__media video');
  if (vid) {
    if (reduce) vid.remove();
    else {
      var tall = w.matchMedia('(max-width: 767px)').matches;
      vid.src = new URL(vid.getAttribute(tall ? 'data-tall' : 'data-wide'), location.href).href;
      vid.muted = true; vid.playsInline = true;
      var play = function () { var p = vid.play(); if (p && p.then) p.then(function () { vid.classList.add('playing'); }).catch(function () {}); };
      vid.addEventListener('playing', function () { vid.classList.add('playing'); });
      play(); d.addEventListener('touchstart', play, { once: true, passive: true });
      var vio = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) play(); else vid.pause(); }); }); vio.observe(vid);
    }
  }

  /* ---------- deal deck ---------- */
  $$('.deck').forEach(function (deck) {
    var cards = $$('.deck__card', deck), dots = $$('.deck__dots button', deck), n = cards.length, cur = 0, timer;
    if (!n) return;
    function show(i) { cur = (i + n) % n; cards.forEach(function (c, k) { var p = k - cur; if (p > n / 2) p -= n; if (p < -n / 2) p += n; c.setAttribute('data-pos', Math.abs(p) > 1 ? (p > 0 ? 2 : -2) : p); c.setAttribute('aria-hidden', p === 0 ? 'false' : 'true'); $$('a', c).forEach(function (a) { a.tabIndex = p === 0 ? 0 : -1; }); }); dots.forEach(function (b, k) { b.setAttribute('aria-current', k === cur ? 'true' : 'false'); }); }
    function auto() { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (!deck.matches(':hover') && !deck.contains(d.activeElement)) show(cur + 1); }, 6000); }
    $('[data-deck-prev]', deck) && $('[data-deck-prev]', deck).addEventListener('click', function () { show(cur - 1); auto(); });
    $('[data-deck-next]', deck) && $('[data-deck-next]', deck).addEventListener('click', function () { show(cur + 1); auto(); });
    dots.forEach(function (b, k) { b.addEventListener('click', function () { show(k); auto(); }); });
    var sx = null; deck.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true }); deck.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { show(cur + (dx < 0 ? 1 : -1)); auto(); } sx = null; });
    show(0); auto();
  });

  /* ---------- brand ring: turns slowly, drag to spin, focus brings a tile forward ---------- */
  $$('.ringwrap').forEach(function (wrap) {
    var ringEl = $('.ring', wrap), tiles = $$('.ring__tile', wrap), n = tiles.length; if (!n) return;
    var step = 360 / n; ringEl.style.setProperty('--step', step + 'deg');
    function layout() { var tw = tiles[0].offsetWidth || 200; var rz = Math.round((tw / 2) / Math.tan(Math.PI / n) + 26); ringEl.style.setProperty('--rz', rz + 'px'); }
    layout(); w.addEventListener('resize', layout);
    var rot = 0, vel = reduce ? 0 : -0.06, drag = false, lx = 0, visible = true, raf;
    var vis = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) loop(); }); vis.observe(wrap);
    function loop() { cancelAnimationFrame(raf); if (!visible) return; if (!drag) { rot += vel; vel += ((reduce ? 0 : -0.06) - vel) * 0.02; } ringEl.style.setProperty('--rot', rot.toFixed(2) + 'deg'); raf = requestAnimationFrame(loop); }
    wrap.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; wrap.setPointerCapture && wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', function (e) { if (!drag) return; var dx = e.clientX - lx; lx = e.clientX; rot += dx * 0.25; vel = dx * 0.25; });
    var end = function () { drag = false; }; wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    var moved = 0; wrap.addEventListener('pointerdown', function (e) { moved = e.clientX; }); wrap.addEventListener('click', function (e) { if (Math.abs(e.clientX - moved) > 6) e.preventDefault(); }, true);
    tiles.forEach(function (tl, i) { tl.addEventListener('focus', function () { rot = -i * step; vel = 0; }); });
    loop();
  });

  /* ---------- rails ---------- */
  $$('.rail').forEach(function (r) { var tr = $('.rail__track', r); $$('[data-rail]', r).forEach(function (b) { b.addEventListener('click', function () { tr.scrollBy({ left: (b.getAttribute('data-rail') === 'next' ? 1 : -1) * tr.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' }); }); }); });

  /* ---------- coupons ---------- */
  d.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]'); if (!c) return;
    var code = c.getAttribute('data-copy'); var done = function () { c.classList.add('copied'); var em = $('em', c); if (em) { var o = em.textContent; em.textContent = t('misc.copied'); setTimeout(function () { em.textContent = o; c.classList.remove('copied'); }, 1800); } };
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else done();
  });

  /* ---------- ZIP finder ---------- */
  $$('.zipf').forEach(function (f) {
    var inp = $('input', f), out = $('.zipf__out', f), zips = WG.zips || {};
    function check(e) { if (e) e.preventDefault(); var z = (inp.value || '').replace(/\D/g, '').slice(0, 5); if (z.length < 5) { out.textContent = ''; return; } var hit = zips[z]; if (hit) { out.innerHTML = esc(t('misc.zipYes', { area: hit.area, hub: hit.hub })) + ' <a href="' + esc(new URL(BASE + 'stores/' + hit.store + '/', location.href).href) + '">' + esc(t('misc.orderDelivery')) + '</a>'; } else out.textContent = t('misc.zipNo'); }
    f.addEventListener('submit', check); inp.addEventListener('input', function () { if (inp.value.replace(/\D/g, '').length >= 5) check(); });
  });

  /* ---------- store plan: pin <-> row ---------- */
  $$('.plan').forEach(function (plan) {
    var pins = $$('.pin', plan), rows = $$('.srow', plan);
    function on(id, v) { pins.concat(rows).forEach(function (x) { if (x.getAttribute('data-id') === id) x.classList.toggle('on', v); }); }
    pins.concat(rows).forEach(function (x) { var id = x.getAttribute('data-id'); x.addEventListener('mouseenter', function () { on(id, true); }); x.addEventListener('mouseleave', function () { on(id, false); }); x.addEventListener('focus', function () { on(id, true); }); x.addEventListener('blur', function () { on(id, false); }); });
    pins.forEach(function (p) { p.addEventListener('click', function () { var r = rows.filter(function (x) { return x.getAttribute('data-id') === p.getAttribute('data-id'); })[0]; if (r) location.href = r.href; }); });
  });

  /* ---------- article: contents highlight ---------- */
  var toc = $('.toc');
  if (toc && 'IntersectionObserver' in w) {
    var links = $$('a', toc); var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var cio = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { links.forEach(function (a) { a.classList.remove('on'); }); var a = map[x.target.id]; if (a) a.classList.add('on'); } }); }, { rootMargin: '-20% 0px -70% 0px' });
    $$('.chap[id]').forEach(function (c) { cio.observe(c); });
  }
  /* FAQ nav highlight */
  $$('.faqnav a').forEach(function (a) { a.addEventListener('click', function () { $$('.faqnav a').forEach(function (x) { x.classList.remove('on'); }); a.classList.add('on'); }); });

  /* ---------- preview forms ---------- */
  $$('form[data-preview]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); f.classList.add('sent'); }); });

  /* ---------- filters on lists (brands A to Z, resources) ---------- */
  $$('[data-filter-list]').forEach(function (inp) {
    var target = $(inp.getAttribute('data-filter-list')); if (!target) return;
    inp.addEventListener('input', function () { var q = inp.value.trim().toLowerCase(); $$('[data-name]', target).forEach(function (el) { el.hidden = q && el.getAttribute('data-name').indexOf(q) < 0; }); $$('[data-grp]', target).forEach(function (g) { g.hidden = !$$('[data-name]', g).some(function (x) { return !x.hidden; }); }); });
  });
  $$('[data-more-list]').forEach(function (btn) {
    var target = $(btn.getAttribute('data-more-list')); var step = +btn.getAttribute('data-step') || 12;
    btn.addEventListener('click', function () { var hidden = $$('[data-more-hidden]', target).slice(0, step); hidden.forEach(function (el, k) { el.removeAttribute('data-more-hidden'); el.hidden = false; }); if (!$$('[data-more-hidden]', target).length) btn.hidden = true; });
  });
  $$('[data-topic]').forEach(function (b) {
    b.addEventListener('click', function () { var tp = b.getAttribute('data-topic'); $$('[data-topic]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); var list = $(b.closest('[data-topics]').getAttribute('data-topics')); $$('[data-tp]', list).forEach(function (el) { var okk = tp === 'all' || el.getAttribute('data-tp').split(' ').indexOf(tp) >= 0; el.hidden = !okk; if (okk) el.removeAttribute('data-more-hidden'); }); var more = $('[data-more-list]'); if (more) more.hidden = true; });
  });

  /* ---------- products: shared card renderer ---------- */
  var IMG = function (h, s) { return 'https://images.dutchie.com/' + h + '?auto=format%2Ccompress&fit=fill&fill=solid&fill-color=F1EFE6&q=72&w=' + (s || 360) + '&h=' + (s || 360); };
  var money = function (n) { return n == null || isNaN(n) ? '' : '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, ''); };
  var LIVE = 'https://www.wellgreens.store/stores/';
  function card(p, store, k) {
    var price = p.sp != null && p.sp < p.p ? '<span class="pc__price sale"><b>' + money(p.sp) + '</b><s>' + money(p.p) + '</s>' : '<span class="pc__price"><b>' + money(p.p) + '</b>';
    price += p.o ? '<small>' + esc(p.o) + '</small></span>' : '</span>';
    var badge = p.d ? '<span class="pc__badge">' + esc(t('shop.special')) + '</span>' : (p.x ? '<span class="pc__badge pc__badge--alt">' + esc(p.x) + '</span>' : '');
    var meta = (p.s ? '<i data-s="' + esc(p.s) + '"></i>' + esc(p.s) : '') + (p.thc ? (p.s ? ' · ' : '') + 'THC ' + esc(p.thc) : '');
    return '<article class="pc pc--new" style="--k:' + (k % 24) + '" data-id="' + esc(p.id) + '"><button class="pc__stage" type="button" data-quick="' + esc(p.id) + '" aria-label="' + esc(t('shop.quick') + ': ' + p.n) + '">' + badge + '<img src="' + IMG(p.i) + '" alt="" loading="lazy" decoding="async" width="360" height="360"><span class="pc__quick">' + esc(t('shop.quick')) + '</span></button><div class="pc__body"><span class="pc__brand">' + esc(p.b) + '</span><h3 class="pc__name">' + esc(p.n) + '</h3><span class="pc__meta">' + meta + '</span><div class="pc__foot">' + price + '<a class="pc__add" href="' + LIVE + store + '/product/' + esc(p.u) + '" target="_blank" rel="noopener" aria-label="' + esc(t('shop.order') + ': ' + p.n) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>' + esc(t('shop.order')) + '</span></a></div></div></article>';
  }
  var cache = {};
  function load(p) { if (!cache[p]) cache[p] = fetch(dataUrl(p)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); return cache[p]; }

  /* ---------- quick view ---------- */
  var qv = $('#qv'); var qvData = {};
  function quick(p, store) {
    if (!qv || !p) return;
    var opts = (p.opts || [[p.o, p.p, p.sp]]).map(function (o) { return '<div class="qv__opt"><span>' + esc(o[0] || '') + '</span><span>' + (o[2] != null && o[2] < o[1] ? '<s>' + money(o[1]) + '</s>' + money(o[2]) : money(o[1])) + '</span></div>'; }).join('');
    $('.qv__body', qv).innerHTML = '<div class="qv__grid"><div class="qv__img"><img src="' + IMG(p.i, 640) + '" alt="' + esc(p.n) + '"></div><div class="qv__tx"><small>' + esc(p.b) + '</small><h2 id="qv-title">' + esc(p.n) + '</h2><div class="qv__facts">' + (p.s ? '<span>' + esc(t('shop.strain')) + ': ' + esc(p.s) + '</span>' : '') + (p.thc ? '<span>THC ' + esc(p.thc) + '</span>' : '') + (p.cbd ? '<span>CBD ' + esc(p.cbd) + '</span>' : '') + (p.c ? '<span>' + esc(p.c) + '</span>' : '') + '</div><h3 class="small" style="font-family:var(--f-body);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-3);font-size:.72rem">' + esc(t('shop.sizes')) + '</h3><div class="qv__opts">' + opts + '</div>' + (p.dl && p.dl.length ? '<div class="qv__deals">' + p.dl.slice(0, 3).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '<a class="btn" href="' + LIVE + store + '/product/' + esc(p.u) + '" target="_blank" rel="noopener">' + esc(t('shop.orderAt', { store: (STORES[store] || {}).name || '' })) + '</a><p class="qv__note">' + esc(t('shop.cartNote')) + '</p></div></div>';
    openDlg(qv);
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-quick]'); if (!b) return; e.preventDefault();
    var id = b.getAttribute('data-quick'); var holder = b.closest('[data-store-of]') || b.closest('.shop'); var store = holder ? holder.getAttribute('data-store-of') || holder.getAttribute('data-store') : current();
    if (qvData[id]) { quick(qvData[id], store); return; }
    var src = holder && holder.getAttribute('data-json'); if (!src) return;
    load(src).then(function (j) { (j.products || []).forEach(function (p) { qvData[p.id] = p; }); quick(qvData[id], store); });
  });

  /* ---------- the menu grid: search, type, brand, kind, sort, honest counts ---------- */
  $$('.shop[data-json]').forEach(function (shop) {
    var store = shop.getAttribute('data-store'); var grid = $('.pgrid', shop), more = $('.shop__more button', shop), cnt = $('[data-count]', shop), empty = $('.shop__empty', shop);
    var qIn = $('[data-f="q"]', shop), tSel = $('[data-f="type"]', shop), bSel = $('[data-f="brand"]', shop), sSel = $('[data-f="sort"]', shop), subs = $$('.subs button', shop);
    var params = new URLSearchParams(location.search); var page = 0, PER = 48, all = [], list = [];
    var sub = params.get('sub') || 'all';
    load(shop.getAttribute('data-json')).then(function (j) {
      all = j.products || []; all.forEach(function (p) { qvData[p.id] = p; });
      if (bSel) { var brands = {}; all.forEach(function (p) { brands[p.b] = (brands[p.b] || 0) + 1; }); Object.keys(brands).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (b) { var o = d.createElement('option'); o.value = b; o.textContent = b + ' (' + brands[b] + ')'; bSel.appendChild(o); }); }
      var pb = params.get('brand'); if (pb && bSel) { var cb = function (v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }; var P = cb(pb); var opts = Array.prototype.slice.call(bSel.options).filter(function (o) { return o.value; }); var m = opts.filter(function (o) { return cb(o.value) === P; })[0] || opts.filter(function (o) { var V = cb(o.value); return V.length > 3 && P.length > 3 && (P.indexOf(V) === 0 || V.indexOf(P) === 0); })[0]; if (m) bSel.value = m.value; else if (qIn && !params.get('q')) qIn.value = pb.replace(/-/g, ' '); }
      if (params.get('q') && qIn) qIn.value = params.get('q');
      if (params.get('type') && tSel) tSel.value = params.get('type');
      if (params.get('deals') === '1') shop.setAttribute('data-deals', '1');
      subs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sub') === sub ? 'true' : 'false'); });
      apply(true);
    }).catch(function () { if (empty) { empty.classList.add('show'); } });
    function apply(first) {
      var q = qIn ? qIn.value.trim().toLowerCase() : '', ty = tSel ? tSel.value : '', br = bSel ? bSel.value : '', so = sSel ? sSel.value : 'featured', deals = shop.getAttribute('data-deals') === '1';
      var qw = q ? q.split(/\s+/).filter(Boolean) : [];
      list = all.filter(function (p) { var hay = (p.n + ' ' + p.b + ' ' + (p.s || '')).toLowerCase(); return (!qw.length || qw.every(function (x) { return hay.indexOf(x) >= 0; })) && (!ty || (p.s || '') === ty) && (!br || p.b === br) && (sub === 'all' || p.k === sub) && (!deals || p.d); });
      if (so === 'low') list.sort(function (a, b) { return (a.sp || a.p) - (b.sp || b.p); }); else if (so === 'high') list.sort(function (a, b) { return (b.sp || b.p) - (a.sp || a.p); }); else if (so === 'thc') list.sort(function (a, b) { return (b.tv || 0) - (a.tv || 0); }); else if (so === 'name') list.sort(function (a, b) { return a.n.localeCompare(b.n); });
      page = 0; grid.innerHTML = ''; render(); if (!first) { var u = new URL(location.href); ['q', 'type', 'brand', 'sub'].forEach(function (k) { u.searchParams.delete(k); }); if (q) u.searchParams.set('q', q); if (ty) u.searchParams.set('type', ty); if (br) u.searchParams.set('brand', slug(br)); if (sub !== 'all') u.searchParams.set('sub', sub); history.replaceState(null, '', u); }
    }
    function render() { var slice = list.slice(page * PER, (page + 1) * PER); grid.insertAdjacentHTML('beforeend', slice.map(function (p, k) { return card(p, store, k); }).join('')); page++; var shown = Math.min(list.length, page * PER); if (cnt) cnt.innerHTML = t('shop.showing', { a: '<b>' + shown + '</b>', b: '<b>' + list.length + '</b>' }); if (more) more.parentNode.hidden = shown >= list.length; if (empty) empty.classList.toggle('show', !list.length); }
    if (more) more.addEventListener('click', render);
    [qIn, tSel, bSel, sSel].forEach(function (x) { if (x) x.addEventListener(x.tagName === 'INPUT' ? 'input' : 'change', function () { apply(); }); });
    subs.forEach(function (b) { b.addEventListener('click', function () { sub = b.getAttribute('data-sub'); subs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); apply(); }); });
    var clr = $('[data-clear]', shop); if (clr) clr.addEventListener('click', function () { if (qIn) qIn.value = ''; if (tSel) tSel.value = ''; if (bSel) bSel.value = ''; sub = 'all'; subs.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-sub') === 'all' ? 'true' : 'false'); }); shop.removeAttribute('data-deals'); apply(); });
  });

  /* ---------- rails filled from the selected store (home "on special", shop the post, brand pages) ---------- */
  $$('[data-rail-src]').forEach(function (r) {
    var track = $('.rail__track', r) || r; var mode = r.getAttribute('data-rail-mode') || 'deals'; var kw = (r.getAttribute('data-rail-kw') || '').toLowerCase().split('|').filter(Boolean); var brand = (r.getAttribute('data-rail-brand') || '').toLowerCase();
    var store = r.getAttribute('data-store-of') === 'current' || !r.getAttribute('data-store-of') ? current() : r.getAttribute('data-store-of');
    r.setAttribute('data-store-of', store); r.setAttribute('data-json', store + '/all.json');
    load(store + '/all.json').then(function (j) {
      var ps = j.products || []; ps.forEach(function (p) { qvData[p.id] = p; });
      var pick = ps.filter(function (p) { if (brand) return p.b.toLowerCase() === brand; if (mode === 'deals') return p.d && p.sp != null && p.sp < p.p; if (kw.length) return kw.some(function (k) { return (p.n + ' ' + p.b + ' ' + p.c).toLowerCase().indexOf(k) >= 0; }); return true; });
      if (mode === 'deals') pick.sort(function (a, b) { return (1 - b.sp / b.p) - (1 - a.sp / a.p); });
      pick = pick.slice(0, 14);
      if (!pick.length) { var hideEl = r.closest('[data-rail-section]'); if (hideEl) hideEl.hidden = true; return; }
      track.innerHTML = pick.map(function (p, k) { return card(p, store, k); }).join('');
      $$('[data-rail-count]', r.closest('section') || r).forEach(function (el) { el.textContent = pick.length; });
    }).catch(function () { var hideEl = r.closest('[data-rail-section]'); if (hideEl) hideEl.hidden = true; });
  });

  /* ---------- in-stock: every store, one search ---------- */
  $$('.instock').forEach(function (box) {
    var inp = $('input', box), out = $('.instock__out', box), idx = null;
    function run() { var q = inp.value.trim().toLowerCase(); if (q.length < 2) { out.innerHTML = ''; return; } (idx ? Promise.resolve(idx) : load('instock.json').then(function (j) { idx = j; return j; })).then(function (j) { var hits = j.items.filter(function (it) { return (it.n + ' ' + it.b).toLowerCase().indexOf(q) >= 0; }).slice(0, 30); out.innerHTML = hits.length ? hits.map(function (it) { return '<div class="isrow"><img src="' + IMG(it.i, 120) + '" alt="" loading="lazy"><div><small>' + esc(it.b) + '</small><b>' + esc(it.n) + '</b><span>' + it.s.map(function (s) { return '<a href="' + LIVE + s[0] + '/product/' + esc(s[1]) + '" target="_blank" rel="noopener">' + esc((STORES[s[0]] || {}).name || s[0]) + ' · ' + money(s[2]) + '</a>'; }).join('') + '</span></div></div>'; }).join('') : '<p class="empty">' + esc(t('search.none')) + '</p>'; }); }
    var deb; inp.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(run, 160); });
  });

  /* ---------- site search ---------- */
  var sdlg = $('#search'), sidx = null;
  function openSearch() { if (!sdlg) return; openDlg(sdlg); }
  if (sdlg) {
    var sin = $('input', sdlg), sout = $('.srch__res', sdlg);
    var run = function () {
      var q = sin.value.trim().toLowerCase(); if (q.length < 2) { sout.innerHTML = ''; return; }
      var store = current();
      Promise.all([sidx ? Promise.resolve(sidx) : load('search.json').then(function (j) { sidx = j; return j; }), load(store + '/all.json').catch(function () { return { products: [] }; })]).then(function (r) {
        var j = r[0], prods = (r[1].products || []).filter(function (p) { return (p.n + ' ' + p.b).toLowerCase().indexOf(q) >= 0; }).slice(0, 8);
        var brands = j.brands.filter(function (b) { return b.n.toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
        var guides = j.guides.filter(function (g) { return g.n.toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
        var pages = j.pages.filter(function (g) { return g.n.toLowerCase().indexOf(q) >= 0; }).slice(0, 5);
        var h = '';
        if (prods.length) h += '<div class="srch__grp"><h3>' + esc(t('search.products', { store: (STORES[store] || {}).name || '' })) + '</h3>' + prods.map(function (p) { return '<a href="' + LIVE + store + '/product/' + esc(p.u) + '" target="_blank" rel="noopener"><img src="' + IMG(p.i, 96) + '" alt=""><span>' + esc(p.n) + '<small>' + esc(p.b) + ' · ' + money(p.sp != null && p.sp < p.p ? p.sp : p.p) + '</small></span></a>'; }).join('') + '</div>';
        if (brands.length) h += '<div class="srch__grp"><h3>' + esc(t('search.brands')) + '</h3>' + brands.map(function (b) { return '<a href="' + new URL(BASE + b.u, location.href).href + '"><span>' + esc(b.n) + '</span></a>'; }).join('') + '</div>';
        if (guides.length || pages.length) h += '<div class="srch__grp"><h3>' + esc(t('search.guides')) + '</h3>' + pages.concat(guides).map(function (g) { return '<a href="' + new URL(BASE + g.u, location.href).href + '"><span>' + esc(g.n) + '</span></a>'; }).join('') + '</div>';
        sout.innerHTML = h || '<p class="muted">' + esc(t('search.none')) + '</p>';
      });
    };
    var sdeb; sin.addEventListener('input', function () { clearTimeout(sdeb); sdeb = setTimeout(run, 140); });
  }
})();
