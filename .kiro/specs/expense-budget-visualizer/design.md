# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page web application built with vanilla HTML, CSS, and JavaScript. It allows users to record personal expense transactions, organize them by category, filter and sort them, and visualize spending patterns through a Chart.js pie chart. All data is persisted in the browser's `localStorage` with no backend or build tooling required.

The design evolves the existing codebase — which already has a working form, list, filter, sort, and pie chart — into a more complete, well-structured, and visually polished application. The primary goals are:

1. **Correctness**: Reliable transaction and category management with proper validation and persistence.
2. **Visualization**: A responsive, color-coded pie chart that stays in sync with the filtered transaction set.
3. **Visual Design**: A cohesive, colorful-but-calm theme using soft, medium-saturation colors with category-based visual differentiation.
4. **Accessibility & Compatibility**: Works in all modern browsers without installation.

### Key Design Decisions

- **No framework**: The app uses plain DOM manipulation and event listeners. This keeps the dependency surface minimal and the app portable.
- **Single render function**: All UI state (list, balance, chart) is derived from a single `render()` call, making state management predictable.
- **Category color map**: A deterministic color assignment strategy maps each category name to a consistent color across the list items, chart segments, and badges.
- **Modular JS structure**: Logic is split into clearly scoped functions (storage, rendering, chart, validation) within a single `script.js` file to match the existing project structure.

---

## Architecture

The app follows a simple **data → render** flow with no reactive framework. All state lives in two in-memory arrays (`transactions`, `categoriesList`) that are kept in sync with `localStorage`.

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────┐    events    ┌──────────────────────────┐ │
│  │  index   │ ──────────► │      js/script.js        │ │
│  │  .html   │             │                          │ │
│  │          │ ◄────────── │  ┌────────────────────┐  │ │
│  │  (DOM)   │   DOM ops   │  │  State             │  │ │
│  └──────────┘             │  │  - transactions[]  │  │ │
│                           │  │  - categoriesList[]│  │ │
│  ┌──────────┐             │  │  - colorMap{}      │  │ │
│  │ css/     │             │  └────────────────────┘  │ │
│  │ style.css│             │                          │ │
│  └──────────┘             │  ┌────────────────────┐  │ │
│                           │  │  Functions         │  │ │
│  ┌──────────┐             │  │  - render()        │  │ │
│  │Chart.js  │ ◄────────── │  │  - updateChart()   │  │ │
│  │  (CDN)   │             │  │  - saveStorage()   │  │ │
│  └──────────┘             │  │  - loadStorage()   │  │ │
│                           │  │  - validateForm()  │  │ │
│  ┌──────────┐             │  │  - getColor()      │  │ │
│  │localStorage│◄────────► │  └────────────────────┘  │ │
│  └──────────┘             └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initialization**: `loadStorage()` reads `transactions` and `categoriesList` from `localStorage`, populates the category `<select>`, then calls `render()`.
2. **User action** (add/delete/filter/sort): The relevant handler updates in-memory state, writes to `localStorage`, then calls `render()`.
3. **Render**: `render()` filters and sorts `transactions`, updates the DOM list, recalculates the total, and calls `updateChart()`.
4. **Chart update**: `updateChart()` destroys the previous Chart.js instance and creates a new one with the current category totals and color map.

---

## Components and Interfaces

### HTML Structure (`index.html`)

The page is organized into a single `.container` div with these sections:

| Section | Element | Purpose |
|---|---|---|
| Header | `<h1>` | App title |
| Balance | `<h2 #balance>` | Total spending display |
| Form | `<form #form>` | Transaction entry |
| Controls | `<div .controls>` | Sort + filter row |
| List | `<ul #list>` | Transaction list |
| Chart | `<canvas #chart>` | Pie chart |

**Form fields:**
- `#name` — text input, item name
- `#amount` — number input, amount in Rupiah
- `#category` — select, includes default options + "Add Custom"
- `#customCategory` — text input, hidden unless "Add Custom" is selected
- `#date` — date input

