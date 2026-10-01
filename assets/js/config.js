/*
 * Store configuration — the one file to edit for brand, price, PayPal and
 * colourways. Loaded by every page in the browser and by the /api/paypal
 * functions on Vercel, so prices are defined in exactly one place.
 */
(function (root) {
  const STORE = {
    brand: 'TECHNOVIA',
    supportEmail: '3ddi300@gmail.com',
    currency: 'USD',

    // PayPal — paste the Client ID from developer.paypal.com → Apps & Credentials.
    // mode 'client': the browser creates the order (works with just the Client ID).
    // mode 'server': orders are created and priced by /api/paypal/* on Vercel
    //                (needs PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET env vars).
    paypal: {
      clientId: 'BAAMGEd12xlJRdqT2EJDPtBBhkJ1Jtt-mFDeHy2IwZVR-kWVCz-J_8eOUpb8sFgh6TpmgrVZIPXQpPXgjg',
      mode: 'client',
      // Wallets and cards shown on checkout. Venmo shows to U.S. buyers on mobile.
      enableFunding: ['venmo', 'paylater', 'card'],
    },

    // Newsletter: leave empty to open an email to supportEmail instead.
    newsletterEndpoint: '',

    product: {
      id: 'den-hoodie',
      name: 'The Den Hoodie',
      collection: 'Atelier 01',
      price: 245,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      tagline: 'A heavyweight fleece hoodie with a deep faux fur hood and a sherpa-lined body.',
    },

    // Made to order: business days to cut, sew and finish, then carrier transit.
    production: { min: 10, max: 14 },
    shipping: {
      US: { label: 'Complimentary tracked express', cost: 0, min: 2, max: 5 },
      INTL: { label: 'International tracked express', cost: 35, min: 5, max: 10 },
    },

    variants: [
      { id: 'mink', name: 'Mocha / Mink Frost', edit: 'Signature', body: '#5b4334', fur: '#cdb9a0',
        image: 'images/hoodie/mink-front.jpg',
        gallery: ['images/hoodie/mink-front.jpg', 'images/hoodie/mink-detail.jpg', 'images/hoodie/mink-side.jpg', 'images/hoodie/mink-back.jpg'] },

      { id: 'leopard-sand', name: 'Taupe / Sand Leopard', edit: 'Fur Edit', body: '#6e5f52', fur: '#c9a56d', image: 'images/hoodie/leopard-sand.jpg' },
      { id: 'arctic', name: 'Taupe / Arctic', edit: 'Fur Edit', body: '#6e5f52', fur: '#f1eee8', image: 'images/hoodie/arctic.jpg' },
      { id: 'onyx', name: 'Taupe / Onyx', edit: 'Fur Edit', body: '#6e5f52', fur: '#1b1a19', image: 'images/hoodie/onyx.jpg' },
      { id: 'snow-leopard', name: 'Taupe / Snow Leopard', edit: 'Fur Edit', body: '#6e5f52', fur: '#9b9b9b', image: 'images/hoodie/snow-leopard.jpg' },
      { id: 'ivory-leopard', name: 'Taupe / Ivory Leopard', edit: 'Fur Edit', body: '#6e5f52', fur: '#e9e6df', image: 'images/hoodie/ivory-leopard.jpg' },
      { id: 'amber-cheetah', name: 'Taupe / Amber Cheetah', edit: 'Fur Edit', body: '#6e5f52', fur: '#a5723a', image: 'images/hoodie/amber-cheetah.jpg' },

      { id: 'rust-cream', name: 'Rust / Cream Sherpa', edit: 'Colour Edit', body: '#b4471c', fur: '#efe5d2', image: 'images/hoodie/rust-cream.jpg' },
      { id: 'olive-copper', name: 'Olive / Copper', edit: 'Colour Edit', body: '#55602a', fur: '#a5582a', image: 'images/hoodie/olive-copper.jpg' },
      { id: 'saffron-charcoal', name: 'Saffron / Charcoal', edit: 'Colour Edit', body: '#e0a321', fur: '#3a3a3a', image: 'images/hoodie/saffron-charcoal.jpg' },
      { id: 'bordeaux-onyx', name: 'Bordeaux / Onyx', edit: 'Colour Edit', body: '#7a1f22', fur: '#1b1b1b', image: 'images/hoodie/bordeaux-onyx.jpg' },
      { id: 'plum-cream', name: 'Plum / Cream', edit: 'Colour Edit', body: '#4a2236', fur: '#e7d4b5', image: 'images/hoodie/plum-cream.jpg' },
      { id: 'camel-forest', name: 'Camel / Forest', edit: 'Colour Edit', body: '#c08840', fur: '#2f4a36', image: 'images/hoodie/camel-forest.jpg' },
    ],
  };

  STORE.variant = function (id) {
    return STORE.variants.find(function (v) { return v.id === id; });
  };

  // Recomputes the order from variant ids, sizes and quantities only, so a
  // price saved in the browser can never leak into a total.
  STORE.quote = function (lines, countryCode) {
    const items = [];
    (lines || []).forEach(function (l) {
      const v = STORE.variant(l.variant);
      const qty = Math.max(1, Math.min(10, parseInt(l.qty, 10) || 0));
      if (!v || STORE.product.sizes.indexOf(l.size) === -1) return;
      items.push({ variant: v.id, name: v.name, size: l.size, qty: qty, unit: STORE.product.price, image: v.image });
    });
    const subtotal = items.reduce(function (s, i) { return s + i.unit * i.qty; }, 0);
    const zone = !countryCode || countryCode === 'US' ? STORE.shipping.US : STORE.shipping.INTL;
    const shipping = items.length ? zone.cost : 0;
    return { items: items, subtotal: subtotal, shipping: shipping, total: subtotal + shipping, zone: zone };
  };

  STORE.addBusinessDays = function (date, n) {
    const d = new Date(date.getTime());
    while (n > 0) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) n--;
    }
    return d;
  };

  // Ship window (production) and delivery window (production + transit).
  STORE.eta = function (countryCode, from) {
    const start = from ? new Date(from) : new Date();
    const zone = !countryCode || countryCode === 'US' ? STORE.shipping.US : STORE.shipping.INTL;
    const p = STORE.production;
    return {
      shipFrom: STORE.addBusinessDays(start, p.min),
      shipTo: STORE.addBusinessDays(start, p.max),
      arriveFrom: STORE.addBusinessDays(start, p.min + zone.min),
      arriveTo: STORE.addBusinessDays(start, p.max + zone.max),
    };
  };

  STORE.formatRange = function (a, b) {
    const f = function (d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    return f(a) + ' – ' + f(b);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = STORE;
  else root.STORE = STORE;
})(typeof window !== 'undefined' ? window : globalThis);
