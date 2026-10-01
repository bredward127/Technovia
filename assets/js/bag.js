/* Shopping bag: stored per browser, priced only through STORE.quote(). */
(function () {
  const KEY = 'atelier.bag.v1';
  const money = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: STORE.currency, minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  };

  function read() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  let lines = read();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('bag:change'));
  }

  const Bag = {
    money: money,
    lines: function () { return lines.slice(); },
    count: function () { return lines.reduce(function (s, l) { return s + l.qty; }, 0); },
    quote: function (country) { return STORE.quote(lines, country); },
    add: function (variant, size, qty) {
      const found = lines.find(function (l) { return l.variant === variant && l.size === size; });
      if (found) found.qty = Math.min(10, found.qty + qty);
      else lines.push({ variant: variant, size: size, qty: qty });
      save();
    },
    setQty: function (variant, size, qty) {
      lines = lines.map(function (l) {
        return l.variant === variant && l.size === size ? { variant: l.variant, size: l.size, qty: Math.min(10, qty) } : l;
      }).filter(function (l) { return l.qty > 0; });
      save();
    },
    remove: function (variant, size) { Bag.setQty(variant, size, 0); },
    clear: function () { lines = []; save(); },
  };
  window.Bag = Bag;

  // Keep tabs in sync.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { lines = read(); document.dispatchEvent(new CustomEvent('bag:change')); }
  });

  /* ---- Toast ---- */
  let toastTimer;
  window.toast = function (msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-visible'); }, 2600);
  };

  /* ---- Drawer (only on pages that include it) ---- */
  const drawer = document.querySelector('.drawer');
  const overlay = document.querySelector('.overlay');
  const body = drawer && drawer.querySelector('.drawer__body');
  const foot = drawer && drawer.querySelector('.drawer__foot');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderDrawer() {
    document.querySelectorAll('.bag-count').forEach(function (el) { el.textContent = Bag.count(); });
    if (!drawer) return;
    const q = Bag.quote('US');
    drawer.querySelector('.drawer__title').textContent = 'Your bag (' + Bag.count() + ')';
    if (!q.items.length) {
      body.innerHTML = '<div class="drawer__empty"><p>Your bag is empty.</p><a href="#shop" class="btn" data-close-bag>Shop the hoodie</a></div>';
      foot.hidden = true;
      return;
    }
    foot.hidden = false;
    body.innerHTML = q.items.map(function (i) {
      return '<div class="line-item">' +
        '<div class="line-item__img"><img src="' + esc(i.image) + '" alt=""></div>' +
        '<div><h4>' + esc(STORE.product.name) + '</h4><p class="sub">' + esc(i.name) + ' · ' + esc(i.size) + '</p>' +
        '<div class="qty" data-v="' + esc(i.variant) + '" data-s="' + esc(i.size) + '">' +
        '<button type="button" data-step="-1" aria-label="Decrease quantity">−</button><span>' + i.qty + '</span>' +
        '<button type="button" data-step="1" aria-label="Increase quantity">+</button></div></div>' +
        '<div class="line-item__right"><span>' + money(i.unit * i.qty) + '</span>' +
        '<button type="button" data-remove data-v="' + esc(i.variant) + '" data-s="' + esc(i.size) + '">Remove</button></div>' +
        '</div>';
    }).join('');
    foot.querySelector('[data-subtotal]').textContent = money(q.subtotal);
  }

  function openBag() {
    if (!drawer) { location.href = 'checkout.html'; return; }
    drawer.classList.add('is-open'); overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    drawer.querySelector('.drawer__head button').focus({ preventScroll: true });
  }
  function closeBag() {
    if (!drawer) return;
    drawer.classList.remove('is-open'); overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }
  Bag.open = openBag;
  Bag.close = closeBag;

  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-open-bag], [data-close-bag], [data-step], [data-remove]');
    if (!t) return;
    if (t.hasAttribute('data-open-bag')) { e.preventDefault(); openBag(); }
    else if (t.hasAttribute('data-close-bag')) { closeBag(); }
    else if (t.hasAttribute('data-step') && t.closest('.drawer')) {
      const box = t.closest('.qty');
      const line = lines.find(function (l) { return l.variant === box.dataset.v && l.size === box.dataset.s; });
      if (line) Bag.setQty(line.variant, line.size, line.qty + parseInt(t.dataset.step, 10));
    } else if (t.hasAttribute('data-remove')) { Bag.remove(t.dataset.v, t.dataset.s); }
  });
  if (overlay) overlay.addEventListener('click', closeBag);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBag(); });
  document.addEventListener('bag:change', renderDrawer);
  renderDrawer();
})();
