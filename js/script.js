/**
 * Expense Tracker — Pastel Dark Theme
 * Vanilla JS, LocalStorage, Chart.js + chartjs-plugin-datalabels
 */

'use strict';

// ============================================================
// Constants
// ============================================================

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

const PALETTE = [
  '#f28b82', // pastel red
  '#81c995', // pastel green
  '#8ab4f8', // pastel blue
  '#fbbc04', // pastel yellow
  '#ff8bcb', // pastel pink
  '#78d9ec', // pastel cyan
  '#c58af9', // pastel purple
  '#fcad70', // pastel orange
];

const PINNED_COLORS = {
  Food:      '#81c995',
  Transport: '#8ab4f8',
  Fun:       '#fbbc04',
};

// ============================================================
// DOM References
// ============================================================

const formEl              = document.getElementById('form');
const listEl              = document.getElementById('list');
const balanceEl           = document.getElementById('balance');
const sortSelect          = document.getElementById('sort');
const monthFilter         = document.getElementById('monthFilter');
const categorySelect      = document.getElementById('category');
const customCategoryInput = document.getElementById('customCategory');
const categoryTagsEl      = document.getElementById('customCategoryTags');

// ============================================================
// State
// ============================================================

let transactions   = [];
let categoriesList = [];
let colorMap       = {};
let chartInstance  = null;

// ============================================================
// Utilities
// ============================================================

/** Escape user input to prevent XSS when injecting into innerHTML. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Simple deterministic hash for consistent color assignment. */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

/** Return a consistent pastel color for a category name. */
function getColor(category) {
  if (!colorMap[category]) {
    colorMap[category] = PINNED_COLORS[category]
      ?? PALETTE[simpleHash(category) % PALETTE.length];
  }
  return colorMap[category];
}

/** Format a YYYY-MM string into a human-readable month label. */
function formatMonthLabel(value) {
  if (!value) return '';
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ============================================================
// Storage
// ============================================================

function loadStorage() {
  try {
    transactions   = JSON.parse(localStorage.getItem('transactions')) || [];
    categoriesList = JSON.parse(localStorage.getItem('categories'))   || [...DEFAULT_CATEGORIES];
  } catch {
    console.warn('localStorage parse error — resetting to defaults.');
    transactions   = [];
    categoriesList = [...DEFAULT_CATEGORIES];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  } catch {
    alert('Could not save data — storage may be full.');
  }
}

function saveCategories() {
  try {
    localStorage.setItem('categories', JSON.stringify(categoriesList));
  } catch {
    alert('Could not save categories — storage may be full.');
  }
}

// ============================================================
// Category Dropdown
// ============================================================

function addCategoryOption(name) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  // Insert before the last option ("+ Add Custom Category")
  categorySelect.insertBefore(option, categorySelect.lastElementChild);
}

function loadCategories() {
  categoriesList.forEach(cat => {
    const alreadyExists = [...categorySelect.options].some(o => o.value === cat);
    if (!alreadyExists) addCategoryOption(cat);
  });
}

// ============================================================
// Custom Category Tags
// ============================================================

function renderCategoryTags() {
  categoryTagsEl.innerHTML = '';

  const custom = categoriesList.filter(c => !DEFAULT_CATEGORIES.includes(c));
  if (custom.length === 0) return;

  custom.forEach(cat => {
    const color = getColor(cat);
    const tag = document.createElement('li');
    tag.className = 'cat-tag';
    tag.style.borderColor = color;
    tag.innerHTML = `
      <span class="cat-tag-dot" style="background:${color}" aria-hidden="true"></span>
      <span class="cat-tag-name">${escapeHtml(cat)}</span>
      <button
        class="btn-delete-category"
        data-category="${escapeHtml(cat)}"
        title="Delete ${escapeHtml(cat)}"
        aria-label="Delete category ${escapeHtml(cat)}"
      >✕</button>
    `;
    categoryTagsEl.appendChild(tag);
  });
}

function deleteCategory(name) {
  if (DEFAULT_CATEGORIES.includes(name)) return;
  categoriesList = categoriesList.filter(c => c !== name);
  saveCategories();

  const opt = [...categorySelect.options].find(o => o.value === name);
  if (opt) categorySelect.removeChild(opt);
  if (categorySelect.value === name) categorySelect.value = '';

  renderCategoryTags();
}

// Delegated click handler for category tag delete buttons
categoryTagsEl.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete-category');
  if (btn) deleteCategory(btn.dataset.category);
});

// ============================================================
// Overall Total (year-scoped when a month is selected)
// ============================================================

