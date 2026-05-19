// === SUPABASE CLIENT ===
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === MASCARA DE TELEFONE ===
function maskPhone(value) {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 6) return `(${nums.slice(0,2)})${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0,2)})${nums.slice(2,6)}-${nums.slice(6)}`;
  return `(${nums.slice(0,2)})${nums.slice(2,7)}-${nums.slice(7)}`;
}

function applyPhoneMask(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const pos = input.selectionStart;
    const old = input.value.length;
    input.value = maskPhone(input.value);
    const diff = input.value.length - old;
    input.setSelectionRange(pos + diff, pos + diff);
  });
}

applyPhoneMask('client-phone');
applyPhoneMask('vas-phone');

// === CACHE DE RENDER (pra F5 nao parecer vazio) ===
const RENDER_CACHE_KEYS = {
  validade: 'validade-stats',
  fiado: 'fiado-stats',
  vasilhame: 'vasilhame-stats',
};

function cacheRender(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  try { localStorage.setItem('render_' + elementId, el.innerHTML); } catch {}
}

function restoreRender(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  try {
    const html = localStorage.getItem('render_' + elementId);
    if (html) el.innerHTML = html;
  } catch {}
}

function restoreCachedRenders(page) {
  const id = RENDER_CACHE_KEYS[page];
  if (id) restoreRender(id);
}

// === TEMA ===
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
document.getElementById('theme-toggle-mobile')?.addEventListener('click', toggleTheme);

// === REFRESH HELPER ===
async function refresh(button, loadFn) {
  if (!button || !loadFn) return;
  button.classList.add('spinning');
  try {
    await loadFn();
  } finally {
    setTimeout(() => button.classList.remove('spinning'), 600);
  }
}

// === MODAL DE CONFIRMACAO ===
function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const iconEl = document.getElementById('confirm-icon');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    titleEl.textContent = options.title || 'Confirmar ação?';
    messageEl.textContent = message;
    okBtn.textContent = options.okLabel || 'Confirmar';
    cancelBtn.textContent = options.cancelLabel || 'Cancelar';

    iconEl.classList.toggle('danger', options.danger === true);
    okBtn.classList.toggle('btn-danger', options.danger === true);
    okBtn.classList.toggle('btn-primary', options.danger !== true);

    overlay.classList.add('visible');

    const cleanup = (result) => {
      overlay.classList.remove('visible');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onOverlay = (e) => { if (e.target === overlay) cleanup(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter') cleanup(true);
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
  });
}

// === NAVEGACAO ===
function switchPage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const btn = document.querySelector(`.nav-item[data-page="${page}"]`);
  const target = document.getElementById('page-' + page);
  if (btn) btn.classList.add('active');
  if (target) target.classList.add('active');

  localStorage.setItem('currentPage', page);
  restoreCachedRenders(page);

  if (page === 'validade') loadValidade();
  if (page === 'precificacao') loadPrecos();
  if (page === 'fiado') loadFiado();
  if (page === 'vasilhame') loadVasilhame();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const page = item.getAttribute('data-page');
    if (page) switchPage(page);
  });
});

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const str = String(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(str);
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
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
  cacheRender('validade-stats');

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
      <td class="actions-cell"><div class="row-actions"><button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Remover</button></div></td>
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
  if (!await confirmAction('Remover este produto?', { danger: true, okLabel: 'Remover' })) return;
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
      <td class="actions-cell"><div class="row-actions"><button class="btn btn-danger btn-sm" onclick="deletePreco(${p.id})">Remover</button></div></td>
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
  if (!await confirmAction('Remover este preço?', { danger: true, okLabel: 'Remover' })) return;
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
  cacheRender('fiado-stats');

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
      <div class="client-phone">${c.phone ? maskPhone(c.phone) : 'Sem telefone'}</div>
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
  if (!await confirmAction('Remover este cliente e todas as anotações dele?', { danger: true, okLabel: 'Remover' })) return;
  await sb.from('debts').delete().eq('customer_id', id);
  await sb.from('customers').delete().eq('id', id);
  loadFiado();
}

async function openClient(id, name) {
  selectedClientId = id;
  document.getElementById('modal-client-name').textContent = name;
  document.getElementById('dividas-table').innerHTML = '';
  document.getElementById('dividas-empty').style.display = 'none';
  const bulkBar = document.getElementById('bulk-actions');
  if (bulkBar) bulkBar.style.display = 'none';
  const checkAll = document.getElementById('check-all-debts');
  if (checkAll) checkAll.checked = false;
  ['filter-fiado-mes', 'filter-fiado-ano', 'filter-fiado-de', 'filter-fiado-ate'].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.value = '';
  });
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

function getDebtFilterState() {
  return {
    mes: document.getElementById('filter-fiado-mes')?.value || '',
    ano: document.getElementById('filter-fiado-ano')?.value || '',
    de: document.getElementById('filter-fiado-de')?.value || '',
    ate: document.getElementById('filter-fiado-ate')?.value || '',
  };
}

