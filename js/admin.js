// ============================================
// TEJESH BAKERY — ADMIN JS
// ============================================

// ---- SUPABASE CONFIG ----
const SUPABASE_URL = 'https://hkrcapzsrdjvpskeiwcs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcmNhcHpzcmRqdnBza2Vpd2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Nzg1NjEsImV4cCI6MjA5MDM1NDU2MX0.W6zYCUTdYNsKK6dScJgkCE6Un1enusb6zhcgS-fkXug';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentTab = 'dashboard';

// ============================================
// AUTH
// ============================================
async function adminLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; return; }

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'flex';
  initAdmin();
}

async function adminLogout() {
  await db.auth.signOut();
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'flex';
    initAdmin();
  }
}

function initAdmin() {
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  loadDashboard();
}

// ============================================
// TAB NAVIGATION
// ============================================
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'dashboard') loadDashboard();
  else if (tab === 'orders') loadOrders();
  else if (tab === 'products') loadProducts();
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [{ data: pending }, { data: todayOrders }, { data: products }] = await Promise.all([
    db.from('orders').select('id').eq('status', 'pending'),
    db.from('orders').select('*').gte('created_at', todayISO),
    db.from('products').select('id').eq('available', true)
  ]);

  const pendingCount = pending?.length || 0;
  const todayCount = todayOrders?.length || 0;
  const revenue = (todayOrders || []).reduce((s, o) => s + (o.total_amount || 0), 0);

  document.getElementById('stat-pending').textContent = pendingCount;
  document.getElementById('stat-today').textContent = todayCount;
  document.getElementById('stat-revenue').textContent = `₹${revenue.toLocaleString('en-IN')}`;
  document.getElementById('stat-products').textContent = products?.length || 0;
  document.getElementById('pending-badge').textContent = pendingCount;

  // Recent orders
  const { data: recent } = await db.from('orders').select('*').order('created_at', { ascending: false }).limit(8);
  const container = document.getElementById('recent-orders-list');
  if (!recent?.length) { container.innerHTML = '<p style="color:#9A7A5A;font-size:14px;padding:20px 0">No orders yet.</p>'; return; }

  container.innerHTML = recent.map(o => `
    <div class="recent-order-row">
      <div>
        <div class="ro-name">${o.customer_name}</div>
        <div class="ro-time">${timeAgo(o.created_at)} · <span class="status-badge status-${o.status}">${o.status.replace(/_/g,' ')}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="ro-amount">₹${o.total_amount}</div>
        <button class="btn-sm" onclick="openOrderModal('${o.id}')">View</button>
      </div>
    </div>
  `).join('');
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
  const status = document.getElementById('status-filter').value;
  const wrap = document.getElementById('orders-table-wrap');
  wrap.innerHTML = '<div class="loading">Loading…</div>';

  let query = db.from('orders').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error || !data?.length) {
    wrap.innerHTML = '<div class="loading">No orders found.</div>';
    return;
  }

  wrap.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(o => `
          <tr>
            <td><strong style="font-family:'Playfair Display',serif;color:#2C1810">#${o.id.slice(0,8).toUpperCase()}</strong></td>
            <td>
              <div class="customer-name">${o.customer_name}</div>
              <div class="customer-phone">${o.customer_phone}</div>
            </td>
            <td style="font-size:13px;color:#5A3A24">${(o.items||[]).length} item(s)</td>
            <td style="font-weight:700;color:#C8722A">₹${o.total_amount}</td>
            <td><span class="status-badge status-${o.status}">${o.status.replace(/_/g,' ')}</span></td>
            <td style="font-size:12px;color:#9A7A5A;white-space:nowrap">${formatDate(o.created_at)}</td>
            <td>
              <div class="action-btns">
                <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)" title="Change Status">
                  ${['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'].map(s =>
                    `<option value="${s}" ${o.status===s?'selected':''}>${s.replace(/_/g,' ')}</option>`
                  ).join('')}
                </select>
                <button class="btn-icon" onclick="openOrderModal('${o.id}')" title="View Details">👁</button>
                <a class="btn-icon wa-btn" href="https://wa.me/91${o.customer_whatsapp||o.customer_phone}?text=${encodeURIComponent(`Hi ${o.customer_name}, your order #${o.id.slice(0,8).toUpperCase()} from Tejesh Bakery is being processed. We'll update you shortly!`)}" target="_blank" title="WhatsApp">💬</a>
                <button class="btn-icon btn-danger" onclick="deleteOrder('${o.id}')" title="Delete">🗑</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function updateOrderStatus(orderId, status) {
  const { error } = await db.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
  if (error) { showToast('Failed to update status'); return; }
  showToast(`Status updated to "${status.replace(/_/g,' ')}"`);
  // Update badge
  const { data: pending } = await db.from('orders').select('id').eq('status', 'pending');
  document.getElementById('pending-badge').textContent = pending?.length || 0;
}

async function deleteOrder(orderId) {
  if (!confirm('Delete this order permanently?')) return;
  const { error } = await db.from('orders').delete().eq('id', orderId);
  if (error) { showToast('Failed to delete order'); return; }
  showToast('Order deleted');
  loadOrders();
}

async function openOrderModal(orderId) {
  const { data: order } = await db.from('orders').select('*').eq('id', orderId).single();
  if (!order) return;

  const itemsHtml = (order.items || []).map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${i.count}</td>
      <td>₹${i.price}</td>
      <td>₹${i.price * i.count}</td>
    </tr>
  `).join('');

  document.getElementById('order-modal-body').innerHTML = `
    <div class="order-detail-row">
      <div class="order-detail-field"><label>Order ID</label><span>#${order.id.slice(0,8).toUpperCase()}</span></div>
      <div class="order-detail-field"><label>Status</label><span class="status-badge status-${order.status}">${order.status.replace(/_/g,' ')}</span></div>
      <div class="order-detail-field"><label>Customer</label><span>${order.customer_name}</span></div>
      <div class="order-detail-field"><label>Phone</label><span>${order.customer_phone}</span></div>
      <div class="order-detail-field"><label>WhatsApp</label><span>${order.customer_whatsapp || order.customer_phone}</span></div>
      <div class="order-detail-field"><label>Date</label><span>${formatDate(order.created_at)}</span></div>
    </div>
    <div class="order-detail-field" style="margin-bottom:12px"><label>Address</label><span>${order.customer_address}</span></div>
    ${order.notes ? `<div class="order-detail-field" style="margin-bottom:12px"><label>Notes</label><span>${order.notes}</span></div>` : ''}
    <table class="order-items-table">
      <thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${itemsHtml}
        <tr class="order-total-row"><td colspan="4">Total</td><td>₹${order.total_amount}</td></tr>
      </tbody>
    </table>
    <a class="wa-btn" href="https://wa.me/91${order.customer_whatsapp||order.customer_phone}?text=${encodeURIComponent(`Hi ${order.customer_name}, your Tejesh Bakery order #${order.id.slice(0,8).toUpperCase()} status: ${order.status.replace(/_/g,' ')}. Thank you! 🧁`)}" target="_blank">💬 Message on WhatsApp</a>
  `;

  document.getElementById('order-modal').style.display = 'flex';
}

function closeOrderModal() { document.getElementById('order-modal').style.display = 'none'; }

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
  const { data, error } = await db.from('products').select('*').order('category').order('name');
  const grid = document.getElementById('products-grid');

  if (error || !data?.length) {
    grid.innerHTML = '<div class="loading">No products found. Add your first product!</div>';
    return;
  }

  const emoji = (cat) => ({ brownie: '🍫', cookie: '🍪', biscuit: '🫓', cake: '🎂', pie: '🥧', mittai: '🍬' })[cat?.toLowerCase()] || '🧁';

  grid.innerHTML = `<div class="products-grid">${data.map(p => `
    <div class="product-admin-card">
      <div class="product-card-img">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" />` : emoji(p.category)}
        ${!p.available ? '<div class="product-unavailable-badge">HIDDEN</div>' : ''}
      </div>
      <div class="product-card-body">
        <div class="product-card-cat">${p.category || 'Bakery'}</div>
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-prices">
          ${p.price_per_quarter_kg ? `¼ kg: ₹${p.price_per_quarter_kg}<br>` : ''}
          ${p.price_per_half_kg ? `½ kg: ₹${p.price_per_half_kg}<br>` : ''}
          ${p.price_per_kg ? `1 kg: ₹${p.price_per_kg}<br>` : ''}
          ${p.price_per_piece ? `Per piece: ₹${p.price_per_piece}` : ''}
        </div>
        <div class="product-card-actions">
          <button class="btn-sm" onclick="openProductModal('${p.id}')">✏️ Edit</button>
          <button class="btn-sm" onclick="toggleProductAvailability('${p.id}', ${p.available})">${p.available ? '👁 Hide' : '👁 Show'}</button>
          <button class="btn-icon btn-danger" onclick="deleteProduct('${p.id}')">🗑</button>
        </div>
      </div>
    </div>
  `).join('')}</div>`;
}

async function openProductModal(productId) {
  document.getElementById('edit-product-id').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('p-category').value = 'brownie';
  document.getElementById('p-description').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-price-quarter').value = '';
  document.getElementById('p-price-half').value = '';
  document.getElementById('p-price-kg').value = '';
  document.getElementById('p-price-piece').value = '';
  document.getElementById('p-available').checked = true;
  document.getElementById('modal-title').textContent = 'Add Product';

  if (productId) {
    const { data } = await db.from('products').select('*').eq('id', productId).single();
    if (data) {
      document.getElementById('modal-title').textContent = 'Edit Product';
      document.getElementById('edit-product-id').value = data.id;
      document.getElementById('p-name').value = data.name || '';
      document.getElementById('p-category').value = data.category || 'brownie';
      document.getElementById('p-description').value = data.description || '';
      document.getElementById('p-image').value = data.image_url || '';
      document.getElementById('p-price-quarter').value = data.price_per_quarter_kg || '';
      document.getElementById('p-price-half').value = data.price_per_half_kg || '';
      document.getElementById('p-price-kg').value = data.price_per_kg || '';
      document.getElementById('p-price-piece').value = data.price_per_piece || '';
      document.getElementById('p-available').checked = data.available !== false;
    }
  }

  document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() { document.getElementById('product-modal').style.display = 'none'; }

async function saveProduct() {
  const name = document.getElementById('p-name').value.trim();
  if (!name) { showToast('Product name is required'); return; }

  const payload = {
    name,
    category: document.getElementById('p-category').value,
    description: document.getElementById('p-description').value.trim() || null,
    image_url: document.getElementById('p-image').value.trim() || null,
    price_per_quarter_kg: parseFloat(document.getElementById('p-price-quarter').value) || null,
    price_per_half_kg: parseFloat(document.getElementById('p-price-half').value) || null,
    price_per_kg: parseFloat(document.getElementById('p-price-kg').value) || null,
    price_per_piece: parseFloat(document.getElementById('p-price-piece').value) || null,
    available: document.getElementById('p-available').checked,
    updated_at: new Date().toISOString()
  };

  const editId = document.getElementById('edit-product-id').value;
  let error;

  if (editId) {
    ({ error } = await db.from('products').update(payload).eq('id', editId));
  } else {
    ({ error } = await db.from('products').insert([{ ...payload, created_at: new Date().toISOString() }]));
  }

  if (error) { showToast('Failed to save product: ' + error.message); return; }

  showToast(editId ? 'Product updated!' : 'Product added!');
  closeProductModal();
  loadProducts();
}

async function toggleProductAvailability(productId, current) {
  const { error } = await db.from('products').update({ available: !current }).eq('id', productId);
  if (error) { showToast('Failed to update'); return; }
  showToast(`Product ${!current ? 'shown' : 'hidden'} on menu`);
  loadProducts();
}

async function deleteProduct(productId) {
  if (!confirm('Delete this product permanently?')) return;
  const { error } = await db.from('products').delete().eq('id', productId);
  if (error) { showToast('Failed to delete product'); return; }
  showToast('Product deleted');
  loadProducts();
}

// ============================================
// UTILITIES
// ============================================
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Close modals on overlay click
document.getElementById('product-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeProductModal(); });
document.getElementById('order-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeOrderModal(); });

// ---- BOOT ----
document.addEventListener('DOMContentLoaded', checkAuth);