**Controls:**
- `#sort` — select: `""` (default), `"amount"`, `"category"`
- `#monthFilter` — month input

### JavaScript Functions (`js/script.js`)

#### State

```javascript
let transactions = [];       // Array<Transaction>
let categoriesList = [];     // Array<string>
let colorMap = {};           // { [category: string]: string }
let chart = null;            // Chart.js instance | null
```

#### Core Functions

| Function | Signature | Description |
|---|---|---|
| `loadStorage()` | `() → void` | Reads transactions and categories from localStorage, populates category select |
| `saveTransactions()` | `() → void` | Writes `transactions` array to localStorage |
| `saveCategories()` | `() → void` | Writes `categoriesList` array to localStorage |
| `render()` | `() → void` | Applies filter + sort, updates list DOM, balance, and chart |
| `updateChart(data)` | `(categoryTotals: Object) → void` | Destroys old chart, creates new Chart.js pie chart |
| `deleteTransaction(id)` | `(id: number) → void` | Removes transaction by id, saves, re-renders |
| `addCategory(name)` | `(name: string) → void` | Adds category to list and select if not already present, saves |
| `getColor(category)` | `(category: string) → string` | Returns a consistent hex color for a category name |
| `validateForm(fields)` | `(fields: Object) → boolean` | Returns true if all required fields are non-empty |
| `formatAmount(n)` | `(n: number) → string` | Returns `"Rp {n}"` formatted string |

#### Event Listeners

| Event | Element | Handler |
|---|---|---|
| `submit` | `#form` | Add transaction |
| `change` | `#category` | Toggle custom category input |
| `change` | `#sort` | Re-render |
| `change` | `#monthFilter` | Re-render |
| `click` | delete buttons (delegated) | Delete transaction |

### CSS Structure (`css/style.css`)

The stylesheet is organized into these layers:

1. **Reset / base** — body font, background gradient
2. **Layout** — `.container` centered card, max-width 480px (expanded from 400px for better chart display)
3. **Form** — flex column, gap, input/select/button sizing
4. **Controls** — flex row, sort + filter
5. **Transaction list** — scrollable `#list`, list items with category-colored left border
6. **Category badges** — `.badge` inline pill with category color background
7. **Balance display** — prominent total styling
8. **Chart** — canvas sizing, margin
9. **Color palette** — CSS custom properties for the soft color scheme
10. **Responsive** — media query for narrow viewports

---

## Data Models

### Transaction

```javascript
{
  id: number,        // Date.now() at creation time — unique identifier
  name: string,      // Item name, non-empty
  amount: number,    // Positive number, in Rupiah
  category: string,  // Category name, non-empty
  date: string       // ISO date string "YYYY-MM-DD"
}
```

**localStorage key**: `"transactions"` — stored as JSON array.

### Category List

```javascript
string[]  // e.g. ["Food", "Transport", "Fun", "Bills"]
```

**localStorage key**: `"categories"` — stored as JSON array.  
**Default value** (when key absent): `["Food", "Transport", "Fun"]`

### Color Map

The color map is not persisted; it is derived at runtime from a fixed palette. Categories are assigned colors deterministically by hashing the category name against the palette array, so the same category always gets the same color across sessions.

```javascript
// Palette — soft, medium-saturation colors (no neon/fluorescent)
const PALETTE = [
  "#7EB8D4",  // muted blue
  "#82C9A0",  // muted green
  "#B39DDB",  // muted purple
  "#F4A96A",  // muted orange
  "#F08080",  // muted coral/red
  "#80CBC4",  // muted teal
  "#FFD180",  // muted amber
  "#CE93D8",  // muted lavender
];
```

Color assignment:

```javascript
function getColor(category) {
  if (!colorMap[category]) {
    const index = simpleHash(category) % PALETTE.length;
    colorMap[category] = PALETTE[index];
  }
  return colorMap[category];
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}
```

This ensures:
- The same category always maps to the same color (deterministic).
- The chart segments and list item borders use identical colors.
- New custom categories automatically receive a color from the palette.

### Filtered / Sorted View (derived, not stored)