function updateOverallTotal() {
  const overallEl = document.getElementById('overallTotal');
  const year = monthFilter.value ? monthFilter.value.split('-')[0] : null;

  overallEl.hidden = false;

  if (!year) {
    document.getElementById('overallLabel').textContent = 'Yearly Total';
    document.getElementById('overallAmount').textContent = 'Rp 0';
    return;
  }

  const filtered = transactions.filter(t => t.date.startsWith(year));
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  document.getElementById('overallLabel').textContent = `${year} Total`;
  document.getElementById('overallAmount').textContent = `Rp ${total.toLocaleString('id-ID')}`;
}

// ============================================================
// Balance Display
// ============================================================

function setBalance(label, amount) {
  balanceEl.querySelector('.balance-label').textContent = label;
  balanceEl.querySelector('.balance-amount').textContent = amount;
}

// ============================================================
// Form Events
// ============================================================

categorySelect.addEventListener('change', () => {
  const isCustom = categorySelect.value === 'custom';
  customCategoryInput.hidden = !isCustom;
  customCategoryInput.required = isCustom;
  if (isCustom) {
    customCategoryInput.focus();
  } else {
    customCategoryInput.value = '';
  }
});

formEl.addEventListener('submit', e => {
  e.preventDefault();

  const name   = document.getElementById('name').value.trim();
  const amount = document.getElementById('amount').value;
  const date   = document.getElementById('date').value;
  let category = categorySelect.value;

  if (category === 'custom') {
    category = customCategoryInput.value.trim();
  }

  if (!name || !amount || !category || !date) {
    alert('Please fill in all fields.');
    return;
  }

  if (Number(amount) <= 0) {
    alert('Amount must be greater than zero.');
    return;
  }

  const transaction = { id: Date.now(), name, amount: +amount, category, date };
  transactions.push(transaction);

  if (!categoriesList.includes(category)) {
    categoriesList.push(category);
    saveCategories();
    addCategoryOption(category);
    renderCategoryTags();
  }

  saveTransactions();
  render();
  updateOverallTotal();

  formEl.reset();
  categorySelect.value = '';
  customCategoryInput.hidden = true;
  customCategoryInput.required = false;
});

// ============================================================
// Transaction Deletion
// ============================================================

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  render();
  updateOverallTotal();
}

// ============================================================
// Monthly Summary
// ============================================================

function renderSummary(filtered, categoryTotals, grandTotal) {
  const card = document.getElementById('summaryCard');
  if (!card) return;

  if (!monthFilter.value || filtered.length === 0) {
    card.hidden = true;
    return;
  }

  card.hidden = false;

  // Stats
  const count = filtered.length;
  const avg   = count > 0 ? Math.round(grandTotal / count) : 0;
  const topCat = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  document.getElementById('summaryTotal').textContent = `Rp ${grandTotal.toLocaleString('id-ID')}`;
  document.getElementById('summaryCount').textContent = count;
  document.getElementById('summaryTop').textContent   = topCat;
  document.getElementById('summaryAvg').textContent   = `Rp ${avg.toLocaleString('id-ID')}`;

  // Per-category breakdown
  const breakdown = document.getElementById('summaryBreakdown');
  breakdown.innerHTML = '';

  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amount]) => {
      const color = getColor(cat);
      const pct   = ((amount / grandTotal) * 100).toFixed(1);
      const li    = document.createElement('li');
      li.className = 'summary-row';
      li.innerHTML = `
        <span class="summary-dot" style="background:${color}" aria-hidden="true"></span>
        <span class="summary-cat">${escapeHtml(cat)}</span>
        <div class="summary-bar-wrap">
          <div class="summary-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="summary-pct">${pct}%</span>
        <span class="summary-amt">Rp ${amount.toLocaleString('id-ID')}</span>
      `;
      breakdown.appendChild(li);
    });
}

// ============================================================
// Filter & Sort Events
// ============================================================

sortSelect.addEventListener('change', render);
monthFilter.addEventListener('change', () => { render(); updateOverallTotal(); });

// ============================================================
// Render
// ============================================================

