// === SUPABASE CLIENT ===
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === NAVEGACAO ===
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    navItems.forEach(n => n.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');

    if (page === 'validade') loadValidade();
    if (page === 'precificacao') loadPrecos();
    if (page === 'fiado') loadFiado();
    if (page === 'vasilhame') loadVasilhame();
  });
});

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

function formatMoney(value) {
  return 'R$ ' + Number(value).toFixed(2).replace('.', ',');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getStatus(expiry_date) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const exp = new Date(expiry_date + 'T00:00:00');
  const diff = (exp - today) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'vencido';
  if (diff <= 7) return 'alerta';
  return 'ok';
}

function populateYearFilter(selectId, items, dateField) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const years = new Set();
  items.forEach(item => {
    const d = item[dateField];
    if (d) years.add(new Date(d).getFullYear().toString());
  });
  const currentVal = select.value;
  const opts = ['<option value="">Todos os anos</option>'];
  [...years].sort().reverse().forEach(y => {
    opts.push(`<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}</option>`);
  });
  select.innerHTML = opts.join('');
}

// === VALIDADE ===
let allProducts = [];

async function loadValidade() {
  const { data: products } = await sb.from('products').select('*').order('expiry_date', { ascending: true });
  allProducts = (products || []).map(p => ({ ...p, status: getStatus(p.expiry_date) }));

  const total = allProducts.length;
  const ok = allProducts.filter(p => p.status === 'ok').length;
  const alerta = allProducts.filter(p => p.status === 'alerta').length;
  const vencidos = allProducts.filter(p => p.status === 'vencido').length;

  document.getElementById('validade-stats').innerHTML = `
    <div class="stat-card neutral"><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
    <div class="stat-card green"><div class="stat-value">${ok}</div><div class="stat-label">Em dia</div></div>
    <div class="stat-card amber"><div class="stat-value">${alerta}</div><div class="stat-label">Vence em 7 dias</div></div>
    <div class="stat-card red"><div class="stat-value">${vencidos}</div><div class="stat-label">Vencidos</div></div>
  `;

  renderProducts();
}

function renderProducts() {
  const search = (document.getElementById('search-validade')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('filter-validade-status')?.value || '';
  const mesFilter = document.getElementById('filter-validade-mes')?.value || '';

  let filtered = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search);
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchMes = !mesFilter || p.expiry_date.slice(5, 7) === mesFilter;
    return matchSearch && matchStatus && matchMes;
  });

  const tbody = document.getElementById('validade-table');
  const empty = document.getElementById('validade-empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = filtered.map(p => {
    const badgeClass = p.status === 'ok' ? 'badge-ok' : p.status === 'alerta' ? 'badge-alerta' : 'badge-vencido';
    const badgeText = p.status === 'ok' ? 'Em dia' : p.status === 'alerta' ? 'Alerta' : 'Vencido';
    return `<tr>
      <td><strong>${p.name}</strong></td>
      <td>${formatDate(p.expiry_date)}</td>
      <td>${p.quantity}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Remover</button></td>
    </tr>`;
  }).join('');
}

document.getElementById('search-validade')?.addEventListener('input', renderProducts);
document.getElementById('filter-validade-status')?.addEventListener('change', renderProducts);
document.getElementById('filter-validade-mes')?.addEventListener('change', renderProducts);

document.getElementById('form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  await sb.from('products').insert({
    name: document.getElementById('prod-name').value,
    expiry_date: document.getElementById('prod-expiry').value,
    quantity: parseInt(document.getElementById('prod-qty').value),
  });
  e.target.reset();
  loadValidade();
});

async function deleteProduct(id) {
  await sb.from('products').delete().eq('id', id);
  loadValidade();
}

// === PRECIFICACAO ===
let allPrecos = [];

async function loadPrecos() {
  const { data } = await sb.from('pricing').select('*').order('created_at', { ascending: false });
  allPrecos = data || [];
  renderPrecos();
}

