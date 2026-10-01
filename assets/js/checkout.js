/* Checkout: shipping details + PayPal (PayPal, Venmo, Pay Later, cards). */
(function () {
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
  const form = $('#checkout-form');
  const FORM_KEY = 'atelier.checkout.form';
  const ORDER_KEY = 'atelier.lastOrder';

  const COUNTRIES = [
    ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['NZ', 'New Zealand'],
    ['IE', 'Ireland'], ['FR', 'France'], ['DE', 'Germany'], ['IT', 'Italy'], ['ES', 'Spain'], ['PT', 'Portugal'],
    ['NL', 'Netherlands'], ['BE', 'Belgium'], ['AT', 'Austria'], ['CH', 'Switzerland'], ['SE', 'Sweden'],
    ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['PL', 'Poland'], ['JP', 'Japan'], ['KR', 'South Korea'],
    ['SG', 'Singapore'], ['HK', 'Hong Kong'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'], ['IL', 'Israel'],
    ['MX', 'Mexico'], ['BR', 'Brazil'], ['ZA', 'South Africa'], ['NG', 'Nigeria'], ['JM', 'Jamaica'],
  ];
  const STATES = 'AL Alabama|AK Alaska|AZ Arizona|AR Arkansas|CA California|CO Colorado|CT Connecticut|DE Delaware|DC District of Columbia|FL Florida|GA Georgia|HI Hawaii|ID Idaho|IL Illinois|IN Indiana|IA Iowa|KS Kansas|KY Kentucky|LA Louisiana|ME Maine|MD Maryland|MA Massachusetts|MI Michigan|MN Minnesota|MS Mississippi|MO Missouri|MT Montana|NE Nebraska|NV Nevada|NH New Hampshire|NJ New Jersey|NM New Mexico|NY New York|NC North Carolina|ND North Dakota|OH Ohio|OK Oklahoma|OR Oregon|PA Pennsylvania|PR Puerto Rico|RI Rhode Island|SC South Carolina|SD South Dakota|TN Tennessee|TX Texas|UT Utah|VT Vermont|VA Virginia|WA Washington|WV West Virginia|WI Wisconsin|WY Wyoming'
    .split('|').map(function (s) { return [s.slice(0, 2), s.slice(3)]; });

  $$('[data-contact]').forEach(function (a) { a.href = 'mailto:' + STORE.supportEmail; });

  /* ---- Empty bag ---- */
  if (!Bag.quote('US').items.length) {
    $('[data-checkout]').innerHTML = '<section class="checkout__main" style="grid-column:1/-1"><div class="empty-checkout">' +
      '<p>Your bag is empty.</p><a class="btn" href="index.html#shop">Shop the Den Hoodie <span class="arrow">→</span></a></div></section>';
    return;
  }

  /* ---- Country + state selects ---- */
  const country = $('#country');
  const stateWrap = $('[data-state-wrap]');
  country.innerHTML = COUNTRIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('');
  function renderState() {
    const isUS = country.value === 'US';
    const current = $('#state').value;
    if (isUS) {
      if ($('#state').tagName !== 'SELECT') swapState('select');
      $('#state').innerHTML = '<option value="" disabled selected>Select</option>' + STATES.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
      if (current) $('#state').value = current;
    } else if ($('#state').tagName === 'SELECT') {
      swapState('input');
    }
    $('label[for=state]', stateWrap).textContent = isUS ? 'State' : 'State / province' + (['CA', 'AU', 'MX', 'BR', 'JP'].indexOf(country.value) === -1 ? ' (optional)' : '');
    $('label[for=zip]').textContent = isUS ? 'ZIP code' : 'Postal code';
  }
  function swapState(kind) {
    const old = $('#state');
    const el = document.createElement(kind);
    el.id = 'state'; el.name = 'state'; el.autocomplete = 'address-level1';
    if (kind === 'input') { el.placeholder = ' '; el.maxLength = 120; }
    old.replaceWith(el);
  }

  /* ---- Restore saved details (this browser only) ---- */
  try {
    const saved = JSON.parse(sessionStorage.getItem(FORM_KEY) || 'null');
    if (saved && saved.country) country.value = saved.country;
    renderState();
    if (saved) {
      Object.keys(saved).forEach(function (k) { const el = form.elements[k]; if (el && k !== 'country') el.value = saved[k]; });
    }
  } catch (e) { renderState(); }

  function data() {
    const d = {};
    ['email', 'phone', 'country', 'first', 'last', 'address1', 'address2', 'city', 'state', 'zip'].forEach(function (k) {
      const el = form.elements[k]; d[k] = el ? String(el.value || '').trim() : '';
    });
    return d;
  }

  /* ---- Validation ---- */
  function rules(d) {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errs.email = 1;
    ['first', 'last', 'address1', 'city'].forEach(function (k) { if (!d[k]) errs[k] = 1; });
    if (d.country === 'US') {
      if (!d.state) errs.state = 1;
      if (!/^\d{5}(-\d{4})?$/.test(d.zip)) errs.zip = 1;
    } else {
      if (['CA', 'AU', 'MX', 'BR', 'JP'].indexOf(d.country) !== -1 && !d.state) errs.state = 1;
      if (d.zip.length < 2 && ['HK', 'AE', 'JM', 'IE', 'SA'].indexOf(d.country) === -1) errs.zip = 1;
    }
    return errs;
  }
  let touched = false;
  function showErrors(errs) {
    $$('.input', form).forEach(function (w) {
      const el = $('input, select', w);
      w.classList.toggle('is-invalid', !!(el && errs[el.name]));
    });
  }
  function validate(reveal) {
    const errs = rules(data());
    if (reveal || touched) showErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ---- Totals ---- */
  function render() {
    const d = data();
    const q = Bag.quote(d.country);
    const eta = STORE.eta(d.country);
    $('.summary-items').innerHTML = q.items.map(function (i) {
      return '<div class="summary-item"><div class="summary-item__img"><img src="' + i.image + '" alt=""><b>' + i.qty + '</b></div>' +
        '<div><h4>' + STORE.product.name + '</h4><p>' + i.name + ' · ' + i.size + '</p></div>' +
        '<span class="amt">' + Bag.money(i.unit * i.qty) + '</span></div>';
    }).join('');
    $('[data-subtotal]').textContent = Bag.money(q.subtotal);
    $('[data-shipping]').textContent = q.shipping ? Bag.money(q.shipping) : 'Free';
    $$('[data-total]').forEach(function (el) { el.textContent = Bag.money(q.total); });
    $('[data-ship-label]').textContent = q.zone.label;
    $('[data-ship-cost]').textContent = q.shipping ? Bag.money(q.shipping) : 'Free';
    $('[data-ship-eta]').textContent = 'Made to order (' + STORE.production.min + '–' + STORE.production.max + ' business days), then ' + q.zone.min + '–' + q.zone.max + ' business days. Est. delivery ' + STORE.formatRange(eta.arriveFrom, eta.arriveTo) + '.';
    $('[data-ship-window]').textContent = STORE.formatRange(eta.shipFrom, eta.shipTo);
    const msg = $('[data-pp-message]');
    if (msg) msg.setAttribute('data-pp-amount', q.total.toFixed(2));
    return q;
  }

  function onFormChange() {
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(data())); } catch (e) {}
    render();
    $('.pay-panel').classList.toggle('is-ready', validate(false));
  }
  form.addEventListener('input', onFormChange);
  form.addEventListener('change', function (e) {
    if (e.target === country) renderState();
    onFormChange();
  });
  form.addEventListener('focusout', function (e) {
    const w = e.target.closest('.input');
    if (!w || !e.target.value) return;
    const errs = rules(data());
    w.classList.toggle('is-invalid', !!errs[e.target.name]);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  $('[data-lock]').addEventListener('click', function () {
    touched = true;
    if (!validate(true)) {
      const first = $('.input.is-invalid input, .input.is-invalid select', form);
      if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { first.focus({ preventScroll: true }); }, 400); }
    }
  });

  const toggle = $('.summary-toggle');
  toggle.addEventListener('click', function () {
    const open = $('.summary-body').classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    $('span', toggle).textContent = open ? 'Hide order summary ↑' : 'Show order summary ↓';
  });

  render();
  $('.pay-panel').classList.toggle('is-ready', validate(false));

  /* ==========================================================
     PayPal
     ========================================================== */
  const errorBox = $('.pay-error');
  function payError(msg) { errorBox.textContent = msg; errorBox.classList.add('is-visible'); }
  function clearError() { errorBox.classList.remove('is-visible'); }

  function money2(n) { return (Math.round(n * 100) / 100).toFixed(2); }

  // Order body shared by both modes (server mode reprices it independently).
  function buildOrder(d) {
    const q = Bag.quote(d.country);
    const ref = 'TV-' + Date.now().toString(36).toUpperCase();
    const shipping = {
      name: { full_name: (d.first + ' ' + d.last).slice(0, 300) },
      address: {
        address_line_1: d.address1, address_line_2: d.address2 || undefined,
        admin_area_2: d.city, admin_area_1: d.state || undefined,
        postal_code: d.zip || undefined, country_code: d.country,
      },
    };
    return {
      ref: ref, quote: q,
      body: {
        intent: 'CAPTURE',
        payer: { email_address: d.email, name: { given_name: d.first, surname: d.last } },
        purchase_units: [{
          reference_id: ref,
          invoice_id: ref,
          description: STORE.product.name + ' — made to order',
          amount: {
            currency_code: STORE.currency,
            value: money2(q.total),
            breakdown: {
              item_total: { currency_code: STORE.currency, value: money2(q.subtotal) },
              shipping: { currency_code: STORE.currency, value: money2(q.shipping) },
            },
          },
          items: q.items.map(function (i) {
            return {
              name: (STORE.product.name + ' — ' + i.name).slice(0, 127),
              description: ('Size ' + i.size + ' · Made to order').slice(0, 127),
              sku: (STORE.product.id + '-' + i.variant + '-' + i.size).slice(0, 127),
              unit_amount: { currency_code: STORE.currency, value: money2(i.unit) },
              quantity: String(i.qty),
              category: 'PHYSICAL_GOODS',
            };
          }),
          shipping: shipping,
        }],
        application_context: { brand_name: STORE.brand, shipping_preference: 'SET_PROVIDED_ADDRESS', user_action: 'PAY_NOW' },
      },
    };
  }

  let pending = null;

  function finalize(details, d) {
    const pu = (details.purchase_units || [])[0] || {};
    const cap = pu.payments && pu.payments.captures && pu.payments.captures[0];
    const order = {
      id: (pending && pending.ref) || details.id,
      paypalOrderId: details.id,
      captureId: cap ? cap.id : null,
      status: cap ? cap.status : details.status,
      createdAt: new Date().toISOString(),
      email: d.email,
      shipTo: { name: d.first + ' ' + d.last, line1: d.address1, line2: d.address2, city: d.city, state: d.state, zip: d.zip, country: d.country },
      items: pending ? pending.quote.items : Bag.quote(d.country).items,
      subtotal: pending ? pending.quote.subtotal : 0,
      shipping: pending ? pending.quote.shipping : 0,
      total: cap && cap.amount ? parseFloat(cap.amount.value) : (pending ? pending.quote.total : 0),
    };
    try { sessionStorage.setItem(ORDER_KEY, JSON.stringify(order)); localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (e) {}
    Bag.clear();
    try { sessionStorage.removeItem(FORM_KEY); } catch (e) {}
    location.href = 'thank-you.html?order=' + encodeURIComponent(order.id);
  }

  function isDeclined(err) {
    const s = String((err && (err.message || err.name)) || err || '');
    return /INSTRUMENT_DECLINED/.test(s) || (err && err.details && err.details[0] && err.details[0].issue === 'INSTRUMENT_DECLINED');
  }

  function postJSON(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { const e = new Error(j.error || 'Request failed'); e.details = j.details; throw e; } return j; }); });
  }

  function renderButtons() {
    const server = STORE.paypal.mode === 'server';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 50, tagline: false },
      onClick: function (_, actions) {
        clearError();
        touched = true;
        if (!validate(true)) {
          payError('Please complete your contact and shipping details above.');
          return actions.reject();
        }
        return actions.resolve();
      },
      createOrder: function (_, actions) {
        const d = data();
        pending = buildOrder(d);
        if (server) {
          return postJSON('/api/paypal/create-order', {
            lines: Bag.lines(), ref: pending.ref,
            customer: { email: d.email, first: d.first, last: d.last },
            shipping: pending.body.purchase_units[0].shipping,
          }).then(function (j) { return j.id; });
        }
        return actions.order.create(pending.body);
      },
      onApprove: function (data, actions) {
        const d = data();
        const capture = server
          ? postJSON('/api/paypal/capture-order', { orderID: data.orderID })
          : actions.order.capture();
        return capture.then(function (details) {
          const err = details && details.details && details.details[0];
          if (err && err.issue === 'INSTRUMENT_DECLINED') return actions.restart();
          finalize(details, d);
        }).catch(function (err) {
          if (isDeclined(err)) return actions.restart();
          console.error(err);
          payError('Your payment could not be completed. No charge was made — please try again or use another method.');
        });
      },
      onCancel: function () { toast('Payment cancelled — your bag is saved'); },
      onError: function (err) {
        console.error('PayPal error', err);
        payError('Something went wrong with PayPal. Please check your address and try again, or contact ' + STORE.supportEmail + '.');
      },
    }).render('#paypal-buttons').catch(function (err) {
      console.error(err);
      payError('PayPal could not load. Please refresh the page.');
    });
  }

  /* ---- Load the PayPal SDK with every funding source enabled ---- */
  const cfg = STORE.paypal;
  if (!cfg.clientId) {
    payError('Payments are not configured yet — add your PayPal Client ID in assets/js/config.js.');
    return;
  }
  const qs = new URLSearchParams({
    'client-id': cfg.clientId,
    currency: STORE.currency,
    intent: 'capture',
    components: 'buttons,messages',
    commit: 'true',
  });
  if (cfg.enableFunding && cfg.enableFunding.length) qs.set('enable-funding', cfg.enableFunding.join(','));
  const sdk = document.createElement('script');
  sdk.src = 'https://www.paypal.com/sdk/js?' + qs.toString();
  sdk.onload = renderButtons;
  sdk.onerror = function () { payError('PayPal could not load. Check your connection or ad-blocker and refresh.'); };
  document.head.appendChild(sdk);
})();
