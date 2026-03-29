// ============================================
// TEJESH BAKERY — MAIN APP JS
// ============================================

// ---- SUPABASE CONFIG ----
// Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://hkrcapzsrdjvpskeiwcs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcmNhcHpzcmRqdnBza2Vpd2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Nzg1NjEsImV4cCI6MjA5MDM1NDU2MX0.W6zYCUTdYNsKK6dScJgkCE6Un1enusb6zhcgS-fkXug';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- STATE ----
let cart = JSON.parse(localStorage.getItem('tejesh_cart') || '[]');
let products = [];

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
  renderCartCount();
  setupOrderForm();
});

// ============================================
// MENU
// ============================================
async function loadMenu() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('available', true)
    .order('category', { ascending: true });

  if (error) {
    document.getElementById('menu-grid').innerHTML = '<div class="menu-loader">Failed to load menu. Please refresh.</div>';
    return;
  }

  products = data || [];
  buildCategoryTabs(products);
  renderMenuCards(products);
}

function buildCategoryTabs(items) {
  const cats = ['all', ...new Set(items.map(i => i.category).filter(Boolean))];
  const tabs = document.getElementById('category-tabs');
  tabs.innerHTML = cats.map(c =>
    `<button class="tab ${c === 'all' ? 'active' : ''}" data-cat="${c}" onclick="filterByCategory('${c}')">${capitalize(c)}</button>`
  ).join('');
}

function filterByCategory(cat) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-cat="${cat}"]`).classList.add('active');
  const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
  renderMenuCards(filtered);
}

function renderMenuCards(items) {
  const grid = document.getElementById('menu-grid');
  if (!items.length) {
    grid.innerHTML = '<div class="menu-loader">No items in this category.</div>';
    return;
  }

  grid.innerHTML = items.map(p => {
    const priceOptions = buildPriceOptions(p);
    const emoji = getCategoryEmoji(p.category);
    const imgHtml = p.image_url
      ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;"/>`
      : emoji;

    return `
    <div class="menu-card" id="card-${p.id}">
      <div class="card-img">${imgHtml}</div>
      <div class="card-body">
        <div class="card-category">${p.category || 'Bakery'}</div>
        <div class="card-name">${p.name}</div>
        ${p.description ? `<div class="card-desc">${p.description}</div>` : ''}
        <div class="card-pricing">
          ${buildPriceDisplay(p)}
        </div>
        <div class="qty-row">
          <select class="qty-select" id="qty-${p.id}">
            ${priceOptions}
          </select>
        </div>
        <button class="add-btn" onclick="addToCart('${p.id}')">+ Add to Cart</button>
      </div>
    </div>`;
  }).join('');
}

function buildPriceDisplay(p) {
  const rows = [];
  if (p.price_per_quarter_kg) rows.push(`<div class="price-row"><span class="price-label">¼ kg</span><span class="price-val">₹${p.price_per_quarter_kg}</span></div>`);
  if (p.price_per_half_kg)    rows.push(`<div class="price-row"><span class="price-label">½ kg</span><span class="price-val">₹${p.price_per_half_kg}</span></div>`);
  if (p.price_per_kg)         rows.push(`<div class="price-row"><span class="price-label">1 kg</span><span class="price-val">₹${p.price_per_kg}</span></div>`);
  if (p.price_per_piece)      rows.push(`<div class="price-row"><span class="price-label">Per piece</span><span class="price-val">₹${p.price_per_piece}</span></div>`);
  if (!rows.length && p.base_price) rows.push(`<div class="price-row"><span class="price-label">Price</span><span class="price-val">₹${p.base_price}</span></div>`);
  return rows.join('');
}

function buildPriceOptions(p) {
  const opts = [];
  if (p.price_per_quarter_kg) opts.push(`<option value="0.25kg|${p.price_per_quarter_kg}">¼ kg — ₹${p.price_per_quarter_kg}</option>`);
  if (p.price_per_half_kg)    opts.push(`<option value="0.5kg|${p.price_per_half_kg}">½ kg — ₹${p.price_per_half_kg}</option>`);
  if (p.price_per_kg)         opts.push(`<option value="1kg|${p.price_per_kg}">1 kg — ₹${p.price_per_kg}</option>`);
  if (p.price_per_piece)      opts.push(`<option value="1pc|${p.price_per_piece}">1 piece — ₹${p.price_per_piece}</option>`);
  if (!opts.length && p.base_price) opts.push(`<option value="1|${p.base_price}">₹${p.base_price}</option>`);
  return opts.join('');
}