function render() {
  listEl.innerHTML = '';

  // No month selected — neutral state
  if (!monthFilter.value) {
    balanceEl.hidden = false;
    setBalance('Monthly Total', 'Rp 0');
    listEl.classList.remove('has-items');
    document.getElementById('summaryCard').hidden = true;
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = '<span class="empty-icon">📅</span>Select a month above to view transactions.';
    listEl.appendChild(empty);
    updateChart({});
    return;
  }

  const monthLabel = formatMonthLabel(monthFilter.value);
  balanceEl.hidden = false;

  // Filter
  const filtered = transactions.filter(t => t.date.startsWith(monthFilter.value));

  // Sort
  const sorted = [...filtered];
  if (sortSelect.value === 'amount-desc') {
    sorted.sort((a, b) => b.amount - a.amount);
  } else if (sortSelect.value === 'amount-asc') {
    sorted.sort((a, b) => a.amount - b.amount);
  } else if (sortSelect.value === 'category') {
    sorted.sort((a, b) => a.category.localeCompare(b.category));
  } else {
    // Default: most recently added on top (highest id = latest timestamp)
    sorted.sort((a, b) => b.id - a.id);
  }

  // Empty month
  if (sorted.length === 0) {
    listEl.classList.remove('has-items');
    document.getElementById('summaryCard').hidden = true;
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <span class="empty-icon">🌵</span>
      No transactions for ${monthLabel}.
    `;
    listEl.appendChild(empty);
    setBalance(`Total — ${monthLabel}`, 'Rp 0');
    updateChart({});
    return;
  }

  // Pre-calculate total for percentage
  const grandTotal = sorted.reduce((sum, t) => sum + t.amount, 0);
  let runningTotal = 0;
  const categoryTotals = {};

  listEl.classList.add('has-items');

  sorted.forEach(t => {
    runningTotal += t.amount;
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;

    const color = getColor(t.category);
    const pct   = grandTotal > 0 ? ((t.amount / grandTotal) * 100).toFixed(1) : '0.0';

    const li = document.createElement('li');
    li.style.borderLeftColor = color;
    li.innerHTML = `
      <div class="item-info">
        <span class="item-name">${escapeHtml(t.name)}</span>
        <span class="item-meta">
          <span class="item-amount">Rp ${t.amount.toLocaleString('id-ID')}</span>
          <span class="item-pct">${pct}%</span>
          <span class="badge" style="background:${color}">${escapeHtml(t.category)}</span>
        </span>
        <span class="item-date">📅 ${t.date}</span>
      </div>
      <button
        class="btn-delete-transaction"
        data-id="${t.id}"
        title="Delete transaction"
        aria-label="Delete ${escapeHtml(t.name)}"
      >✕</button>
    `;
    listEl.appendChild(li);
  });

  setBalance(`Total — ${monthLabel}`, `Rp ${runningTotal.toLocaleString('id-ID')}`);
  renderSummary(filtered, categoryTotals, grandTotal);
  updateChart(categoryTotals);
}

// Delegated click handler for transaction delete buttons
listEl.addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete-transaction');
  if (btn) deleteTransaction(Number(btn.dataset.id));
});

// ============================================================
// Chart
// ============================================================

function updateChart(data) {
  // Update chart section heading
  const chartHeading = document.getElementById('chart-heading');
  if (chartHeading) {
    chartHeading.textContent = monthFilter.value
      ? `Spending by Category — ${formatMonthLabel(monthFilter.value)}`
      : 'Spending by Category';
  }

  const ctx = document.getElementById('chart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = Object.keys(data);
  if (labels.length === 0) return;

  const values     = Object.values(data);
  const grandTotal = values.reduce((s, v) => s + v, 0);
  const colors     = labels.map(getColor);

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    plugins: [ChartDataLabels],
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#27273a',
        borderWidth: 3,
        hoverOffset: 18,
        offset: 6,
      }],
    },
    options: {
      cutout: '58%',
      plugins: {
        datalabels: {
          color: '#1e1e2e',
          font: { size: 11, weight: 'bold', family: "'Nunito', system-ui, sans-serif" },
          formatter: value => `${((value / grandTotal) * 100).toFixed(1)}%`,
          display: ctx => (ctx.dataset.data[ctx.dataIndex] / grandTotal) >= 0.05,
        },
        legend: {
          position: 'bottom',
          labels: {
            color: '#a9a9c8',
            font: { size: 12, family: "'Nunito', system-ui, sans-serif", weight: '700' },
            padding: 18,
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: '#32324a',
          titleColor: '#e8e8f0',
          bodyColor: '#a9a9c8',
          borderColor: '#3a3a54',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: ctx => {
              const pct = ((ctx.parsed / grandTotal) * 100).toFixed(1);
              return `  Rp ${ctx.parsed.toLocaleString('id-ID')}  (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// ============================================================
// Init
// ============================================================

loadStorage();
loadCategories();
renderCategoryTags();
updateOverallTotal();
render();