```javascript
// Derived in render()
let filtered = transactions.filter(t =>
  !monthFilter.value || t.date.startsWith(monthFilter.value)
);

let sorted = [...filtered];
if (sort === 'amount') sorted.sort((a, b) => b.amount - a.amount);
if (sort === 'category') sorted.sort((a, b) => a.category.localeCompare(b.category));
// default: insertion order (no sort)
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction persistence round-trip

*For any* valid transaction (non-empty name, positive amount, non-empty category, valid date), after it is added to the transaction list and the list is saved to localStorage, deserializing the localStorage value should produce a transaction list that contains a transaction with the same name, amount, category, and date.

**Validates: Requirements 1.2, 1.5, 8.1, 8.3**

---

### Property 2: Empty/whitespace inputs are rejected

*For any* form submission where at least one required field (name, amount, category, date) is empty or composed entirely of whitespace, the transaction list should remain unchanged and no new transaction should be added.

**Validates: Requirements 1.3**

---

### Property 3: Balance equals sum of filtered amounts

*For any* transaction list and any month filter value (including no filter), the balance displayed should equal the arithmetic sum of the `amount` fields of all transactions that pass the filter.

**Validates: Requirements 4.2, 5.4**

---

### Property 4: Category color consistency

*For any* category name, calling `getColor(category)` multiple times should always return the same color value, regardless of the order in which other categories were assigned colors.

**Validates: Requirements 10.4, 10.5**

---

### Property 5: Category persistence round-trip

*For any* list of category names, after saving to localStorage and reloading, the deserialized category list should contain exactly the same categories in the same order.

**Validates: Requirements 2.4, 2.5, 8.2, 8.4**

---

### Property 6: Sort by amount is descending

*For any* non-empty filtered transaction list sorted by amount, every adjacent pair of transactions (at index i and i+1) should satisfy `transactions[i].amount >= transactions[i+1].amount`.

**Validates: Requirements 6.2**

---

### Property 7: Sort by category is alphabetically ascending

*For any* non-empty filtered transaction list sorted by category, every adjacent pair of transactions (at index i and i+1) should satisfy `transactions[i].category.localeCompare(transactions[i+1].category) <= 0`.

**Validates: Requirements 6.3**

---

### Property 8: Chart data matches filtered category totals

*For any* transaction list and filter value, the data passed to the chart should equal the sum of amounts grouped by category for only the transactions that pass the filter — no more, no less.

**Validates: Requirements 7.1, 7.2, 5.4**

---

### Property 9: Deletion removes exactly one transaction

*For any* transaction list containing a transaction with a given id, after deleting that transaction, the resulting list should have exactly one fewer item and should contain no transaction with that id.

**Validates: Requirements 3.2, 3.3**

---

### Property 10: Month filter restricts to correct month

*For any* transaction list and any selected month value (YYYY-MM), all transactions in the filtered result should have a date that starts with that month string, and no transaction outside that month should appear.

**Validates: Requirements 5.2**

---

## Error Handling

### Form Validation

- **Missing fields**: If any of name, amount, category, or date is empty/blank, `validateForm()` returns `false`, an `alert()` is shown, and the form is not submitted. No transaction is created.
- **Custom category empty**: If the user selects "Add Custom" but leaves the custom input blank, it is treated as a missing category field and triggers the same validation error.
- **Non-positive amount**: The `<input type="number">` with `min="0.01"` prevents zero/negative values at the HTML level; JS validation also checks `amount > 0`.

### localStorage Errors

- **Parse failure**: `JSON.parse()` calls are wrapped in try/catch. If localStorage data is corrupt, the app falls back to the default empty state (`[]` for transactions, `["Food", "Transport", "Fun"]` for categories) and logs a console warning.
- **Storage quota exceeded**: If `localStorage.setItem()` throws (e.g., storage full), the error is caught, a user-facing alert is shown ("Could not save data — storage may be full"), and the in-memory state is still updated so the current session continues to work.

### Chart Errors

- **Empty data**: When the filtered transaction set is empty, `updateChart()` is called with an empty object. The chart is destroyed and not re-created (or re-created with empty datasets), resulting in a blank canvas. No error is thrown.
- **Chart.js not loaded**: If the CDN fails to load Chart.js, `updateChart()` checks for the existence of `window.Chart` before attempting to create a chart instance, and logs a console error if it is absent.

---

## Testing Strategy

### Overview

This app is vanilla JavaScript with no test runner configured. The testing strategy is designed to be practical for the project's constraints: tests can be run directly in the browser console or with a lightweight test harness (e.g., a `test.html` file that imports `script.js` and a minimal assertion library like [uvu](https://github.com/lukeed/uvu) or plain `console.assert`).

### Unit Tests (Example-Based)

Unit tests cover specific behaviors with concrete inputs:

| Test | What it verifies |
|---|---|
| Add transaction with all fields → list grows by 1 | Requirement 1.2 |
| Add transaction with empty name → list unchanged | Requirement 1.3 |
| Delete transaction by id → id no longer in list | Requirement 3.2 |
| Filter by "2024-03" → only March 2024 transactions shown | Requirement 5.2 |
| Sort by amount → first item has highest amount | Requirement 6.2 |
| Sort by category → items in alphabetical order | Requirement 6.3 |
| `formatAmount(1500)` → `"Rp 1500"` | Requirement 4.1 |
| `getColor("Food")` called twice → same result | Requirement 10.4 |
| localStorage corrupt → app initializes with defaults | Requirement 8.5, 8.6 |

### Property-Based Tests

Property-based testing is applicable here because the core logic (filtering, sorting, balance calculation, color assignment, persistence) consists of pure or near-pure functions whose correctness should hold across a wide range of inputs.

**Recommended library**: [fast-check](https://github.com/dubzzz/fast-check) (can be loaded via CDN in a `test.html` file — no build step required).

**Minimum iterations**: 100 per property test.

**Tag format**: `// Feature: expense-budget-visualizer, Property {N}: {property_text}`