function getCategoryEmoji(cat) {
  const map = { brownie: '🍫', cookie: '🍪', biscuit: '🫓', cake: '🎂', pie: '🥧', mittai: '🍬' };
  return map[(cat || '').toLowerCase()] || '🧁';
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================
// CART
// ============================================
function addToCart(productId) {
  const product = products.find(p => p.id === productId || p.id == productId);
  if (!product) return;

  const select = document.getElementById(`qty-${productId}`);
  const [qty, price] = select.value.split('|');

  const item = {
    id: `${productId}-${qty}`,
    productId,
    name: product.name,
    qty,
    price: parseInt(price),
    count: 1
  };

  const existing = cart.find(c => c.id === item.id);
  if (existing) {
    existing.count += 1;
  } else {
    cart.push(item);
  }

  saveCart();
  renderCartCount();
  renderDrawerItems();
  showToast(`${product.name} added to cart!`);
}

function removeFromCart(itemId) {
  cart = cart.filter(c => c.id !== itemId);
  saveCart();
  renderCartCount();
  renderDrawerItems();
  renderInlineCart();
}

function saveCart() { localStorage.setItem('tejesh_cart', JSON.stringify(cart)); }

function renderCartCount() {
  const total = cart.reduce((s, c) => s + c.count, 0);
  document.getElementById('cart-count').textContent = total;
}

function renderDrawerItems() {
  const container = document.getElementById('drawer-items');
  if (!cart.length) {
    container.innerHTML = '<p style="color:#9A7A5A;text-align:center;padding:40px 0;">Cart is empty</p>';
    document.getElementById('drawer-total').textContent = '₹0';
    return;
  }
  container.innerHTML = cart.map(c => `
    <div class="drawer-cart-item">
      <div class="drawer-item-info">
        <div class="drawer-item-name">${c.name}</div>
        <div class="drawer-item-qty">${c.qty} × ${c.count}</div>
      </div>
      <div class="drawer-item-price">₹${c.price * c.count}</div>
      <button class="drawer-item-del" onclick="removeFromCart('${c.id}')">✕</button>
    </div>
  `).join('');
  const total = cart.reduce((s, c) => s + c.price * c.count, 0);
  document.getElementById('drawer-total').textContent = `₹${total}`;
}

function renderInlineCart() {
  const list = document.getElementById('cart-items-list');
  const totalEl = document.getElementById('cart-total');
  const totalAmt = document.getElementById('total-amount');

  if (!cart.length) {
    list.innerHTML = '<p class="empty-cart">No items yet. Add from the menu above!</p>';
    totalEl.style.display = 'none';
    return;
  }
  list.innerHTML = cart.map(c => `
    <div class="cart-item">
      <span class="cart-item-name">${c.name}</span>
      <span class="cart-item-qty">${c.qty} × ${c.count}</span>
      <span class="cart-item-price">₹${c.price * c.count}</span>
      <button class="cart-item-del" onclick="removeFromCart('${c.id}')">🗑</button>
    </div>
  `).join('');
  const total = cart.reduce((s, c) => s + c.price * c.count, 0);
  totalAmt.textContent = `₹${total}`;
  totalEl.style.display = 'flex';
}

function toggleCart() {
  renderDrawerItems();
  document.getElementById('cart-overlay').classList.toggle('open');
  document.getElementById('cart-drawer').classList.toggle('open');
}

// ============================================
// ORDER FORM
// ============================================
function setupOrderForm() {
  // re-render inline cart when order section is visible
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) renderInlineCart();
  }, { threshold: 0.1 });
  const orderSec = document.getElementById('order');
  if (orderSec) observer.observe(orderSec);

  document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitOrder();
  });
}