function applyDebtFilters(debts) {
  const f = getDebtFilterState();
  const deTs = f.de ? new Date(f.de + 'T00:00:00').getTime() : null;
  const ateTs = f.ate ? new Date(f.ate + 'T23:59:59').getTime() : null;
  return debts.filter(d => {
    const date = d.created_at ? new Date(d.created_at) : null;
    if (!date) return true;
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = String(date.getFullYear());
    if (f.mes && mes !== f.mes) return false;
    if (f.ano && ano !== f.ano) return false;
    if (deTs !== null && date.getTime() < deTs) return false;
    if (ateTs !== null && date.getTime() > ateTs) return false;
    return true;
  });
}

function renderDividas() {
  let debts = applyDebtFilters(allDebtsForFilter);

  const tbody = document.getElementById('dividas-table');
  const empty = document.getElementById('dividas-empty');

  if (debts.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  const pendentes = debts.filter(d => !d.paid);
  const bulkBar = document.getElementById('bulk-actions');
  if (bulkBar) {
    bulkBar.style.display = pendentes.length > 0 ? 'flex' : 'none';
  }
  const checkAll = document.getElementById('check-all-debts');
  if (checkAll) checkAll.checked = false;

  tbody.innerHTML = debts.map(d => {
    const badge = d.paid ? '<span class="badge badge-pago">Pago</span>' : '<span class="badge badge-pendente">Pendente</span>';
    const checkbox = !d.paid ? `<input type="checkbox" class="debt-check" data-id="${d.id}" onchange="updateBulkCount()">` : '';
    const actions = d.paid
      ? ''
      : `<button class="btn btn-success btn-sm" onclick="payDebt(${d.id})">Pago</button>`;
    return `<tr>
      <td>${checkbox} ${d.description}</td>
      <td><strong>${formatMoney(d.amount)}</strong></td>
      <td>${formatDate(d.created_at)}</td>
      <td>${badge}</td>
      <td class="actions-cell">
        <div class="row-actions">
          ${actions}
          <button class="btn btn-danger btn-sm" onclick="deleteDebt(${d.id})">Remover</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  updateBulkCount();
}

function getSelectedDebtIds() {
  return [...document.querySelectorAll('.debt-check:checked')].map(cb => Number(cb.dataset.id));
}

function getSelectedDebtTotal() {
  const ids = new Set(getSelectedDebtIds());
  return allDebtsForFilter
    .filter(d => ids.has(d.id))
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
}

function getPendingFilteredTotal() {
  return applyDebtFilters(allDebtsForFilter.filter(d => !d.paid))
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
}

function selectAllPending() {
  document.querySelectorAll('.debt-check').forEach(cb => cb.checked = true);
  const checkAll = document.getElementById('check-all-debts');
  if (checkAll) checkAll.checked = true;
  updateBulkCount();
}

function clearDebtFilters() {
  const ids = ['filter-fiado-mes', 'filter-fiado-ano', 'filter-fiado-de', 'filter-fiado-ate'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderDividas();
}

function updateBulkCount() {
  const count = getSelectedDebtIds().length;
  const total = getSelectedDebtTotal();
  const pending = getPendingFilteredTotal();
  const remaining = pending - total;

  const label = document.getElementById('bulk-count');
  const totalEl = document.getElementById('bulk-total');
  const remainEl = document.getElementById('bulk-remaining');

  if (label) label.textContent = count > 0 ? `${count} selecionado${count > 1 ? 's' : ''}` : '';
  if (totalEl) totalEl.textContent = count > 0 ? formatMoney(total) : '';
  if (remainEl) {
    remainEl.textContent = count > 0 ? `Saldo após ação: ${formatMoney(remaining)}` : '';
  }
}

function toggleAllDebts() {
  const checkAll = document.getElementById('check-all-debts');
  const boxes = document.querySelectorAll('.debt-check');
  boxes.forEach(cb => cb.checked = checkAll.checked);
  updateBulkCount();
}

async function bulkPayDebts() {
  const ids = getSelectedDebtIds();
  if (ids.length === 0) return;
  const total = getSelectedDebtTotal();
  const plural = ids.length > 1 ? 's' : '';
  if (!await confirmAction(`Marcar ${ids.length} registro${plural} como pago, no total de ${formatMoney(total)}?`, { okLabel: 'Marcar como pago' })) return;
  for (const id of ids) {
    await sb.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', id);
  }
  loadDividas(selectedClientId);
  loadFiado();
}

async function bulkDeleteDebts() {
  const ids = getSelectedDebtIds();
  if (ids.length === 0) return;
  const total = getSelectedDebtTotal();
  const plural = ids.length > 1 ? 's' : '';
  if (!await confirmAction(`Remover ${ids.length} registro${plural} (${formatMoney(total)})?`, { danger: true, okLabel: 'Remover' })) return;
  for (const id of ids) {
    await sb.from('debts').delete().eq('id', id);
  }
  loadDividas(selectedClientId);
  loadFiado();
}

document.getElementById('filter-fiado-mes')?.addEventListener('change', renderDividas);
document.getElementById('filter-fiado-ano')?.addEventListener('change', renderDividas);
document.getElementById('filter-fiado-de')?.addEventListener('change', renderDividas);
document.getElementById('filter-fiado-ate')?.addEventListener('change', renderDividas);
document.getElementById('clear-debt-filters')?.addEventListener('click', clearDebtFilters);

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
  if (!await confirmAction('Marcar este registro como pago?', { okLabel: 'Marcar como pago' })) return;
  await sb.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', id);
  loadDividas(selectedClientId);
  loadFiado();
}

async function deleteDebt(id) {
  if (!await confirmAction('Remover este registro da caderneta?', { danger: true, okLabel: 'Remover' })) return;
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
    <div class="stat-card green"><div class="stat-value">${devolvidos}</div><div class="stat-label">Entregues</div></div>
    <div class="stat-card neutral"><div class="stat-value">${clientes}</div><div class="stat-label">Clientes com casco</div></div>
  `;
  cacheRender('vasilhame-stats');

  renderVasilhame();
}

function renderVasilhame() {
  const search = (document.getElementById('search-vasilhame')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('filter-vasilhame-status')?.value || '';
  const marcaFilter = document.getElementById('filter-vasilhame-marca')?.value || '';
  const mesFilter = document.getElementById('filter-vasilhame-mes')?.value || '';
  const anoFilter = document.getElementById('filter-vasilhame-ano')?.value || '';

  let filtered = allVasilhame.filter(v => {
    const date = v.created_at ? new Date(v.created_at) : null;
    const mes = date ? String(date.getMonth() + 1).padStart(2, '0') : '';
    const ano = date ? String(date.getFullYear()) : '';
    const matchSearch = v.customer_name.toLowerCase().includes(search);
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchMarca = !marcaFilter || (v.brand || '').includes(marcaFilter);
    const matchMes = !mesFilter || mes === mesFilter;
    const matchAno = !anoFilter || ano === anoFilter;
    return matchSearch && matchStatus && matchMarca && matchMes && matchAno;
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
    const badgeText = v.status === 'emprestado' ? 'Emprestado' : 'Entregue';
    const actions = v.returned
      ? ''
      : `<button class="btn btn-success btn-sm" onclick="devolverVasilhame(${v.id})">Entregue</button>`;
    const phone = v.customer_phone ? `<div style="font-size:0.75rem;color:var(--text-soft)">${v.customer_phone}</div>` : '';
    return `<tr>
      <td><strong>${v.customer_name}</strong>${phone}</td>
      <td>${v.brand}</td>
      <td>${v.type}</td>
      <td>${v.quantity}</td>
      <td>${formatDate(v.created_at)}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      <td class="actions-cell">
        <div class="row-actions">
          ${actions}
          <button class="btn btn-danger btn-sm" onclick="deleteVasilhame(${v.id})">Remover</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('search-vasilhame')?.addEventListener('input', renderVasilhame);
document.getElementById('filter-vasilhame-status')?.addEventListener('change', renderVasilhame);
document.getElementById('filter-vasilhame-marca')?.addEventListener('change', renderVasilhame);
document.getElementById('filter-vasilhame-mes')?.addEventListener('change', renderVasilhame);
document.getElementById('filter-vasilhame-ano')?.addEventListener('change', renderVasilhame);

// tipo muda automaticamente com base na marca
document.getElementById('vas-brand')?.addEventListener('change', (e) => {
  const brand = e.target.value;
  const typeSelect = document.getElementById('vas-type');
  if (brand === 'Refri 2L') {
    typeSelect.innerHTML = '<option value="Garrafa 2L">Garrafa 2L</option>';
  } else {
    typeSelect.innerHTML = '<option value="Caixa c/ 24">Caixa c/ 24</option><option value="Avulsa">Avulsa</option>';
  }
});

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
  if (!await confirmAction('Confirmar devolução do vasilhame?', { okLabel: 'Confirmar devolução' })) return;
  await sb.from('vasilhame').update({ returned: true, returned_at: new Date().toISOString() }).eq('id', id);
  loadVasilhame();
}

async function deleteVasilhame(id) {
  if (!await confirmAction('Remover este registro do vasilhame?', { danger: true, okLabel: 'Remover' })) return;
  await sb.from('vasilhame').delete().eq('id', id);
  loadVasilhame();
}

// === VASILHAME: AUTO TIPO ===
const vasBrand = document.getElementById('vas-brand');
const vasType = document.getElementById('vas-type');
if (vasBrand && vasType) {
  vasBrand.addEventListener('change', () => {
    if (vasBrand.value === 'Refri 1L' || vasBrand.value === 'Refri 2L') {
      vasType.innerHTML = '<option value="Garrafa" selected>Garrafa</option>';
      vasType.disabled = true;
    } else {
      vasType.innerHTML = '<option value="Caixa c/ 24">Caixa c/ 24</option><option value="Avulsa">Avulsa</option>';
      vasType.disabled = false;
    }
  });
}

// === INIT ===
const savedPage = localStorage.getItem('currentPage') || 'fiado';
switchPage(savedPage);