function renderPrecos() {
  const search = (document.getElementById('search-preco')?.value || '').toLowerCase();

  let filtered = allPrecos.filter(p =>
    p.product_name.toLowerCase().includes(search)
  );

  const tbody = document.getElementById('preco-table');
  const empty = document.getElementById('preco-empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = filtered.map(p => {
    const lucro = p.sell_price - p.cost_price;
    return `<tr>
      <td><strong>${p.product_name}</strong></td>
      <td>${formatMoney(p.cost_price)}</td>
      <td>${p.markup_percent}%</td>
      <td><strong>${formatMoney(p.sell_price)}</strong></td>
      <td style="color:var(--green)">${formatMoney(lucro)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deletePreco(${p.id})">Remover</button></td>
    </tr>`;
  }).join('');
}

document.getElementById('search-preco')?.addEventListener('input', renderPrecos);

document.getElementById('form-preco').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cost = parseFloat(document.getElementById('price-cost').value);
  const markup = parseFloat(document.getElementById('price-markup').value);
  const name = document.getElementById('price-name').value;
  const sell = cost * (1 + markup / 100);
  const lucro = sell - cost;

  document.getElementById('price-sell').textContent = formatMoney(sell);
  document.getElementById('price-profit').textContent = formatMoney(lucro);
  document.getElementById('price-margin').textContent = markup + '%';
  document.getElementById('price-result').classList.add('visible');

  await sb.from('pricing').insert({
    product_name: name,
    cost_price: cost,
    markup_percent: markup,
    sell_price: Math.round(sell * 100) / 100,
  });

  loadPrecos();
});

async function deletePreco(id) {
  await sb.from('pricing').delete().eq('id', id);
  loadPrecos();
}

// === FIADO ===
let selectedClientId = null;
let allClients = [];
let allDebtsForFilter = [];

async function loadFiado() {
  const { data: customers } = await sb.from('customers').select('*').order('name');
  const { data: debts } = await sb.from('debts').select('*');

  const allDebts = debts || [];
  allClients = (customers || []).map(c => {
    const clientDebts = allDebts.filter(d => d.customer_id === c.id);
    return {
      ...c,
      total_devido: clientDebts.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0),
      total_pago: clientDebts.filter(d => d.paid).reduce((s, d) => s + d.amount, 0),
    };
  }).sort((a, b) => b.total_devido - a.total_devido);

  const totalDevido = allClients.reduce((s, c) => s + c.total_devido, 0);
  const totalPago = allClients.reduce((s, c) => s + c.total_pago, 0);

  document.getElementById('fiado-stats').innerHTML = `
    <div class="stat-card neutral"><div class="stat-value">${allClients.length}</div><div class="stat-label">Clientes</div></div>
    <div class="stat-card red"><div class="stat-value">${formatMoney(totalDevido)}</div><div class="stat-label">Total a receber</div></div>
    <div class="stat-card green"><div class="stat-value">${formatMoney(totalPago)}</div><div class="stat-label">Total recebido</div></div>
  `;

  renderClients();
}

