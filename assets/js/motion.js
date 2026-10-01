/* Scroll + entrance motion. Everything degrades to fully visible content
   when JS fails or the visitor prefers reduced motion. */
(function () {
  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js');

  // Brand name from config, so a rename is one line in config.js.
  if (window.STORE) {
    document.querySelectorAll('[data-brand]').forEach(function (el) { el.textContent = STORE.brand; });
  }

  /* ---- Loader: once per session ---- */
  const loader = document.querySelector('.loader');
  let seen = false;
  try { seen = sessionStorage.getItem('intro.seen') === '1'; } catch (e) {}
  function startPage() { doc.classList.add('is-loaded'); observeAll(); }
  if (loader) {
    if (seen || reduce) {
      loader.remove();
      startPage();
    } else {
      const word = loader.querySelector('.loader__word');
      if (word) {
        word.innerHTML = word.textContent.split('').map(function (c, i) {
          return '<span style="animation-delay:' + (0.05 * i + 0.1).toFixed(2) + 's">' + c + '</span>';
        }).join('');
      }
      document.body.classList.add('no-scroll');
      window.addEventListener('load', function () {
        setTimeout(function () {
          loader.classList.add('is-done');
          document.body.classList.remove('no-scroll');
          try { sessionStorage.setItem('intro.seen', '1'); } catch (e) {}
          setTimeout(startPage, 250);
          setTimeout(function () { loader.remove(); }, 1300);
        }, 1500);
      });
    }
  } else {
    startPage();
  }

  /* ---- Split headings into masked lines/words ---- */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    let i = 0;
    const lines = el.querySelectorAll('.line');
    const targets = lines.length ? lines : [el];
    targets.forEach(function (line) {
      const frag = document.createDocumentFragment();
      Array.from(line.childNodes).forEach(function (node) {
        const isEm = node.nodeType === 1;
        const text = node.textContent;
        text.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const mask = document.createElement('span');
          mask.className = 'split-line split-word';
          mask.style.display = 'inline-block';
          const inner = document.createElement(isEm ? 'em' : 'span');
          inner.className = 'split-inner';
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          mask.appendChild(inner);
          frag.appendChild(mask);
        });
      });
      line.textContent = '';
      line.appendChild(frag);
    });
  });

  /* ---- Reveal on scroll ---- */
  function observeAll() {
    const els = document.querySelectorAll('[data-reveal], [data-split], .process__bar');
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }
  // Stagger children: data-stagger="0.08" sets --d on each direct [data-reveal] child.
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    const step = parseFloat(group.getAttribute('data-stagger')) || 0.08;
    group.querySelectorAll(':scope > [data-reveal]').forEach(function (el, i) {
      el.style.setProperty('--d', (i * step).toFixed(2) + 's');
    });
  });

  /* ---- Header: solid after scroll, hides on scroll down ---- */
  const header = document.querySelector('.header');
  let lastY = window.scrollY;

  /* ---- Manifesto words light up as it passes through the viewport ---- */
  const manifesto = document.querySelector('[data-scrub-words]');
  let words = [];
  if (manifesto) {
    const walk = function (node, out) {
      Array.from(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); out.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n, out); }
      });
    };
    walk(manifesto, words);
  }

  const parallax = Array.from(document.querySelectorAll('[data-parallax]'));
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      const menuOpen = doc.classList.contains('menu-open');
      header.classList.toggle('is-hidden', !menuOpen && y > 500 && y > lastY + 4);
      if (y < lastY - 4) header.classList.remove('is-hidden');
    }
    lastY = y;
    if (!reduce) {
      parallax.forEach(function (el) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    }
    if (manifesto && words.length && !reduce) {
      const r = manifesto.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = Math.round(p * words.length);
      words.forEach(function (w, i) { w.classList.toggle('on', i < lit); });
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---- Mobile menu ---- */
  const menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      const open = doc.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', open);
      document.body.classList.toggle('no-scroll', open);
    });
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        doc.classList.remove('menu-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('no-scroll');
      });
    });
  }

  /* ---- Smooth-height accordions ---- */
  document.querySelectorAll('.accordion details').forEach(function (d) {
    const summary = d.querySelector('summary');
    const body = d.querySelector('.acc-body');
    if (!summary || !body || reduce) return;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (d.dataset.animating) return;
      d.dataset.animating = '1';
      if (d.open) {
        body.animate([{ height: body.offsetHeight + 'px' }, { height: '0px' }], { duration: 450, easing: 'cubic-bezier(0.22,1,0.36,1)' })
          .onfinish = function () { d.open = false; delete d.dataset.animating; };
      } else {
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: '0px' }, { height: h + 'px' }], { duration: 550, easing: 'cubic-bezier(0.22,1,0.36,1)' })
          .onfinish = function () { delete d.dataset.animating; };
      }
    });
  });
})();
