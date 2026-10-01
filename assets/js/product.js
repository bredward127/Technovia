/* Product page: variant + size selection, gallery, edits, hero, film. */
(function () {
  const P = STORE.product;
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
  const priceText = Bag.money(P.price);

  const params = new URLSearchParams(location.search);
  let variant = STORE.variant(params.get('colour')) || STORE.variants[0];
  let size = null;
  let qty = 1;
  let imgIndex = 0;

  $$('[data-price]').forEach(function (el) { el.textContent = priceText; });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---- ETA ---- */
  const eta = STORE.eta('US');
  $$('[data-eta]').forEach(function (el) { el.textContent = STORE.formatRange(eta.arriveFrom, eta.arriveTo); });

  /* ---- Swatches, grouped by edit ---- */
  const swatchHost = $('[data-swatches]');
  const edits = [];
  STORE.variants.forEach(function (v) { if (edits.indexOf(v.edit) === -1) edits.push(v.edit); });
  swatchHost.innerHTML = edits.map(function (edit) {
    return '<div class="swatch-group"><div class="swatch-group__label">' + edit + '</div><div class="swatches" role="radiogroup" aria-label="' + edit + '">' +
      STORE.variants.filter(function (v) { return v.edit === edit; }).map(function (v) {
        return '<button type="button" class="swatch" role="radio" data-variant="' + v.id + '" title="' + v.name + '" aria-label="' + v.name + '" style="--b:' + v.body + ';--f:' + v.fur + '"><i></i></button>';
      }).join('') + '</div></div>';
  }).join('');

  /* ---- Sizes ---- */
  const sizesHost = $('.sizes');
  sizesHost.innerHTML = P.sizes.map(function (s) {
    return '<button type="button" class="size" role="radio" aria-checked="false" data-size="' + s + '">' + s + '</button>';
  }).join('');

  /* ---- Gallery ---- */
  const main = $('.gallery__main');
  const mainImg = $('img', main);
  const thumbs = $('.gallery__thumbs');
  function galleryFor(v) {
    return v.gallery || [v.image, 'images/hoodie/mink-back.jpg', 'images/hoodie/mink-side.jpg'];
  }
  function showImage(i) {
    const list = galleryFor(variant);
    imgIndex = (i + list.length) % list.length;
    const src = list[imgIndex];
    $$('button', thumbs).forEach(function (b, n) { b.classList.toggle('is-active', n === imgIndex); b.setAttribute('aria-selected', n === imgIndex); });
    $('.gallery__count', main).textContent = String(imgIndex + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
    $('.gallery__note', main).textContent = !variant.gallery && imgIndex > 0 ? 'Angle shown in Mocha / Mink Frost' : '';
    if (mainImg.getAttribute('src') === src) return;
    mainImg.classList.add('is-leaving');
    const next = new Image();
    next.onload = next.onerror = function () {
      setTimeout(function () {
        mainImg.src = src;
        mainImg.alt = P.name + ' — ' + variant.name;
        mainImg.classList.remove('is-leaving');
      }, 220);
    };
    next.src = src;
  }
  function renderThumbs() {
    thumbs.innerHTML = galleryFor(variant).map(function (src, i) {
      return '<button type="button" role="tab" aria-label="Image ' + (i + 1) + '"><img src="' + src + '" alt="" loading="lazy"></button>';
    }).join('');
    $$('button', thumbs).forEach(function (b, i) { b.addEventListener('click', function () { showImage(i); }); });
  }
  // Hover zoom (desktop) + swipe (touch)
  main.addEventListener('mousemove', function (e) {
    if (!main.classList.contains('is-zoom')) return;
    const r = main.getBoundingClientRect();
    mainImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
  });
  main.addEventListener('click', function (e) {
    if (matchMedia('(hover: none)').matches) { showImage(imgIndex + 1); return; }
    main.classList.toggle('is-zoom');
    main.dispatchEvent(new MouseEvent('mousemove', e));
  });
  main.addEventListener('mouseleave', function () { main.classList.remove('is-zoom'); });
  let touchX = null;
  main.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  main.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) { e.preventDefault(); showImage(imgIndex + (dx < 0 ? 1 : -1)); }
    touchX = null;
  });

  function selectVariant(v, opts) {
    variant = v;
    $$('.swatch').forEach(function (b) { const on = b.dataset.variant === v.id; b.classList.toggle('is-active', on); b.setAttribute('aria-checked', on); });
    $$('[data-variant-name]').forEach(function (el) { el.textContent = v.name; });
    $('.buybar__variant').textContent = v.name + (size ? ' · ' + size : '');
    renderThumbs();
    imgIndex = -1;
    showImage(0);
    if (opts && opts.scroll) document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
    if (opts && opts.initial) return;
    const url = new URL(location.href);
    url.searchParams.set('colour', v.id);
    history.replaceState(null, '', url);
  }
  swatchHost.addEventListener('click', function (e) {
    const b = e.target.closest('.swatch');
    if (b) selectVariant(STORE.variant(b.dataset.variant));
  });

  sizesHost.addEventListener('click', function (e) {
    const b = e.target.closest('.size');
    if (!b) return;
    size = b.dataset.size;
    $$('.size').forEach(function (x) { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-checked', on); });
    $('[data-size-name]').textContent = '— ' + size;
    $('.size-error').textContent = '';
    sizesHost.classList.remove('is-error');
    $('.buybar__variant').textContent = variant.name + ' · ' + size;
  });

  $$('[data-qty]').forEach(function (b) {
    b.addEventListener('click', function () {
      qty = Math.max(1, Math.min(10, qty + parseInt(b.dataset.qty, 10)));
      $('[data-qty-value]').textContent = qty;
    });
  });

  function addToBag() {
    if (!size) {
      $('.size-error').textContent = 'Please select a size';
      sizesHost.classList.remove('is-error'); void sizesHost.offsetWidth; sizesHost.classList.add('is-error');
      document.getElementById('shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    Bag.add(variant.id, size, qty);
    $$('.bag-btn').forEach(function (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
    toast('Added — ' + variant.name + ', ' + size);
    setTimeout(Bag.open, 350);
  }
  $('[data-add]').addEventListener('click', addToBag);
  $('[data-add-bar]').addEventListener('click', addToBag);
  $('[data-scroll-shop]').addEventListener('click', function () { document.getElementById('shop').scrollIntoView({ behavior: 'smooth' }); });

  /* ---- Mobile buy bar: visible once the main button scrolls away ---- */
  const buybar = $('.buybar');
  if ('IntersectionObserver' in window) {
    const addBtn = $('[data-add]');
    let past = false;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { past = !en.isIntersecting && en.boundingClientRect.top < 0; });
      buybar.classList.toggle('is-visible', past);
    }).observe(addBtn);
  }

  /* ---- Edit grids ---- */
  $$('[data-edit]').forEach(function (grid) {
    const edit = grid.dataset.edit;
    grid.innerHTML = STORE.variants.filter(function (v) { return v.edit === edit; }).map(function (v) {
      return '<button type="button" class="tile" data-reveal data-pick="' + v.id + '" aria-label="Select ' + v.name + '">' +
        '<div class="tile__img"><img src="' + v.image + '" alt="The Den Hoodie in ' + v.name + '" loading="lazy"></div>' +
        '<div class="tile__cta"><span>Select</span><span>→</span></div>' +
        '<div class="tile__meta"><span><i class="swatch-dot" style="--b:' + v.body + ';--f:' + v.fur + '"></i>' + v.name + '</span><span>' + priceText + '</span></div>' +
        '</button>';
    }).join('');
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-pick]');
    if (t) selectVariant(STORE.variant(t.dataset.pick), { scroll: true });
  });

  /* ---- Hero: slideshow, replaced by media/hero.mp4 when present ---- */
  const stage = $('.hero__stage');
  if (stage) {
    const slides = $$('.slide', stage);
    const dots = $('.hero__dots', stage);
    const label = $('.hero__label', stage);
    const labels = ['Mocha / Mink Frost', 'The hood — 30mm faux fur', 'Hood up', 'From behind'];
    let current = 0, timer;
    dots.innerHTML = slides.map(function (_, i) { return '<button type="button" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('');
    const dotBtns = $$('button', dots);
    function go(i) {
      slides[current].classList.remove('is-active');
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      dotBtns.forEach(function (d, n) { d.classList.toggle('is-active', n === current); });
      label.textContent = labels[current] || '';
      clearTimeout(timer);
      timer = setTimeout(function () { go(current + 1); }, 6000);
    }
    dotBtns.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    go(0);

    const video = $('.hero__video', stage);
    const source = $('source', video);
    source.addEventListener('error', function () { video.remove(); });
    video.addEventListener('canplay', function () {
      video.classList.add('is-ready');
      video.play().catch(function () {});
      clearTimeout(timer);
      dots.hidden = true;
      label.textContent = 'Atelier 01 — The film';
    }, { once: true });
    video.load();
  }

  /* ---- Film ---- */
  const frame = $('.film__frame');
  const playBtn = $('[data-play-film]');
  if (frame && playBtn) {
    const fv = $('video', frame);
    playBtn.addEventListener('click', function () {
      playBtn.textContent = '···';
      fv.src = 'media/film.mp4';
      fv.onerror = function () { playBtn.textContent = 'Play'; toast('The film premieres soon'); };
      fv.oncanplay = function () {
        fv.hidden = false;
        frame.classList.add('is-playing');
        fv.play().catch(function () {});
      };
      fv.load();
    });
  }

  /* ---- Anatomy hotspots ---- */
  const specs = $('.specs');
  $$('.hotspot').forEach(function (h) {
    const activate = function () {
      const i = parseInt(h.dataset.spot, 10);
      const was = h.classList.contains('is-active');
      $$('.hotspot').forEach(function (x) { x.classList.remove('is-active'); });
      $$('li', specs).forEach(function (li, n) { li.classList.toggle('is-active', !was && n === i); });
      specs.classList.toggle('has-active', !was);
      if (!was) h.classList.add('is-active');
    };
    h.addEventListener('click', activate);
  });

  /* ---- Size guide ---- */
  const guide = $('[data-guide]');
  const guideOverlay = $('[data-guide-overlay]');
  function openGuide(e) { if (e) e.preventDefault(); guide.classList.add('is-open'); guideOverlay.classList.add('is-open'); $('[data-close-guide]').focus(); }
  function closeGuide() { guide.classList.remove('is-open'); guideOverlay.classList.remove('is-open'); }
  $$('[data-open-guide]').forEach(function (b) { b.addEventListener('click', openGuide); });
  $('[data-close-guide]').addEventListener('click', closeGuide);
  guideOverlay.addEventListener('click', closeGuide);
  guide.addEventListener('click', function (e) { if (e.target === guide) closeGuide(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeGuide(); });

  /* ---- Contact + newsletter ---- */
  $$('[data-contact]').forEach(function (a) { a.href = 'mailto:' + STORE.supportEmail; });
  const join = $('[data-join]');
  join.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = $('input', join);
    if (!input.checkValidity()) { toast('Please enter a valid email'); input.focus(); return; }
    if (STORE.newsletterEndpoint) {
      fetch(STORE.newsletterEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: input.value }) })
        .then(function (r) { if (!r.ok) throw new Error(); toast('Welcome to the den'); join.reset(); })
        .catch(function () { toast('Something went wrong — please try again'); });
    } else {
      location.href = 'mailto:' + STORE.supportEmail + '?subject=' + encodeURIComponent('Join the list') + '&body=' + encodeURIComponent('Please add ' + input.value + ' to the list.');
    }
  });

  selectVariant(variant, { initial: true });
})();
