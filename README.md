# Technovia Atelier — The Den Hoodie

Luxury single-product storefront for **The Den Hoodie**: heavyweight fleece, long-pile faux fur hood,
sherpa-lined body. Made to order. Static site + optional Vercel functions.

## Pages
- `index.html` — hero (slideshow or `media/hero.mp4`), product + bag, anatomy, film, Fur Edit, Colour Edit, made-to-order process, FAQ
- `checkout.html` — contact + shipping form, live totals, PayPal checkout
- `thank-you.html` — order confirmation, made-to-order timeline with estimated ship/delivery dates

## Edit everything in one place
`assets/js/config.js` holds the brand name, support email, price, sizes, production/shipping times,
colourways and PayPal settings.

## Pricing & fulfilment
- **$245** per hoodie, every colourway
- Made to order: **10–14 business days** production
- U.S.: complimentary tracked express (2–5 business days) · International: $35 flat (5–10 business days)
- Final sale once production begins; changes/cancellation within 24h; defects repaired or remade within 14 days of delivery

## Payments (PayPal)
1. In developer.paypal.com → Apps & Credentials, switch to **Live**, open your app, copy the **Client ID**.
2. Paste it into `paypal.clientId` in `assets/js/config.js`.
3. Checkout shows PayPal, Venmo (U.S. mobile), Pay Later, and Debit/Credit Card (guest, no PayPal account needed).
   Make sure your PayPal business account has those enabled (Venmo and Pay Later are on by default for U.S. accounts).

### Optional: server-side orders (recommended once live)
`mode: 'client'` works with only the Client ID. For tamper-proof pricing, set `mode: 'server'` and add
these Vercel environment variables: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=live`.
Orders are then created and captured by `api/paypal/*`, priced from `config.js` on the server.

## Media
See `media/README.md` (video) and `images/README.md` (photos).
