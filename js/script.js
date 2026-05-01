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
    const tag = document.createElement('span');
    tag.className = 'cat-tag';
    tag.setAttribute('role', 'listitem');
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
}

// ============================================================
// Filter & Sort Events
// ============================================================

sortSelect.addEventListener('change', render);
monthFilter.addEventListener('change', render);

// ============================================================
// Render
// ============================================================

function render() {
  listEl.innerHTML = '';

  // No month selected — neutral state
  if (!monthFilter.value) {
    setBalance('Total', 'Rp 0');
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = '<span class="empty-icon">📅</span>Select a month above to view transactions.';
    listEl.appendChild(empty);
    updateChart({});
    return;
  }

  const monthLabel = formatMonthLabel(monthFilter.value);

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
  }

  // Empty month
  if (sorted.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <span class="empty-icon">
        <svg class="desert-scene" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="200" height="100" fill="#2a2a3e"/>
          <circle cx="20"  cy="10" r="0.8" fill="#e8e8f0" opacity="0.6" class="star s1"/>
          <circle cx="55"  cy="6"  r="0.6" fill="#e8e8f0" opacity="0.5" class="star s2"/>
          <circle cx="90"  cy="12" r="0.9" fill="#e8e8f0" opacity="0.7" class="star s3"/>
          <circle cx="130" cy="5"  r="0.7" fill="#e8e8f0" opacity="0.5" class="star s1"/>
          <circle cx="165" cy="9"  r="0.6" fill="#e8e8f0" opacity="0.6" class="star s2"/>
          <circle cx="185" cy="14" r="0.8" fill="#e8e8f0" opacity="0.4" class="star s3"/>
          <circle cx="40"  cy="18" r="0.5" fill="#e8e8f0" opacity="0.5" class="star s2"/>
          <circle cx="110" cy="20" r="0.7" fill="#e8e8f0" opacity="0.6" class="star s1"/>
          <circle cx="160" cy="18" r="9" fill="#fbbc04" opacity="0.85" class="moon"/>
          <circle cx="164" cy="15" r="7" fill="#2a2a3e"/>
          <g class="cloud c1">
            <ellipse cx="30" cy="28" rx="14" ry="6" fill="#3a3a54" opacity="0.7"/>
            <ellipse cx="22" cy="30" rx="9"  ry="5" fill="#3a3a54" opacity="0.7"/>
            <ellipse cx="40" cy="30" rx="9"  ry="5" fill="#3a3a54" opacity="0.7"/>
          </g>
          <g class="cloud c2">
            <ellipse cx="140" cy="22" rx="18" ry="7" fill="#3a3a54" opacity="0.5"/>
            <ellipse cx="130" cy="25" rx="11" ry="5" fill="#3a3a54" opacity="0.5"/>
            <ellipse cx="152" cy="25" rx="10" ry="5" fill="#3a3a54" opacity="0.5"/>
          </g>
          <ellipse cx="100" cy="95" rx="130" ry="28" fill="#4a3f2f"/>
          <ellipse cx="30"  cy="98" rx="60"  ry="20" fill="#3e3428"/>
          <ellipse cx="175" cy="97" rx="55"  ry="18" fill="#3e3428"/>
          <rect x="38" y="58" width="5" height="22" rx="2" fill="#3d6b4f"/>
          <rect x="28" y="64" width="10" height="4"  rx="2" fill="#3d6b4f"/>
          <rect x="24" y="56" width="5"  height="12" rx="2" fill="#3d6b4f"/>
          <rect x="43" y="68" width="10" height="4"  rx="2" fill="#3d6b4f"/>
          <rect x="48" y="60" width="5"  height="12" rx="2" fill="#3d6b4f"/>
          <rect x="148" y="66" width="4" height="16" rx="2" fill="#3d6b4f"/>
          <rect x="140" y="70" width="8" height="3"  rx="2" fill="#3d6b4f"/>
          <rect x="136" y="64" width="4" height="10" rx="2" fill="#3d6b4f"/>
          <line x1="60"  y1="80" x2="80"  y2="80" stroke="#6e6e9a" stroke-width="0.6" opacity="0.4" class="shimmer sh1"/>
          <line x1="100" y1="78" x2="125" y2="78" stroke="#6e6e9a" stroke-width="0.6" opacity="0.3" class="shimmer sh2"/>
          <line x1="70"  y1="83" x2="95"  y2="83" stroke="#6e6e9a" stroke-width="0.6" opacity="0.35" class="shimmer sh3"/>
        </svg>
      </span>
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
render();
