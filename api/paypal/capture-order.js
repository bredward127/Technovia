// Captures an approved PayPal order and returns PayPal's order representation.
const { paypal, readBody } = require('../_lib/paypal');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { orderID } = readBody(req);
    if (!/^[A-Z0-9]{5,40}$/i.test(String(orderID || ''))) return res.status(400).json({ error: 'Invalid order' });
    const r = await paypal('/v2/checkout/orders/' + encodeURIComponent(orderID) + '/capture');
    // A declined card comes back as 422 INSTRUMENT_DECLINED; the browser restarts the flow.
    if (!r.ok) return res.status(r.status).json({ error: 'Capture failed', details: r.json.details });
    return res.status(200).json(r.json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Capture failed' });
  }
};
