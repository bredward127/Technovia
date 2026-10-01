// Creates a PayPal order priced on the server from config.js, ignoring any
// amounts the browser might send.
const { STORE, paypal, readBody } = require('../_lib/paypal');

const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
const clip = (s, n) => String(s || '').slice(0, n);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { lines, ref, customer = {}, shipping = {} } = readBody(req);
    const address = shipping.address || {};
    const country = clip(address.country_code, 2).toUpperCase();
    const q = STORE.quote(lines, country);
    if (!q.items.length) return res.status(400).json({ error: 'Your bag is empty' });

    const cur = STORE.currency;
    const reference = clip(ref, 120) || 'TV-' + Date.now().toString(36).toUpperCase();
    const order = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: reference,
        invoice_id: reference,
        description: STORE.product.name + ' — made to order',
        amount: {
          currency_code: cur,
          value: money(q.total),
          breakdown: {
            item_total: { currency_code: cur, value: money(q.subtotal) },
            shipping: { currency_code: cur, value: money(q.shipping) },
          },
        },
        items: q.items.map((i) => ({
          name: clip(STORE.product.name + ' — ' + i.name, 127),
          description: clip('Size ' + i.size + ' · Made to order', 127),
          sku: clip(STORE.product.id + '-' + i.variant + '-' + i.size, 127),
          unit_amount: { currency_code: cur, value: money(i.unit) },
          quantity: String(i.qty),
          category: 'PHYSICAL_GOODS',
        })),
        shipping: {
          name: { full_name: clip(shipping.name && shipping.name.full_name, 300) },
          address: {
            address_line_1: clip(address.address_line_1, 300),
            address_line_2: clip(address.address_line_2, 300) || undefined,
            admin_area_2: clip(address.admin_area_2, 120),
            admin_area_1: clip(address.admin_area_1, 300) || undefined,
            postal_code: clip(address.postal_code, 60) || undefined,
            country_code: country,
          },
        },
      }],
      payer: customer.email ? {
        email_address: clip(customer.email, 254),
        name: { given_name: clip(customer.first, 140), surname: clip(customer.last, 140) },
      } : undefined,
      application_context: { brand_name: STORE.brand, shipping_preference: 'SET_PROVIDED_ADDRESS', user_action: 'PAY_NOW' },
    };

    const r = await paypal('/v2/checkout/orders', order);
    if (!r.ok) return res.status(r.status).json({ error: 'Could not create order', details: r.json.details });
    return res.status(200).json({ id: r.json.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Could not create order' });
  }
};
