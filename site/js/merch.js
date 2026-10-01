/* DROPS — high-intent release interface + preview stash.
   Bandcamp links for documented releases; clearly marked concept-only mockups;
   quick-add/fly-to-stash for the local demo. Checkout is intentionally a stub. */

const LS_CART = 'enem_cart_v1';

export function initMerch(PRODUCTS, toast) {
  const grid = document.getElementById('dropGrid');
  const cartEl = document.getElementById('cart');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const cartCount = document.getElementById('cartCount');
  const cartEmpty = document.getElementById('cartEmpty');

  let cart = [];
  try {
    const stored = JSON.parse(localStorage.getItem(LS_CART) || '[]');
    if (Array.isArray(stored)) cart = stored.filter((line) => {
      const product = PRODUCTS.find((item) => item.id === line.id);
      return product && !product.concept && Number.isFinite(product.price) && Number.isInteger(line.qty) && line.qty > 0;
    });
  } catch (e) {}

  function stockPct(p) { return Math.round((p.stock / p.stockMax) * 100); }

  grid.innerHTML = PRODUCTS.map((p, i) => `
    <article class="drop rv" data-id="${p.id}" style="--rr:${i % 2 ? .6 : -.6}deg">
      <div class="art">
        <span class="flag ${p.flag}">${p.flagText}</span>
        <img src="${p.art}" alt="${p.name}" loading="lazy">
      </div>
      <div class="body">
        <h3>${p.name}</h3>
        <p class="desc" style="color:#a5a29a;font-size:13px">${p.desc}</p>
        <div class="price">${Number.isFinite(p.price) ? `$${p.price}` : (p.priceNote || 'PRICE TBD')}${p.old ? `<s>$${p.old}</s>` : ''}</div>
        ${Number.isFinite(p.stock) && p.stock > 0 && Number.isFinite(p.stockMax) ? `
          <div class="stock"><i style="--w:${stockPct(p)}%"></i></div>
          <div class="stock-lbl">${p.stock} of ${p.stockMax} left</div>` : ''}
        ${p.sizes ? `<div class="sizes">${p.sizes.map((s, k) => `<button data-size="${s}" class="${k === 1 ? 'on' : ''}">${s}</button>`).join('')}</div>` : ''}
        ${p.concept
          ? `<a class="cop" href="${p.url}" target="_blank" rel="noopener noreferrer">${p.cta}</a>`
          : p.stock === 0
            ? `<a class="cop dead" href="${p.url}" target="_blank" rel="noopener noreferrer">${p.cta}</a>`
            : `<div class="drop-ctas"><a class="cop" href="${p.url}" target="_blank" rel="noopener noreferrer">CHECK AVAILABILITY ↗</a><button class="cop stash-cta" data-cop="${p.id}">${p.cta}</button></div>`}
      </div>
    </article>`).join('');

  // size pickers
  grid.addEventListener('click', (e) => {
    const sb = e.target.closest('.sizes button');
    if (sb) {
      sb.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
      sb.classList.add('on');
      return;
    }
    const cop = e.target.closest('[data-cop]');
    if (!cop) return;
    const p = PRODUCTS.find((x) => x.id === cop.dataset.cop);
    if (!p) return;
    if (p.stock === 0) {
      toast('SOLD OUT — join the notify list on Bandcamp / IG.');
      return;
    }
    const card = cop.closest('.drop');
    const sizeEl = card.querySelector('.sizes button.on');
    addToCart(p, sizeEl ? sizeEl.dataset.size : null, cop);
  });

  function addToCart(p, size, fromEl) {
    const line = cart.find((c) => c.id === p.id && c.size === size);
    if (line) line.qty++;
    else cart.push({ id: p.id, size, qty: 1 });
    save();
    fly(fromEl);
    toast(`ADDED — ${p.name}${size ? ' (' + size + ')' : ''}`);
  }

  function fly(fromEl) {
    if (!fromEl) return;
    const a = fromEl.getBoundingClientRect(), b = document.getElementById('cartBtn').getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'fly';
    d.style.left = a.left + a.width / 2 + 'px';
    d.style.top = a.top + 'px';
    document.body.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top - a.top}px) scale(.4)`;
      d.style.opacity = '.2';
    });
    setTimeout(() => d.remove(), 750);
  }

  function save() {
    localStorage.setItem(LS_CART, JSON.stringify(cart));
    renderCart();
  }

  function renderCart() {
    const n = cart.reduce((s, c) => s + c.qty, 0);
    cartCount.textContent = n;
    cartCount.style.display = n ? 'flex' : 'none';
    if (!cart.length) {
      cartItems.innerHTML = '';
      cartEmpty.style.display = 'block';
      cartTotal.textContent = '$0';
      return;
    }
    cartEmpty.style.display = 'none';
    let total = 0;
    cartItems.innerHTML = cart.map((c, i) => {
      const p = PRODUCTS.find((x) => x.id === c.id);
      total += p.price * c.qty;
      return `<div class="ci">
        <img src="${p.art}" alt="">
        <div class="n">${p.name}<small>${c.size ? 'size ' + c.size + ' · ' : ''}qty ${c.qty} · $${p.price * c.qty}</small></div>
        <button data-rm="${i}" title="remove">✕</button>
      </div>`;
    }).join('');
    cartTotal.textContent = '$' + total;
  }

  cartItems.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { cart.splice(+rm.dataset.rm, 1); save(); }
  });

  document.getElementById('cartBtn').addEventListener('click', () => cartEl.classList.toggle('open'));
  document.getElementById('cartX').addEventListener('click', () => cartEl.classList.remove('open'));
  document.getElementById('checkout').addEventListener('click', () => {
    if (!cart.length) { toast('CART’S EMPTY — GO COP SOMETHING.'); return; }
    toast('DEMO CHECKOUT — wire Stripe / Shopify / Bandcamp here for launch.');
  });

  renderCart();
}