function renderClients() {
  const search = (document.getElementById('search-fiado')?.value || '').toLowerCase();

  let filtered = allClients.filter(c =>
    c.name.toLowerCase().includes(search) || (c.phone || '').includes(search)
  );

  const grid = document.getElementById('clients-grid');
  const empty = document.getElementById('fiado-empty');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(c => {
    const debtClass = c.total_devido > 0 ? 'has-debt' : 'no-debt';
    return `<div class="client-card" onclick="openClient(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
      <div class="client-name">${c.name}</div>
      <div class="client-phone">${c.phone || 'Sem telefone'}</div>
      <div class="client-debt ${debtClass}">${formatMoney(c.total_devido)}</div>
      <div class="client-debt-label">Deve atualmente</div>
      <div class="client-actions">
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteClient(${c.id})">Remover</button>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('search-fiado')?.addEventListener('input', renderClients);

document.getElementById('form-cliente').addEventListener('submit', async (e) => {
  e.preventDefault();
  await sb.from('customers').insert({
    name: document.getElementById('client-name').value,
    phone: document.getElementById('client-phone').value,
  });
  e.target.reset();
  loadFiado();
});

async function deleteClient(id) {
  if (!confirm('Remover este cliente e todas as dividas dele?')) return;
  await sb.from('debts').delete().eq('customer_id', id);
  await sb.from('customers').delete().eq('id', id);
  loadFiado();
}

async function openClient(id, name) {
  selectedClientId = id;
  document.getElementById('modal-client-name').textContent = name;
  document.getElementById('modal-dividas').classList.add('visible');
  document.getElementById('debt-date').value = todayStr();
  loadDividas(id);
}

async function loadDividas(clientId) {
  const { data } = await sb.from('debts').select('*').eq('customer_id', clientId).order('created_at', { ascending: false });
  allDebtsForFilter = data || [];
  populateYearFilter('filter-fiado-ano', allDebtsForFilter, 'created_at');
  renderDividas();
}

function renderDividas() {
  const mesFilter = document.getElementById('filter-fiado-mes')?.value || '';
  const anoFilter = document.getElementById('filter-fiado-ano')?.value || '';

  let debts = allDebtsForFilter.filter(d => {
    const date = d.created_at ? new Date(d.created_at) : null;
    if (!date) return true;
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = String(date.getFullYear());
    const matchMes = !mesFilter || mes === mesFilter;
    const matchAno = !anoFilter || ano === anoFilter;
    return matchMes && matchAno;
  });

  const tbody = document.getElementById('dividas-table');
  const empty = document.getElementById('dividas-empty');

  if (debts.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = debts.map(d => {
    const badge = d.paid ? '<span class="badge badge-pago">Pago</span>' : '<span class="badge badge-pendente">Pendente</span>';
    const actions = d.paid
      ? ''
      : `<button class="btn btn-success btn-sm" onclick="payDebt(${d.id})">Pagar</button>`;
    return `<tr>
      <td>${d.description}</td>
      <td><strong>${formatMoney(d.amount)}</strong></td>
      <td>${formatDate(d.created_at)}</td>
      <td>${badge}</td>
      <td>
        ${actions}
        <button class="btn btn-danger btn-sm" onclick="deleteDebt(${d.id})">Remover</button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('filter-fiado-mes')?.addEventListener('change', renderDividas);
document.getElementById('filter-fiado-ano')?.addEventListener('change', renderDividas);

document.getElementById('form-divida').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dateVal = document.getElementById('debt-date').value;
  await sb.from('debts').insert({
    customer_id: selectedClientId,
    description: document.getElementById('debt-desc').value,
    amount: parseFloat(document.getElementById('debt-amount').value),
    created_at: dateVal ? new Date(dateVal + 'T12:00:00').toISOString() : new Date().toISOString(),
  });
  document.getElementById('debt-desc').value = '';
  document.getElementById('debt-amount').value = '';
  loadDividas(selectedClientId);
  loadFiado();
});

async function payDebt(id) {
  await sb.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', id);
  loadDividas(selectedClientId);
  loadFiado();
}

async function deleteDebt(id) {
  await sb.from('debts').delete().eq('id', id);
  loadDividas(selectedClientId);
  loadFiado();
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-dividas').classList.remove('visible');
});

document.getElementById('modal-dividas').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('visible');
  }
});

// === VASILHAME ===
let allVasilhame = [];

