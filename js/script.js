// =============================================
//  Expense Tracker — Discord Dark Theme
// =============================================

const form           = document.getElementById('form');
const list           = document.getElementById('list');
const balanceEl      = document.getElementById('balance');
const sortSelect     = document.getElementById('sort');
const monthFilter    = document.getElementById('monthFilter');
const categorySelect = document.getElementById('category');
const customCategoryInput = document.getElementById('customCategory');

// --- State ---
let transactions  = [];
let categoriesList = [];
let colorMap      = {};
let chart         = null;

// --- Pastel color palette ---
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

// Pinned colors for default categories
const PINNED_COLORS = {
  'Food':      '#81c995', // pastel green
  'Transport': '#8ab4f8', // pastel blue
  'Fun':       '#fbbc04', // pastel yellow
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function getColor(category) {
  if (!colorMap[category]) {
    // Use pinned color if available, otherwise derive from palette
    colorMap[category] = PINNED_COLORS[category]
      ?? PALETTE[simpleHash(category) % PALETTE.length];
  }
  return colorMap[category];
}

// --- Storage ---
function loadStorage() {
  try {
    transactions   = JSON.parse(localStorage.getItem('transactions'))  || [];
    categoriesList = JSON.parse(localStorage.getItem('categories'))    || ['Food', 'Transport', 'Fun'];
  } catch (e) {
    console.warn('localStorage parse error, resetting to defaults.', e);
    transactions   = [];
    categoriesList = ['Food', 'Transport', 'Fun'];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  } catch (e) {
    alert('Could not save data — storage may be full.');
  }
}

function saveCategories() {
  try {
    localStorage.setItem('categories', JSON.stringify(categoriesList));
  } catch (e) {
    alert('Could not save categories — storage may be full.');
  }
}

// --- Category helpers ---
function addCategoryOption(name) {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  categorySelect.insertBefore(option, categorySelect.lastElementChild);
}

function loadCategories() {
  categoriesList.forEach(cat => {
    const exists = [...categorySelect.options].some(o => o.value === cat);
    if (!exists) addCategoryOption(cat);
  });
}

// --- Toggle custom category input ---
categorySelect.addEventListener('change', () => {
  if (categorySelect.value === 'custom') {
    customCategoryInput.style.display = 'block';
    customCategoryInput.required = true;
    customCategoryInput.focus();
  } else {
    customCategoryInput.style.display = 'none';
    customCategoryInput.required = false;
    customCategoryInput.value = '';
  }
});

// --- Add transaction ---
form.addEventListener('submit', function (e) {
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

  const transaction = {
    id: Date.now(),
    name,
    amount: +amount,
    category,
    date,
  };

  transactions.push(transaction);

  // Save new category if needed
  if (!categoriesList.includes(category)) {
    categoriesList.push(category);
    saveCategories();
    addCategoryOption(category);
  }

  saveTransactions();
  render();

  // Reset form
  form.reset();
  categorySelect.value = '';
  customCategoryInput.style.display = 'none';
  customCategoryInput.required = false;
});

// --- Delete transaction ---
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  render();
}

// --- Events ---
sortSelect.addEventListener('change', render);
monthFilter.addEventListener('change', render);

// --- Format month value (YYYY-MM) into readable label ---
function formatMonthLabel(value) {
  if (!value) return '';
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// --- Render ---
function render() {
  list.innerHTML = '';

  // If no month selected, show neutral state
  if (!monthFilter.value) {
    balanceEl.innerText = 'Total: Rp 0';
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = '<span class="empty-icon">📅</span>Select a month above to view your transactions.';
    list.appendChild(empty);
    updateChart({});
    return;
  }

  let total = 0;
  const categoryTotals = {};

  // Filter by selected month
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

  // Empty state (month selected but no transactions)
  if (sorted.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = `<span class="empty-icon">🌵</span>No transactions for ${formatMonthLabel(monthFilter.value)}.`;
    list.appendChild(empty);
    balanceEl.innerText = `Total for ${formatMonthLabel(monthFilter.value)}: Rp 0`;
    updateChart({});
    return;
  }

  // Build list items
  sorted.forEach(t => {
    total += t.amount;
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;

    const color = getColor(t.category);

    const li = document.createElement('li');
    li.style.borderLeftColor = color;

    li.innerHTML = `
      <div class="item-info">
        <span class="item-name">${escapeHtml(t.name)}</span>
        <span class="item-meta">
          <span class="item-amount">Rp ${t.amount.toLocaleString('id-ID')}</span>
          <span class="badge" style="background:${color}">${escapeHtml(t.category)}</span>
        </span>
        <span class="item-date">📅 ${t.date}</span>
      </div>
      <button class="delete" onclick="deleteTransaction(${t.id})" title="Delete transaction" aria-label="Delete ${escapeHtml(t.name)}">✕</button>
    `;
    list.appendChild(li);
  });

  const balanceLabel = `Total for ${formatMonthLabel(monthFilter.value)}: Rp ${total.toLocaleString('id-ID')}`;
  balanceEl.innerText = balanceLabel;
  updateChart(categoryTotals);
}

// --- Chart ---
function updateChart(data) {
  // Update chart section label
  const chartLabel = document.querySelector('.chart-section .section-label');
  if (chartLabel) {
    chartLabel.textContent = monthFilter.value
      ? `Spending by Category — ${formatMonthLabel(monthFilter.value)}`
      : 'Spending by Category';
  }

  const ctx = document.getElementById('chart').getContext('2d');

  if (chart) {
    chart.destroy();
    chart = null;
  }

  const labels = Object.keys(data);
  if (labels.length === 0) return;

  const colors = labels.map(label => getColor(label));

  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: Object.values(data),
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
            label: ctx => `  Rp ${ctx.parsed.toLocaleString('id-ID')}`,
          },
        },
      },
    },
  });
}

// --- XSS helper ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Init ---
loadStorage();
loadCategories();
render();