async function submitOrder() {
  if (!cart.length) {
    showToast('Please add items to your cart first!');
    return;
  }

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const whatsapp = document.getElementById('cust-whatsapp').value.trim() || phone;
  const address = document.getElementById('cust-address').value.trim();
  const notes = document.getElementById('cust-notes').value.trim();

  if (!name || !phone || !address) {
    showToast('Please fill in all required fields.');
    return;
  }

  const total = cart.reduce((s, c) => s + c.price * c.count, 0);
  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Placing Order…';
  btn.disabled = true;

  const { data, error } = await db.from('orders').insert([{
    customer_name: name,
    customer_phone: phone,
    customer_whatsapp: whatsapp,
    customer_address: address,
    notes,
    items: cart,
    total_amount: total,
    status: 'pending'
  }]).select().single();

  btn.textContent = '🛒 Place Order';
  btn.disabled = false;

  if (error) {
    showToast('Failed to place order. Please try again.');
    console.error(error);
    return;
  }

  // Show success modal
  document.getElementById('modal-order-id').textContent = data.id.slice(0, 8).toUpperCase();
  document.getElementById('success-modal').style.display = 'flex';

  // Send WhatsApp message
  const waMsg = encodeURIComponent(
    `🧁 *New Order from Tejesh Bakery*\n\n` +
    `*Order ID:* ${data.id.slice(0,8).toUpperCase()}\n` +
    `*Name:* ${name}\n*Phone:* ${phone}\n*Address:* ${address}\n\n` +
    `*Items:*\n${cart.map(c => `• ${c.name} (${c.qty} × ${c.count}) — ₹${c.price * c.count}`).join('\n')}\n\n` +
    `*Total: ₹${total}*\n\n${notes ? `Notes: ${notes}` : ''}`
  );
  // Open WhatsApp after a short delay
  setTimeout(() => window.open(`https://wa.me/918825725372?text=${waMsg}`, '_blank'), 1500);

  cart = [];
  saveCart();
  renderCartCount();
  renderInlineCart();
  document.getElementById('order-form').reset();
}

function closeModal() {
  document.getElementById('success-modal').style.display = 'none';
}

// ============================================
// ORDER TRACKING
// ============================================
async function trackOrder() {
  const phone = document.getElementById('track-phone').value.trim();
  if (!phone) { showToast('Please enter your phone number.'); return; }

  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(5);

  const container = document.getElementById('track-results');
  if (error || !data?.length) {
    container.innerHTML = '<p style="text-align:center;color:#9A7A5A;padding:20px">No orders found for this phone number.</p>';
    return;
  }

  container.innerHTML = data.map(order => renderOrderCard(order)).join('');
}

function renderOrderCard(order) {
  const steps = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
  const currentIdx = steps.indexOf(order.status);
  const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const stepLabels = ['Received', 'Confirmed', 'Preparing', 'On the Way', 'Delivered'];
  const stepEmojis = ['📋', '✅', '👨‍🍳', '🚚', '🎉'];

  const progressHtml = steps.map((s, i) => {
    const isDone = i < currentIdx;
    const isActive = i === currentIdx;
    const lineClass = i < steps.length - 1 ? (isDone ? 'step-line done' : 'step-line') : '';
    return `
      <div class="step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
        <div class="step-dot">${stepEmojis[i]}</div>
        <div class="step-label">${stepLabels[i]}</div>
      </div>
      ${i < steps.length - 1 ? `<div class="${lineClass}"></div>` : ''}
    `;
  }).join('');

  const itemsList = (order.items || []).map(i =>
    `<li>${i.name} (${i.qty} × ${i.count}) — ₹${i.price * i.count}</li>`
  ).join('');

  return `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-card-id">Order #${order.id.slice(0,8).toUpperCase()}</div>
          <div class="order-card-date">${date}</div>
        </div>
        <span class="status-badge status-${order.status}">${order.status.replace(/_/g,' ')}</span>
      </div>
      <div class="progress-tracker">${progressHtml}</div>
      <ul class="order-items-list">${itemsList}</ul>
      <div class="order-total-line">Total: ₹${order.total_amount}</div>
      ${order.notes ? `<div style="margin-top:8px;font-size:13px;color:#9A7A5A">📝 ${order.notes}</div>` : ''}
    </div>
  `;
}

// ============================================
// UTILITIES
// ============================================
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
                          }