async function loadVasilhame() {
  const { data } = await sb.from('vasilhame').select('*').order('returned').order('created_at', { ascending: false });
  allVasilhame = (data || []).map(v => ({
    ...v,
    status: v.returned ? 'devolvido' : 'emprestado',
  }));

  const emprestados = allVasilhame.filter(v => !v.returned).reduce((s, v) => s + v.quantity, 0);
  const devolvidos = allVasilhame.filter(v => v.returned).reduce((s, v) => s + v.quantity, 0);
  const clientes = new Set(allVasilhame.filter(v => !v.returned).map(v => v.customer_name)).size;

  populateYearFilter('filter-vasilhame-ano', allVasilhame, 'created_at');

  document.getElementById('vasilhame-stats').innerHTML = `
    <div class="stat-card amber"><div class="stat-value">${emprestados}</div><div class="stat-label">Emprestados</div></div>
    <div class="stat-card green"><div class="stat-value">${devolvidos}</div><div class="stat-label">Devolvidos</div></div>
    <div class="stat-card neutral"><div class="stat-value">${clientes}</div><div class="stat-label">Clientes com casco</div></div>
  `;

  renderVasilhame();
}

function renderVasilhame() {
  const search = (document.getElementById('search-vasilhame')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('filter-vasilhame-status')?.value || '';
  const mesFilter = document.getElementById('filter-vasilhame-mes')?.value || '';
  const anoFilter = document.getElementById('filter-vasilhame-ano')?.value || '';

  let filtered = allVasilhame.filter(v => {
    const date = v.created_at ? new Date(v.created_at) : null;
    const mes = date ? String(date.getMonth() + 1).padStart(2, '0') : '';
    const ano = date ? String(date.getFullYear()) : '';
    const matchSearch = v.customer_name.toLowerCase().includes(search);
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchMes = !mesFilter || mes === mesFilter;
    const matchAno = !anoFilter || ano === anoFilter;
    return matchSearch && matchStatus && matchMes && matchAno;
  });

  const tbody = document.getElementById('vasilhame-table');
  const empty = document.getElementById('vasilhame-empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = filtered.map(v => {
    const badgeClass = v.status === 'emprestado' ? 'badge-emprestado' : 'badge-devolvido';
    const badgeText = v.status === 'emprestado' ? 'Emprestado' : 'Devolvido';
    const actions = v.returned
      ? ''
      : `<button class="btn btn-success btn-sm" onclick="devolverVasilhame(${v.id})">Devolver</button>`;
    return `<tr>
      <td><strong>${v.customer_name}</strong></td>
      <td>${v.brand}</td>
      <td>${v.type}</td>
      <td>${v.quantity}</td>
      <td>${formatDate(v.created_at)}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td>
        ${actions}
        <button class="btn btn-danger btn-sm" onclick="deleteVasilhame(${v.id})">Remover</button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('search-vasilhame')?.addEventListener('input', renderVasilhame);
document.getElementById('filter-vasilhame-status')?.addEventListener('change', renderVasilhame);
document.getElementById('filter-vasilhame-mes')?.addEventListener('change', renderVasilhame);
document.getElementById('filter-vasilhame-ano')?.addEventListener('change', renderVasilhame);

document.getElementById('form-vasilhame').addEventListener('submit', async (e) => {
  e.preventDefault();
  const dateVal = document.getElementById('vas-date').value;
  await sb.from('vasilhame').insert({
    customer_name: document.getElementById('vas-name').value,
    customer_phone: document.getElementById('vas-phone').value,
    brand: document.getElementById('vas-brand').value,
    type: document.getElementById('vas-type').value,
    quantity: parseInt(document.getElementById('vas-qty').value),
    created_at: dateVal ? new Date(dateVal + 'T12:00:00').toISOString() : new Date().toISOString(),
  });
  e.target.reset();
  loadVasilhame();
});

async function devolverVasilhame(id) {
  await sb.from('vasilhame').update({ returned: true, returned_at: new Date().toISOString() }).eq('id', id);
  loadVasilhame();
}

async function deleteVasilhame(id) {
  await sb.from('vasilhame').delete().eq('id', id);
  loadVasilhame();
}

// === INIT ===
loadValidade();