#### Property Tests to Implement

Each property from the Correctness Properties section maps to one property-based test:

| Property | Generator inputs | What is asserted |
|---|---|---|
| P1: Transaction persistence round-trip | Random valid transaction objects | `JSON.parse(JSON.stringify(transactions))` contains the added transaction |
| P2: Empty/whitespace inputs rejected | Strings of whitespace, empty strings | `validateForm()` returns false; list length unchanged |
| P3: Balance equals sum of filtered amounts | Random transaction arrays + random month strings | `sum(filtered.map(t => t.amount)) === displayedTotal` |
| P4: Category color consistency | Random category name strings | `getColor(cat) === getColor(cat)` for any cat |
| P5: Category persistence round-trip | Random arrays of category name strings | `JSON.parse(JSON.stringify(cats))` deep-equals original |
| P6: Sort by amount descending | Random transaction arrays | All adjacent pairs satisfy `a[i].amount >= a[i+1].amount` |
| P7: Sort by category ascending | Random transaction arrays | All adjacent pairs satisfy `localeCompare <= 0` |
| P8: Chart data matches filtered totals | Random transactions + filter | Chart data object equals manually computed category totals |
| P9: Deletion removes exactly one | Random transaction list + random id from list | List length decreases by 1; id absent from result |
| P10: Month filter restricts correctly | Random transactions + random YYYY-MM string | All results start with the filter string; no non-matching items |

### Integration / Smoke Tests

- **Browser smoke test**: Open `index.html` in Chrome, Firefox, Edge, and Safari. Verify the page loads, the form submits, a transaction appears, the chart renders, and data persists after page reload.
- **localStorage smoke test**: Add a transaction, reload the page, verify the transaction is still present.
- **Chart.js CDN smoke test**: Verify the chart renders correctly when Chart.js is loaded from the CDN.

### Accessibility Checks

- Verify all form inputs have associated labels or `placeholder` text.
- Verify color contrast ratios meet WCAG AA (4.5:1 for normal text) using a browser DevTools accessibility audit.
- Verify the delete button is keyboard-accessible.
